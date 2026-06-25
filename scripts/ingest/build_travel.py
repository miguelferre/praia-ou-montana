#!/usr/bin/env python3
"""Precalcula tiempos de viaje en coche base -> destino (OpenRouteService Matrix).

Con la variable de entorno ORS_API_KEY usa la API real (gratuita, 2500/día,
endpoint Matrix: una llamada por base devuelve el tiempo a todos los destinos).
Sin key, cae a una estimación por distancia (haversine * sinuosidad / velocidad
media) suficiente para arrancar; se sustituye en cuanto haya key.

Uso:
    set ORS_API_KEY=...            # opcional (Windows: set, bash: export)
    python scripts/ingest/build_travel.py [--dry-run]
"""
from __future__ import annotations

import argparse
import json
import os
from math import asin, cos, radians, sin, sqrt
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "public" / "data"
ORS_URL = "https://api.openrouteservice.org/v2/matrix/driving-car"


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    dlat, dlon = radians(lat2 - lat1), radians(lon2 - lon1)
    h = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
    return 2 * 6371 * asin(min(1, sqrt(h)))


def rough_minutes(base: dict, lat: float, lon: float) -> int:
    return round(haversine_km(base["lat"], base["lon"], lat, lon) * 1.3 / 65 * 60)


def ors_minutes(base: dict, dests: list[tuple[float, float]], key: str) -> list[int]:
    locations = [[base["lon"], base["lat"]]] + [[lon, lat] for lat, lon in dests]
    body = {
        "locations": locations,
        "sources": [0],
        "destinations": list(range(1, len(locations))),
        "metrics": ["duration"],
    }
    resp = requests.post(ORS_URL, json=body, headers={"Authorization": key}, timeout=40)
    resp.raise_for_status()
    return [round((s or 0) / 60) for s in resp.json()["durations"][0]]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="no escribe, solo informa")
    args = parser.parse_args()

    key = os.environ.get("ORS_API_KEY")
    mode = "OpenRouteService" if key else "estimación haversine (sin ORS_API_KEY)"
    print(f"Tiempos de viaje vía {mode}")

    bases = json.loads((DATA / "meta" / "bases.json").read_text(encoding="utf-8"))
    for kind, latk, lonk in [("playas", "lat", "lon"), ("rutas", "latInicio", "lonInicio")]:
        path = DATA / "catalog" / f"{kind}.json"
        items = json.loads(path.read_text(encoding="utf-8"))
        coords = [(it[latk], it[lonk]) for it in items]
        for base in bases:
            mins = (
                ors_minutes(base, coords, key)
                if key
                else [rough_minutes(base, lat, lon) for lat, lon in coords]
            )
            for it, m in zip(items, mins):
                leg = it.setdefault("travel", {}).setdefault(base["id"], {})
                leg["cocheMin"] = m
        if args.dry_run:
            print(f"  [dry-run] {kind}: {len(items)} destinos x {len(bases)} bases")
        else:
            path.write_text(json.dumps(items, ensure_ascii=False, indent=2), encoding="utf-8")
            print(f"  {kind}.json actualizado ({len(items)} destinos)")


if __name__ == "__main__":
    main()
