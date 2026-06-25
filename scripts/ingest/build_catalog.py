#!/usr/bin/env python3
"""Construye el catálogo de playas/rutas.

Enfoque mixto (v0):
  1. (--wfs, opcional) Descarga las ~987 playas de la IDE de Galicia como base
     geográfica (id, nombre, concello, lat, lon, curado=false).
  2. Fusiona la CURACIÓN manual de data/mapping/curado_*.csv (orientación, PMR,
     longitud, bandera azul, enlaces Wikiloc…), marcando curado=true.
  3. Escribe public/data/catalog/{playas,rutas}.json.

Sin --wfs usa el catálogo existente como base y solo aplica la curación, de modo
que es idempotente y no pisa el trabajo hecho a mano.

NOTA: el typename exacto del WFS de la IDE de Galicia debe confirmarse con su
GetCapabilities (ver docs/DATA.md). Por eso la descarga es opt-in y tolerante a
fallos: si no responde, se conserva el catálogo actual.

Uso:
    python scripts/ingest/build_catalog.py [--wfs] [--dry-run]
"""
from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parents[2]
CATALOG = ROOT / "public" / "data" / "catalog"
MAPPING = ROOT / "data" / "mapping"

# WFS de la IDE de Galicia — CONFIRMAR typename con GetCapabilities antes de fiarse.
WFS_URL = "https://ideg.xunta.gal/servizos/services"
WFS_TYPENAME = "playas"  # placeholder: verificar

PMR_COLS = ["pmr_rampa", "pmr_sillaAnfibia", "pmr_aseoAdaptado", "pmr_aparcamiento"]


def fetch_ide_galicia_beaches() -> list[dict]:
    """Descarga las playas de la IDE de Galicia como GeoJSON. Tolerante a fallos."""
    try:
        resp = requests.get(
            WFS_URL,
            params={
                "service": "WFS",
                "version": "2.0.0",
                "request": "GetFeature",
                "typeName": WFS_TYPENAME,
                "outputFormat": "application/json",
                "srsName": "EPSG:4326",
            },
            timeout=60,
        )
        resp.raise_for_status()
        feats = resp.json().get("features", [])
    except Exception as err:  # noqa: BLE001 - degradación deliberada
        print(f"  [aviso] WFS no disponible ({err}); se conserva el catálogo actual.")
        return []
    out = []
    for f in feats:
        props = f.get("properties", {})
        geom = f.get("geometry", {})
        lon, lat = (geom.get("coordinates") or [None, None])[:2]
        if lat is None or lon is None:
            continue
        nombre = props.get("nome") or props.get("nombre") or "Praia"
        slug = str(props.get("id") or nombre).lower().replace(" ", "-")
        out.append(
            {
                "id": slug,
                "ideGaliciaId": slug,
                "nombre": nombre,
                "concello": props.get("concello", ""),
                "lat": round(float(lat), 5),
                "lon": round(float(lon), 5),
                "curado": False,
                "travel": {},
            }
        )
    print(f"  IDE Galicia: {len(out)} playas descargadas")
    return out


def _num(value: str):
    value = value.strip()
    if value == "":
        return None
    return float(value) if "." in value else int(value)


def apply_curation(items: list[dict], csv_path: Path, is_route: bool) -> int:
    if not csv_path.exists():
        return 0
    by_id = {it["id"]: it for it in items}
    touched = 0
    with csv_path.open(encoding="utf-8") as fh:
        for row in csv.DictReader(fh):
            item = by_id.get(row.get("id", "").strip())
            if not item:
                continue
            touched += 1
            if not is_route:
                item["curado"] = True
                pmr = {c[4:]: row.get(c, "").strip().lower() == "true" for c in PMR_COLS}
                if any(pmr.values()):
                    item["pmr"] = pmr
            for key, raw in row.items():
                if key in ("id", *PMR_COLS) or raw is None or raw.strip() == "":
                    continue
                if key in ("orientacionDeg", "longitudM", "chiringuitosCount", "restauracionM", "km", "desnivelPosM"):
                    item[key] = _num(raw)
                elif key == "banderaAzul":
                    item[key] = raw.strip().lower() == "true"
                else:
                    item[key] = raw.strip()
    return touched


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--wfs", action="store_true", help="descarga las 987 de la IDE de Galicia")
    parser.add_argument("--dry-run", action="store_true", help="no escribe, solo informa")
    args = parser.parse_args()

    playas_path = CATALOG / "playas.json"
    playas = json.loads(playas_path.read_text(encoding="utf-8"))
    if args.wfs:
        descargadas = fetch_ide_galicia_beaches()
        if descargadas:
            existentes = {p["id"] for p in playas}
            playas += [p for p in descargadas if p["id"] not in existentes]

    n_p = apply_curation(playas, MAPPING / "curado_playas.csv", is_route=False)
    rutas_path = CATALOG / "rutas.json"
    rutas = json.loads(rutas_path.read_text(encoding="utf-8"))
    n_r = apply_curation(rutas, MAPPING / "curado_rutas.csv", is_route=True)

    print(f"Curación aplicada: {n_p} playas, {n_r} rutas. Total: {len(playas)} playas, {len(rutas)} rutas")
    if args.dry_run:
        print("  [dry-run] no se escribe nada")
        return
    playas_path.write_text(json.dumps(playas, ensure_ascii=False, indent=2), encoding="utf-8")
    rutas_path.write_text(json.dumps(rutas, ensure_ascii=False, indent=2), encoding="utf-8")
    print("  catálogo escrito")


if __name__ == "__main__":
    main()
