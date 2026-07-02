#!/usr/bin/env python3
"""Valida public/data/forecast/latest.json antes de commitearlo.

Barrera de calidad en CI: la ingesta diaria (fetch_forecast.py) escribe y commitea
el JSON que sirve la CDN sin que nadie lo mire. Si Open-Meteo devuelve datos
parciales o el script falla a medias, este validador lo detecta y sale con código
!= 0, de modo que el workflow aborta y NO se commitea nada corrupto.

Uso:
    python scripts/ingest/validate_forecast.py [--min-coverage 0.9]
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CATALOG = ROOT / "public" / "data" / "catalog"
FORECAST = ROOT / "public" / "data" / "forecast" / "latest.json"

# Campos numéricos obligatorios de cada predicción (contrato con core/types.ts).
REQUIRED_NUMS = ("tempMaxC", "precipProb", "precipMm", "nubosidad", "vientoKmh", "uvIndex")


def _is_number(x: object) -> bool:
    return isinstance(x, (int, float)) and not isinstance(x, bool)


def validate_entry(dest_id: str, entry: object) -> list[str]:
    """Errores de una entrada de forecast (lista vacía = válida)."""
    errs: list[str] = []
    if not isinstance(entry, dict):
        return [f"{dest_id}: no es un objeto"]
    fecha = entry.get("fecha")
    if not isinstance(fecha, str) or len(fecha) != 10:
        errs.append(f"{dest_id}: 'fecha' ausente o con formato inesperado ({fecha!r})")
    for key in REQUIRED_NUMS:
        if not _is_number(entry.get(key)):
            errs.append(f"{dest_id}: '{key}' ausente o no numérico ({entry.get(key)!r})")
    mareas = entry.get("mareas")
    if mareas is not None:
        if not isinstance(mareas, list):
            errs.append(f"{dest_id}: 'mareas' no es una lista")
        else:
            for m in mareas:
                if not isinstance(m, dict) or m.get("type") not in ("high", "low"):
                    errs.append(f"{dest_id}: marea inválida ({m!r})")
                    break
    return errs


def validate(forecast: dict, expected_ids: set[str], min_coverage: float) -> list[str]:
    """Errores globales del forecast (lista vacía = válido)."""
    errs: list[str] = []
    if not forecast:
        return ["forecast vacío"]

    # Cobertura: casi todos los destinos del catálogo deben tener predicción. Se
    # tolera un pequeño margen porque un concello suelto puede fallar sin ser grave.
    present = set(forecast)
    if expected_ids:
        covered = len(present & expected_ids) / len(expected_ids)
        if covered < min_coverage:
            errs.append(
                f"cobertura {covered:.1%} < {min_coverage:.0%} "
                f"({len(present & expected_ids)}/{len(expected_ids)} destinos del catálogo)"
            )

    # Todas las fechas deben coincidir (una sola jornada).
    fechas = {e.get("fecha") for e in forecast.values() if isinstance(e, dict)}
    if len(fechas) > 1:
        errs.append(f"fechas mezcladas en un mismo forecast: {sorted(map(str, fechas))}")

    for dest_id, entry in forecast.items():
        errs.extend(validate_entry(dest_id, entry))
    return errs


def _expected_ids() -> set[str]:
    ids: set[str] = set()
    for name in ("playas.json", "rutas.json"):
        path = CATALOG / name
        if path.exists():
            for item in json.loads(path.read_text(encoding="utf-8")):
                if isinstance(item, dict) and "id" in item:
                    ids.add(item["id"])
    return ids


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--min-coverage", type=float, default=0.9, help="cobertura mínima 0..1")
    args = parser.parse_args()

    if not FORECAST.exists():
        print(f"ERROR: no existe {FORECAST}", file=sys.stderr)
        return 1
    try:
        forecast = json.loads(FORECAST.read_text(encoding="utf-8"))
    except json.JSONDecodeError as err:
        print(f"ERROR: JSON inválido en {FORECAST.name}: {err}", file=sys.stderr)
        return 1

    errs = validate(forecast, _expected_ids(), args.min_coverage)
    if errs:
        print(f"FORECAST INVÁLIDO ({len(errs)} problemas):", file=sys.stderr)
        for e in errs[:20]:
            print(f"  - {e}", file=sys.stderr)
        if len(errs) > 20:
            print(f"  … y {len(errs) - 20} más", file=sys.stderr)
        return 1

    fecha = next(iter(forecast.values())).get("fecha")
    print(f"OK: {len(forecast)} destinos válidos para {fecha}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
