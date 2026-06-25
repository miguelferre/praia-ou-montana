#!/usr/bin/env python3
"""Perfil de horizonte por playa (PVGIS) → puesta de sol EFECTIVA (el diferenciador).

Para cada playa del catálogo pide a PVGIS su perfil de horizonte y lo guarda en
`Playa.horizonProfile`. El cliente (`src/lib/core/sun.ts`) lo usa para calcular
cuándo el sol cae tras la montaña, no solo tras el horizonte plano.

PVGIS `printhorizon` devuelve `outputs.horizon_profile`: 49 puntos {A, H_hor}
con azimut A de -180 a 180 (sur=0, oeste positivo, igual que SunCalc). Guardamos
los 48 valores de A=-180..172.5 (descartamos A=180, duplicado del wraparound).
Sin API key. Se cachea: el horizonte no cambia, basta correrlo al curar playas.

Uso:
    python scripts/ingest/fetch_horizon.py [--dry-run]
"""
from __future__ import annotations

import argparse
import json
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PLAYAS = ROOT / "public" / "data" / "catalog" / "playas.json"
PVGIS_URL = "https://re.jrc.ec.europa.eu/api/printhorizon"


def fetch_profile(lat: float, lon: float) -> list[float]:
    q = urllib.parse.urlencode({"lat": lat, "lon": lon, "outputformat": "json"})
    with urllib.request.urlopen(f"{PVGIS_URL}?{q}", timeout=60) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    points = data["outputs"]["horizon_profile"]
    # 48 valores A=-180..172.5; se descarta A==180 (duplicado del wraparound).
    return [round(p["H_hor"], 1) for p in points if p["A"] < 180]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--force", action="store_true", help="refresca también las que ya tienen perfil")
    parser.add_argument("--all", action="store_true", help="todas las playas, no solo las curadas")
    args = parser.parse_args()

    playas = json.loads(PLAYAS.read_text(encoding="utf-8"))
    # Por defecto solo curadas; con --all, todas (la puesta efectiva orográfica para
    # cada playa). Salta las ya cacheadas salvo --force.
    targets = [
        p
        for p in playas
        if (args.all or p.get("curado")) and (args.force or not p.get("horizonProfile"))
    ]
    print(f"{len(targets)} playas curadas a procesar (de {len(playas)} totales)")
    for p in targets:
        try:
            profile = fetch_profile(p["lat"], p["lon"])
        except Exception as err:  # noqa: BLE001 - degradación deliberada
            print(f"  [aviso] {p['id']}: PVGIS falló ({err})")
            continue
        peak = max(profile) if profile else 0
        print(f"  {p['id']}: {len(profile)} pts, horizonte máx {peak}°")
        if not args.dry_run:
            p["horizonProfile"] = profile
        time.sleep(1)  # cortesía con el servicio

    if args.dry_run:
        print("[dry-run] no se escribe nada")
        return
    PLAYAS.write_text(json.dumps(playas, ensure_ascii=False, indent=2), encoding="utf-8")
    print("playas.json actualizado con horizonProfile")


if __name__ == "__main__":
    main()
