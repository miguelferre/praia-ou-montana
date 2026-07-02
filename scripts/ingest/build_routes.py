#!/usr/bin/env python3
"""Ingesta de rutas de senderismo de Galicia (OSM Overpass → catálogo).

Descarga relaciones `route=hiking` locales/regionales (network lwn/rwn; se excluyen
los Caminos de Santiago, que son nwn/iwn y de decenas de km), y para cada una calcula:
  - longitud (tag `distance` si existe, si no por geometría),
  - desnivel positivo (tag `ascent`, si no muestreando la elevación de Open-Meteo),
  - circular vs lineal (`roundtrip` o inicio≈fin),
  - dificultad (heurística km + desnivel; OSM casi nunca trae `sac_scale`),
  - concello (reverse de Nominatim; se descartan las de fuera de Galicia).

Preserva las rutas semilla curadas (con enlace a Wikiloc) y deduplica por proximidad.
Escribe public/data/catalog/rutas.json. Los tiempos de viaje los rellena build_travel.py.

Uso:
    python scripts/ingest/build_routes.py [--dry-run] [--limit N]
"""

from __future__ import annotations

import argparse
import json
import time
from pathlib import Path

from common import haversine_m, make_session

ROOT = Path(__file__).resolve().parents[2]
RUTAS = ROOT / "public" / "data" / "catalog" / "rutas.json"

OVERPASS_URL = "https://overpass-api.de/api/interpreter"
ELEV_URL = "https://api.open-meteo.com/v1/elevation"
NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse"
UA = "praia-ou-montana/0.1 (https://github.com/miguelferre/praia-ou-montana)"

MIN_KM, MAX_KM = 3.0, 25.0  # senderismo de día
CLOSE_M = 300  # inicio/fin más cerca que esto → circular
DEDUP_M = 400  # una ruta OSM más cerca que esto de una existente se descarta
MAX_SAMPLES = 100  # puntos para muestrear elevación por ruta (límite de Open-Meteo)

OVERPASS_QUERY = """
[out:json][timeout:180];
area["name"="Galicia"]["admin_level"="4"]->.g;
relation(area.g)["route"="hiking"]["name"]["network"~"^(lwn|rwn)$"];
out geom;
"""


# --- helpers puros (testeables) -------------------------------------------------


def way_geometries(element: dict) -> list[list[tuple[float, float]]]:
    """Geometrías (lat, lon) de los miembros tipo way de una relación con `out geom`."""
    ways: list[list[tuple[float, float]]] = []
    for m in element.get("members", []):
        if m.get("type") == "way" and m.get("geometry"):
            ways.append([(p["lat"], p["lon"]) for p in m["geometry"]])
    return ways


def length_km(ways: list[list[tuple[float, float]]]) -> float:
    """Longitud sumando la distancia dentro de cada way (no entre ways, para no
    inflar con saltos entre miembros disjuntos)."""
    total = 0.0
    for w in ways:
        for a, b in zip(w, w[1:], strict=False):
            total += haversine_m(a[0], a[1], b[0], b[1])
    return total / 1000.0


def endpoints(
    ways: list[list[tuple[float, float]]],
) -> tuple[tuple[float, float], tuple[float, float]]:
    return ways[0][0], ways[-1][-1]


def parse_distance(tag: str | None) -> float | None:
    if not tag:
        return None
    try:
        return float(str(tag).replace(",", ".").split()[0])
    except (ValueError, IndexError):
        return None


def is_circular(tags: dict, first: tuple[float, float], last: tuple[float, float]) -> bool:
    rt = tags.get("roundtrip")
    if rt == "yes":
        return True
    if rt == "no":
        return False
    return haversine_m(first[0], first[1], last[0], last[1]) < CLOSE_M


def downsample(coords: list[tuple[float, float]], n: int) -> list[tuple[float, float]]:
    """Toma como mucho `n` puntos repartidos uniformemente (conservando extremos)."""
    if len(coords) <= n:
        return coords
    step = (len(coords) - 1) / (n - 1)
    return [coords[round(i * step)] for i in range(n)]


def positive_ascent(elevs: list[float], noise: float = 6.0) -> float:
    """Desnivel positivo acumulado con banda de histéresis: solo cuenta subidas netas
    por encima de `noise` m, para no inflar el total con el ruido del modelo digital
    de elevación (cada micro-oscilación sumaría de más entre puntos muestreados)."""
    if not elevs:
        return 0.0
    total, low = 0.0, elevs[0]
    for e in elevs[1:]:
        if e > low + noise:  # subida real por encima del ruido
            total += e - low
            low = e
        elif e < low:  # nuevo mínimo local
            low = e
    return total


def difficulty(km: float, ascent: float) -> str:
    if ascent >= 700 or km >= 18:
        return "alta"
    if ascent < 300 and km < 10:
        return "baja"
    return "media"


# --- E/S -----------------------------------------------------------------------


def fetch_hiking(session) -> list[dict]:
    resp = session.post(OVERPASS_URL, data={"data": OVERPASS_QUERY}, timeout=200)
    resp.raise_for_status()
    return resp.json()["elements"]


