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
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parents[2]
CATALOG = ROOT / "public" / "data" / "catalog"
OUT = ROOT / "public" / "data" / "forecast"

FORECAST_URL = "https://api.open-meteo.com/v1/forecast"
MARINE_URL = "https://marine-api.open-meteo.com/v1/marine"
TZ = "Europe/Madrid"


def _as_list(data: dict | list) -> list:
    """Open-Meteo devuelve un objeto si hay una sola localización y una lista si hay varias."""
    return data if isinstance(data, list) else [data]


def _daytime_mean(values: list[float | None]) -> float:
    """Media de las horas de día (09–20) ignorando nulos."""
    window = [v for i, v in enumerate(values) if 9 <= i <= 20 and v is not None]
    return round(sum(window) / len(window), 1) if window else 0.0


def fetch_forecast(points: list[dict]) -> dict[str, dict]:
    lats = ",".join(str(p["lat"]) for p in points)
    lons = ",".join(str(p["lon"]) for p in points)
    resp = requests.get(
        FORECAST_URL,
        params={
            "latitude": lats,
            "longitude": lons,
            "daily": "temperature_2m_max,precipitation_probability_max,"
            "precipitation_sum,wind_speed_10m_max,uv_index_max",
            "hourly": "cloud_cover",
            "timezone": TZ,
            "forecast_days": 1,
        },
        timeout=40,
    )
    resp.raise_for_status()
    out: dict[str, dict] = {}
    for point, loc in zip(points, _as_list(resp.json())):
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
    lats = ",".join(str(b["lat"]) for b in beaches)
    lons = ",".join(str(b["lon"]) for b in beaches)
    resp = requests.get(
        MARINE_URL,
        params={
            "latitude": lats,
            "longitude": lons,
            "daily": "wave_height_max",
            "hourly": "sea_surface_temperature",
            "timezone": TZ,
            "forecast_days": 1,
        },
        timeout=40,
    )
    resp.raise_for_status()
    out: dict[str, dict] = {}
    for beach, loc in zip(beaches, _as_list(resp.json())):
        sst = loc.get("hourly", {}).get("sea_surface_temperature", [])
        wave = loc.get("daily", {}).get("wave_height_max", [None])
        extra: dict[str, float] = {}
        warm = [v for v in sst if v is not None]
        if warm:
            extra["tempAguaC"] = round(sum(warm) / len(warm), 1)
        if wave and wave[0] is not None:
            extra["oleajeM"] = round(wave[0], 1)
        out[beach["id"]] = extra
    return out


def main() -> None:
    playas = json.loads((CATALOG / "playas.json").read_text(encoding="utf-8"))
    rutas = json.loads((CATALOG / "rutas.json").read_text(encoding="utf-8"))

    beach_points = [{"id": p["id"], "lat": p["lat"], "lon": p["lon"]} for p in playas]
    route_points = [
        {"id": r["id"], "lat": r["latInicio"], "lon": r["lonInicio"]} for r in rutas
    ]

    forecast = fetch_forecast(beach_points + route_points)
    marine = fetch_marine(beach_points)
    for beach_id, extra in marine.items():
        forecast.setdefault(beach_id, {}).update(extra)

    OUT.mkdir(parents=True, exist_ok=True)
    fecha = next(iter(forecast.values()))["fecha"]
    payload = json.dumps(forecast, ensure_ascii=False, indent=2)
    (OUT / "latest.json").write_text(payload, encoding="utf-8")
    (OUT / f"{fecha}.json").write_text(payload, encoding="utf-8")
    print(f"OK: {len(forecast)} destinos para {fecha} -> forecast/latest.json")


if __name__ == "__main__":
    main()
