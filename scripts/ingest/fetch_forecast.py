#!/usr/bin/env python3
"""Ingesta diaria de predicción (Open-Meteo, sin API key).

Lee el catálogo (public/data/catalog/*.json), pide a Open-Meteo la predicción
atmosférica de hoy para todas las playas y rutas y la marina para las playas, y
escribe public/data/forecast/latest.json (+ una copia con fecha).

Es la única fuente meteo del MVP (v0). En v1 se añaden MeteoGalicia y AEMET con
sus keys, manteniendo Open-Meteo como fallback (ver docs/DATA.md).

Uso:
    python scripts/ingest/fetch_forecast.py
"""

from __future__ import annotations

import json
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

from common import chunks, make_session

ROOT = Path(__file__).resolve().parents[2]
CATALOG = ROOT / "public" / "data" / "catalog"
OUT = ROOT / "public" / "data" / "forecast"

FORECAST_URL = "https://api.open-meteo.com/v1/forecast"
MARINE_URL = "https://marine-api.open-meteo.com/v1/marine"
TZ = "Europe/Madrid"
CHUNK = 100  # Open-Meteo admite varias coords por llamada, pero la URL no puede ser infinita

SESSION = make_session()


def _as_list(data: dict | list) -> list:
    """Open-Meteo devuelve un objeto si hay una sola localización y una lista si hay varias."""
    return data if isinstance(data, list) else [data]


def _daytime_mean(values: list[float | None]) -> float:
    """Media de las horas de día (09–20) ignorando nulos."""
    window = [v for i, v in enumerate(values) if 9 <= i <= 20 and v is not None]
    return round(sum(window) / len(window), 1) if window else 0.0


def _parabolic_offset(y0: float, y1: float, y2: float) -> float:
    """Posición (en horas, −0.5..0.5) del vértice de la parábola por 3 puntos
    horarios, para refinar la hora del extremo más allá de la rejilla horaria."""
    denom = y0 - 2 * y1 + y2
    if denom == 0:
        return 0.0
    return max(-0.5, min(0.5, 0.5 * (y0 - y2) / denom))


def extract_tides(times: list[str], levels: list[float | None], offset_s: int) -> list[dict]:
    """Pleamares y bajamares como extremos locales de la curva de nivel del mar
    (`sea_level_height_msl`). Hora refinada por interpolación parabólica; la altura
    se omite (Open-Meteo la da sobre la media del mar, no sobre el cero de las
    tablas náuticas, ver docs/DATA.md). Pierde los extremos pegados a 00/24 h."""
    tz = timezone(timedelta(seconds=offset_s))
    tides: list[dict] = []
    for i in range(1, len(levels) - 1):
        a, b, c = levels[i - 1], levels[i], levels[i + 1]
        if a is None or b is None or c is None:
            continue
        is_high = b > a and b >= c
        is_low = b < a and b <= c
        if not (is_high or is_low):
            continue
        when = datetime.strptime(times[i], "%Y-%m-%dT%H:%M") + timedelta(
            hours=_parabolic_offset(a, b, c)
        )
        tides.append(
            {
                "time": when.replace(tzinfo=tz, second=0, microsecond=0).isoformat(),
                "type": "high" if is_high else "low",
            }
        )
    return tides


def fetch_forecast(points: list[dict]) -> dict[str, dict]:
    out: dict[str, dict] = {}
    for chunk in chunks(points, CHUNK):
        resp = SESSION.get(
            FORECAST_URL,
            params={
                "latitude": ",".join(str(p["lat"]) for p in chunk),
                "longitude": ",".join(str(p["lon"]) for p in chunk),
                "daily": "temperature_2m_max,precipitation_probability_max,"
                "precipitation_sum,wind_speed_10m_max,uv_index_max",
                "hourly": "cloud_cover",
                "timezone": TZ,
                "forecast_days": 1,
            },
            timeout=40,
        )
        resp.raise_for_status()
        locs = _as_list(resp.json())
        if len(locs) != len(chunk):
            print(f"  [aviso] Open-Meteo devolvió {len(locs)}/{len(chunk)} puntos (forecast)")
        for point, loc in zip(chunk, locs, strict=False):
            daily = loc["daily"]
            hourly = loc.get("hourly", {})
            out[point["id"]] = {
                "fecha": daily["time"][0],
                "tempMaxC": round(daily["temperature_2m_max"][0]),
                "precipProb": int(daily["precipitation_probability_max"][0] or 0),
                "precipMm": round(daily["precipitation_sum"][0] or 0, 1),
                "nubosidad": round(_daytime_mean(hourly.get("cloud_cover", []))),
                "vientoKmh": round(daily["wind_speed_10m_max"][0] or 0),
                "uvIndex": round(daily["uv_index_max"][0] or 0),
            }
    return out


