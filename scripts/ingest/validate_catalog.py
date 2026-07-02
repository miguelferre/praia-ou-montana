#!/usr/bin/env python3
"""Valida public/data/catalog/{playas,rutas}.json.

Barrera de calidad del catálogo (lo escribe build_catalog/fetch_horizon/build_travel
en la ingesta mensual, y a veces se edita a mano). Caza errores gruesos de forma
DURA (coordenadas fuera de Galicia, campos ausentes, ids duplicados) y avisa de
posibles ubicaciones sospechosas (mismo nombre y concello a >1.2 km, el patrón del
bug de Praia do Testal). Sale != 0 solo ante errores duros → aborta el commit en CI.

Uso:
    python scripts/ingest/validate_catalog.py
"""

from __future__ import annotations

import json
import re
import sys
import unicodedata
from collections import defaultdict
from pathlib import Path
from typing import TypeGuard

from common import haversine_m

ROOT = Path(__file__).resolve().parents[2]
CATALOG = ROOT / "public" / "data" / "catalog"

# Bounding box generosa de Galicia: caza coordenadas cambiadas o con error de escala
# (una lat/lon fuera de esto es un error de datos, no una playa gallega).
LAT_MIN, LAT_MAX = 41.7, 44.0
LON_MIN, LON_MAX = -9.5, -6.5

# Umbral para avisar de dos entradas con el mismo nombre y concello: por debajo suele
# ser la propia segmentación de IDE; muy por encima huele a ubicación equivocada.
SAME_NAME_WARN_M = 1200

PLAYA_REQUIRED = ("id", "nombre", "concello", "lat", "lon", "travel")
RUTA_REQUIRED = ("id", "nombre", "concello", "latInicio", "lonInicio", "km", "desnivelPosM")


def _is_number(x: object) -> TypeGuard[float]:
    return isinstance(x, (int, float)) and not isinstance(x, bool)


def _norm_name(s: str) -> str:
    s = unicodedata.normalize("NFKD", s or "").encode("ascii", "ignore").decode().lower()
    s = re.sub(r"\b(praia|playa|de|do|da|dos|das|o|a)\b", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def validate_items(items: object, required: tuple[str, ...], latk: str, lonk: str) -> list[str]:
    """Errores duros de una lista de destinos (lista vacía = válida)."""
    errs: list[str] = []
    if not isinstance(items, list) or not items:
        return ["catálogo vacío o no es una lista"]

    seen_ids: set[str] = set()
    for it in items:
        if not isinstance(it, dict):
            errs.append(f"entrada no-objeto: {it!r}")
            continue
        ident = it.get("id", "?")
        for key in required:
            if key not in it or it[key] in (None, ""):
                errs.append(f"{ident}: falta '{key}'")
        if ident in seen_ids:
            errs.append(f"id duplicado: {ident}")
        seen_ids.add(ident)

        lat, lon = it.get(latk), it.get(lonk)
        if not _is_number(lat) or not _is_number(lon):
            errs.append(f"{ident}: {latk}/{lonk} no numéricos ({lat!r}, {lon!r})")
            continue
        if not (LAT_MIN <= lat <= LAT_MAX and LON_MIN <= lon <= LON_MAX):
            errs.append(f"{ident}: coordenada fuera de Galicia ({lat}, {lon})")
    return errs


def warn_misplaced(items: list[dict], latk: str, lonk: str) -> list[str]:
    """Avisos (no bloquean): mismo nombre+concello separados por más de lo esperable."""
    groups: dict[tuple[str, str], list[dict]] = defaultdict(list)
    for it in items:
        groups[(it.get("concello", "").lower(), _norm_name(it.get("nombre", "")))].append(it)
    warns: list[str] = []
    for (conc, name), group in groups.items():
        if len(group) < 2:
            continue
        far = max(
            haversine_m(a[latk], a[lonk], b[latk], b[lonk])
            for i, a in enumerate(group)
            for b in group[i + 1 :]
        )
        if far > SAME_NAME_WARN_M:
            ids = [g["id"] for g in group]
            warns.append(f"'{name}' en {conc}: {len(group)} entradas a {far:.0f} m — {ids}")
    return warns


def main() -> int:
    errs: list[str] = []
    warns: list[str] = []

    playas_path = CATALOG / "playas.json"
    playas = json.loads(playas_path.read_text(encoding="utf-8"))
    errs += validate_items(playas, PLAYA_REQUIRED, "lat", "lon")
    if isinstance(playas, list):
        warns += warn_misplaced([p for p in playas if isinstance(p, dict)], "lat", "lon")

    rutas_path = CATALOG / "rutas.json"
    if rutas_path.exists():
        rutas = json.loads(rutas_path.read_text(encoding="utf-8"))
        errs += validate_items(rutas, RUTA_REQUIRED, "latInicio", "lonInicio")

    for w in warns:
        print(f"  [aviso] posible ubicación errónea: {w}", file=sys.stderr)

    if errs:
        print(f"CATÁLOGO INVÁLIDO ({len(errs)} problemas):", file=sys.stderr)
        for e in errs[:25]:
            print(f"  - {e}", file=sys.stderr)
        if len(errs) > 25:
            print(f"  … y {len(errs) - 25} más", file=sys.stderr)
        return 1

    n_rutas = len(rutas) if rutas_path.exists() else 0
    print(f"OK: {len(playas)} playas, {n_rutas} rutas válidas ({len(warns)} avisos)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