def elevations(session, points: list[tuple[float, float]]) -> list[float]:
    lats = ",".join(f"{p[0]:.5f}" for p in points)
    lons = ",".join(f"{p[1]:.5f}" for p in points)
    resp = session.get(ELEV_URL, params={"latitude": lats, "longitude": lons}, timeout=40)
    resp.raise_for_status()
    return resp.json()["elevation"]


def reverse_concello(session, lat: float, lon: float) -> tuple[str, str] | None:
    """(concello, comunidad) del punto vía Nominatim, o None si falla."""
    try:
        resp = session.get(
            NOMINATIM_URL,
            params={"lat": lat, "lon": lon, "format": "jsonv2", "zoom": 10},
            timeout=30,
        )
        resp.raise_for_status()
        addr = resp.json().get("address", {})
    except Exception:  # noqa: BLE001 - degradación deliberada
        return None
    concello = (
        addr.get("municipality")
        or addr.get("city")
        or addr.get("town")
        or addr.get("village")
        or addr.get("county")
    )
    region = addr.get("state") or ""
    return (concello, region) if concello else None


# --- orquestación --------------------------------------------------------------


def ascent_of(session, tags: dict, coords: list[tuple[float, float]], km: float) -> int:
    """Desnivel positivo: tag `ascent` si existe; si no, muestreo de elevación; y en
    último caso, una estimación grosera por longitud."""
    tag = parse_distance(tags.get("ascent"))
    if tag is not None:
        return round(tag)
    try:
        elevs = elevations(session, downsample(coords, MAX_SAMPLES))
        return round(positive_ascent(elevs))
    except Exception as err:  # noqa: BLE001 - degradación deliberada
        print(f"    [aviso] elevación falló ({err}); estimo por longitud")
        return round(km * 25)


def build(session, limit: int | None) -> list[dict]:
    elements = fetch_hiking(session)
    print(f"Overpass: {len(elements)} relaciones lwn/rwn con nombre")

    routes: list[dict] = []
    seen_starts: list[tuple[float, float]] = []
    for el in elements:
        ways = way_geometries(el)
        if not ways or not ways[0]:
            continue
        km = parse_distance(el.get("tags", {}).get("distance")) or length_km(ways)
        if not (MIN_KM <= km <= MAX_KM):
            continue
        first, last = endpoints(ways)
        if any(haversine_m(first[0], first[1], s[0], s[1]) < DEDUP_M for s in seen_starts):
            continue  # dos variantes de la misma ruta

        loc = reverse_concello(session, first[0], first[1])
        time.sleep(1)  # cortesía con Nominatim (1 req/s)
        if not loc or "galic" not in loc[1].lower():
            continue  # sin concello fiable o fuera de Galicia
        concello, _ = loc

        tags = el.get("tags", {})
        coords = [pt for w in ways for pt in w]
        ascent = ascent_of(session, tags, coords, km)
        rel_id = el["id"]
        routes.append(
            {
                "id": f"osm-{rel_id}",
                "osmRelationId": rel_id,
                "nombre": tags["name"],
                "concello": concello,
                "latInicio": round(first[0], 5),
                "lonInicio": round(first[1], 5),
                "km": round(km),
                "desnivelPosM": ascent,
                "tipo": "circular" if is_circular(tags, first, last) else "lineal",
                "dificultad": difficulty(km, ascent),
                "travel": {},
            }
        )
        seen_starts.append(first)
        print(f"  + {tags['name'][:44]:44} | {round(km):>2} km | {ascent:>4} m | {concello}")
        if limit and len(routes) >= limit:
            print(f"  (límite de {limit} alcanzado)")
            break
    return routes


def merge_with_seeds(new: list[dict]) -> list[dict]:
    """Preserva las rutas existentes (semilla curada) y añade las OSM que no dupliquen
    una ya presente por proximidad de inicio."""
    existing = json.loads(RUTAS.read_text(encoding="utf-8")) if RUTAS.exists() else []
    starts = [(r["latInicio"], r["lonInicio"]) for r in existing]
    ids = {r["id"] for r in existing}
    added = 0
    for r in new:
        if r["id"] in ids:
            continue
        if any(haversine_m(r["latInicio"], r["lonInicio"], la, lo) < DEDUP_M for la, lo in starts):
            continue
        existing.append(r)
        starts.append((r["latInicio"], r["lonInicio"]))
        added += 1
    print(f"Añadidas {added} rutas OSM nuevas (total {len(existing)})")
    return existing


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="no escribe, solo informa")
    parser.add_argument("--limit", type=int, help="procesa como mucho N rutas (prueba rápida)")
    args = parser.parse_args()

    session = make_session()
    session.headers.update({"User-Agent": UA})

    new = build(session, args.limit)
    merged = merge_with_seeds(new)

    if args.dry_run:
        print("[dry-run] no se escribe nada")
        return
    RUTAS.write_text(json.dumps(merged, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"rutas.json escrito ({len(merged)} rutas)")


if __name__ == "__main__":
    main()
