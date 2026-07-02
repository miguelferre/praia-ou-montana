#!/usr/bin/env python3
"""Cuenta servicios (bar/restaurante/cafetería) cerca de cada playa (OSM Overpass).

Puebla `Playa.chiringuitosCount`, que alimenta el factor "servicios" del ranking (hoy
neutro para las playas sin curar). Una sola consulta a Overpass trae todos los locales
de Galicia; el conteo por playa se hace en local con un índice de rejilla (evita ~1000
consultas `around`). Respeta la curación: NO toca las playas `curado=true` (su cuenta
es manual). Escribe public/data/catalog/playas.json.

Uso:
    python scripts/ingest/build_services.py [--dry-run] [--radius 350]
"""

from __future__ import annotations

import argparse
import json
from collections import defaultdict
from pathlib import Path

from common import haversine_m, make_session

ROOT = Path(__file__).resolve().parents[2]
PLAYAS = ROOT / "public" / "data" / "catalog" / "playas.json"
OVERPASS_URL = "https://overpass-api.de/api/interpreter"
UA = "praia-ou-montana/0.1 (https://github.com/miguelferre/praia-ou-montana)"

DEFAULT_RADIUS_M = 350  # "cerca de la playa": frente marítimo / primer paseo
CELL = 0.005  # ~370–450 m; una vecindad 3×3 cubre el radio

OVERPASS_QUERY = """
[out:json][timeout:180];
area["name"="Galicia"]["admin_level"="4"]->.g;
nwr(area.g)["amenity"~"^(bar|restaurant|cafe)$"];
out center;
"""


def cell_of(lat: float, lon: float) -> tuple[int, int]:
    return (int(lat / CELL), int(lon / CELL))


def build_index(
    points: list[tuple[float, float]],
) -> dict[tuple[int, int], list[tuple[float, float]]]:
    """Agrupa los locales por celda de rejilla para consultar solo la vecindad."""
    index: dict[tuple[int, int], list[tuple[float, float]]] = defaultdict(list)
    for lat, lon in points:
        index[cell_of(lat, lon)].append((lat, lon))
    return index


def count_near(
    lat: float,
    lon: float,
    index: dict[tuple[int, int], list[tuple[float, float]]],
    radius_m: float,
) -> int:
    """Locales a menos de `radius_m` de (lat, lon), mirando solo las 9 celdas vecinas."""
    ci, cj = cell_of(lat, lon)
    n = 0
    for di in (-1, 0, 1):
        for dj in (-1, 0, 1):
            for plat, plon in index.get((ci + di, cj + dj), ()):
                if haversine_m(lat, lon, plat, plon) <= radius_m:
                    n += 1
    return n


def fetch_amenities(session) -> list[tuple[float, float]]:
    resp = session.post(OVERPASS_URL, data={"data": OVERPASS_QUERY}, timeout=200)
    resp.raise_for_status()
    points: list[tuple[float, float]] = []
    for el in resp.json()["elements"]:
        # Nodos traen lat/lon; ways/relations traen "center" con out center.
        c = el if "lat" in el else el.get("center", {})
        if "lat" in c and "lon" in c:
            points.append((c["lat"], c["lon"]))
    return points


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="no escribe, solo informa")
    parser.add_argument("--radius", type=int, default=DEFAULT_RADIUS_M, help="radio en metros")
    args = parser.parse_args()

    session = make_session()
    session.headers.update({"User-Agent": UA})
    points = fetch_amenities(session)
    print(f"Overpass: {len(points)} locales (bar/restaurante/cafetería) en Galicia")
    index = build_index(points)

    playas = json.loads(PLAYAS.read_text(encoding="utf-8"))
    touched = 0
    for p in playas:
        if p.get("curado"):
            continue  # conserva la cuenta curada a mano
        p["chiringuitosCount"] = count_near(p["lat"], p["lon"], index, args.radius)
        touched += 1
    con = sum(1 for p in playas if p.get("chiringuitosCount"))
    print(f"chiringuitosCount fijado en {touched} playas ({con} con al menos 1 local)")

    if args.dry_run:
        print("[dry-run] no se escribe nada")
        return
    PLAYAS.write_text(json.dumps(playas, ensure_ascii=False, indent=2), encoding="utf-8")
    print("playas.json actualizado")


if __name__ == "__main__":
    main()