def fetch_marine(beaches: list[dict]) -> dict[str, dict]:
    out: dict[str, dict] = {}
    for chunk in chunks(beaches, CHUNK):
        resp = SESSION.get(
            MARINE_URL,
            params={
                "latitude": ",".join(str(b["lat"]) for b in chunk),
                "longitude": ",".join(str(b["lon"]) for b in chunk),
                "daily": "wave_height_max",
                "hourly": "sea_surface_temperature,sea_level_height_msl",
                "timezone": TZ,
                "forecast_days": 1,
            },
            timeout=40,
        )
        resp.raise_for_status()
        locs = _as_list(resp.json())
        if len(locs) != len(chunk):
            print(f"  [aviso] Open-Meteo devolvió {len(locs)}/{len(chunk)} puntos (marine)")
        for beach, loc in zip(chunk, locs, strict=False):
            hourly = loc.get("hourly", {})
            sst = hourly.get("sea_surface_temperature", [])
            wave = loc.get("daily", {}).get("wave_height_max", [None])
            extra: dict = {}
            warm = [v for v in sst if v is not None]
            if warm:
                extra["tempAguaC"] = round(sum(warm) / len(warm), 1)
            if wave and wave[0] is not None:
                extra["oleajeM"] = round(wave[0], 1)
            tides = extract_tides(
                hourly.get("time", []),
                hourly.get("sea_level_height_msl", []),
                loc.get("utc_offset_seconds", 0),
            )
            if tides:
                extra["mareas"] = tides
            out[beach["id"]] = extra
    return out


def main() -> None:
    playas = json.loads((CATALOG / "playas.json").read_text(encoding="utf-8"))
    rutas = json.loads((CATALOG / "rutas.json").read_text(encoding="utf-8"))

    # Una predicción por CONCELLO (las playas vecinas comparten el tiempo): reduce
    # ~992 llamadas a ~100 y evita el rate limit. Representante = primera playa.
    rep_by_concello: dict[str, dict] = {}
    for p in playas:
        rep_by_concello.setdefault(p["concello"], p)
    concello_points = [
        {"id": f"concello:{c}", "lat": p["lat"], "lon": p["lon"]}
        for c, p in rep_by_concello.items()
    ]
    route_points = [{"id": r["id"], "lat": r["latInicio"], "lon": r["lonInicio"]} for r in rutas]

    by_key = fetch_forecast(concello_points + route_points)
    for key, extra in fetch_marine(concello_points).items():
        by_key.setdefault(key, {}).update(extra)

    # Expande la predicción del concello a cada playa (clave = id de playa).
    forecast: dict[str, dict] = {}
    for p in playas:
        cf = by_key.get(f"concello:{p['concello']}")
        if cf:
            forecast[p["id"]] = cf
    for r in rutas:
        if r["id"] in by_key:
            forecast[r["id"]] = by_key[r["id"]]

    if not forecast:
        print("ERROR: no se generó ninguna predicción (fuente vacía)", file=sys.stderr)
        raise SystemExit(1)
    OUT.mkdir(parents=True, exist_ok=True)
    fecha = next(iter(forecast.values()))["fecha"]
    payload = json.dumps(forecast, ensure_ascii=False, indent=2)
    (OUT / "latest.json").write_text(payload, encoding="utf-8")
    (OUT / f"{fecha}.json").write_text(payload, encoding="utf-8")
    print(
        f"OK: {len(rep_by_concello)} concellos -> {len(forecast)} destinos para {fecha} "
        f"-> forecast/latest.json"
    )


if __name__ == "__main__":
    main()
