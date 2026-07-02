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
import time
from pathlib import Path

from common import chunks, haversine_km, make_session

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "public" / "data"
ORS_URL = "https://api.openrouteservice.org/v2/matrix/driving-car"
OSRM_URL = "http://router.project-osrm.org/table/v1/driving/"

SESSION = make_session()


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
    resp = SESSION.post(ORS_URL, json=body, headers={"Authorization": key}, timeout=40)
    resp.raise_for_status()
    return [round((s or 0) / 60) for s in resp.json()["durations"][0]]


def osrm_minutes(base: dict, dests: list[tuple[float, float]]) -> list[int]:
    """Tiempos reales por carretera vía OSRM (servidor público, sin key). Trocea en
    grupos para no exceder la longitud de la URL; haversine solo si un tramo falla."""
    out: list[int] = []
    for chunk in chunks(dests, 90):
        coords = [(base["lon"], base["lat"])] + [(lon, lat) for (lat, lon) in chunk]
        coordstr = ";".join(f"{lon:.5f},{lat:.5f}" for (lon, lat) in coords)
        try:
            resp = SESSION.get(
                OSRM_URL + coordstr,
                params={"sources": "0", "annotations": "duration"},
                timeout=60,
            )
            resp.raise_for_status()
            durs = resp.json()["durations"][0][1:]  # quita el origen->origen
            for (lat, lon), d in zip(chunk, durs, strict=False):
                out.append(round(d / 60) if d is not None else rough_minutes(base, lat, lon))
        except Exception as err:  # noqa: BLE001 - degradación deliberada
            print(f"  [aviso] OSRM fallo en un tramo ({err}); haversine para {len(chunk)}")
            out.extend(rough_minutes(base, lat, lon) for (lat, lon) in chunk)
        time.sleep(1)
    return out


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="no escribe, solo informa")
    parser.add_argument(
        "--force", action="store_true", help="recalcula también los tramos ya presentes"
    )
    args = parser.parse_args()

    key = os.environ.get("ORS_API_KEY")
    mode = "OpenRouteService (key)" if key else "OSRM (carretera, sin key)"
    print(f"Tiempos de viaje via {mode}")

    bases = json.loads((DATA / "meta" / "bases.json").read_text(encoding="utf-8"))
    for kind, latk, lonk in [("playas", "lat", "lon"), ("rutas", "latInicio", "lonInicio")]:
        path = DATA / "catalog" / f"{kind}.json"
        items = json.loads(path.read_text(encoding="utf-8"))
        for base in bases:
            # Por defecto solo rellena tramos que falten (preserva los curados a mano).
            pending = [
                it
                for it in items
                if args.force or "cocheMin" not in it.get("travel", {}).get(base["id"], {})
            ]
            if not pending:
                continue
            pcoords = [(it[latk], it[lonk]) for it in pending]
            mins = ors_minutes(base, pcoords, key) if key else osrm_minutes(base, pcoords)
            for it, m in zip(pending, mins, strict=False):
                it.setdefault("travel", {}).setdefault(base["id"], {})["cocheMin"] = m
        if args.dry_run:
            print(f"  [dry-run] {kind}: {len(items)} destinos x {len(bases)} bases")
        else:
            path.write_text(json.dumps(items, ensure_ascii=False, indent=2), encoding="utf-8")
            print(f"  {kind}.json actualizado ({len(items)} destinos)")


if __name__ == "__main__":
    main()
