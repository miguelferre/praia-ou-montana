#!/usr/bin/env python3
"""Construye el catálogo de playas/rutas.

Enfoque mixto:
  1. (--ide) Descarga las playas de la IDE de Galicia (servicio ArcGIS REST
     de la Xunta, GeoJSON nativo — NO es WFS pese al viejo nombre --wfs) como base:
     id, nombre, concello, coords, bandera azul. Se deduplican por proximidad contra
     las playas ya curadas a mano.
  2. Fusiona la CURACIÓN manual de data/mapping/curado_*.csv (orientación, PMR,
     longitud, enlaces Wikiloc…), marcando curado=true.
  3. Escribe public/data/catalog/{playas,rutas}.json.

Sin --ide usa el catálogo existente como base y solo aplica la curación (idempotente).

Fuente confirmada (ver docs/DATA.md):
  https://ideg.xunta.gal/servizos/rest/services/CubertaTerrestre/Clasificacion_PRAIAS/MapServer/0/query

Uso:
    python scripts/ingest/build_catalog.py [--ide] [--dry-run]
"""

from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path

from common import haversine_m, make_session

ROOT = Path(__file__).resolve().parents[2]
CATALOG = ROOT / "public" / "data" / "catalog"
MAPPING = ROOT / "data" / "mapping"

ARCGIS_URL = (
    "https://ideg.xunta.gal/servizos/rest/services/CubertaTerrestre/"
    "Clasificacion_PRAIAS/MapServer/0/query"
)
DEDUP_METERS = 400  # una playa de la IDE más cerca que esto de una curada se descarta

PMR_COLS = ["pmr_rampa", "pmr_sillaAnfibia", "pmr_aseoAdaptado", "pmr_aparcamiento"]

# Illas Atlánticas (Parque Nacional): sin carretera, se llega en barco. Se marca
# acceso='ferry' por bbox de cada isla (están claramente separadas del continente).
# (lat_min, lat_max, lon_min, lon_max)
ISLAS_FERRY_BBOX = {
    "Cíes": (42.19, 42.25, -8.95, -8.88),
    "Ons": (42.36, 42.42, -8.96, -8.91),
    "Sálvora": (42.45, 42.49, -9.03, -8.98),
    "Cortegada": (42.61, 42.63, -8.79, -8.77),
}

# Columnas de curación que se parsean como número (el resto, como texto).
NUMERIC_FIELDS = (
    "orientacionDeg",
    "longitudM",
    "chiringuitosCount",
    "restauracionM",
    "km",
    "desnivelPosM",
)

SESSION = make_session()


def fetch_ide_galicia_beaches() -> list[dict]:
    """Descarga las playas de la Xunta (ArcGIS REST → GeoJSON). Tolerante a fallos."""
    params = {
        "where": "1=1",
        "outFields": "NOME_PRAIA,CONCELLO,PROVINCIA,COD_PRAIA,B_AZUL,OBJECTID",
        "outSR": 4326,
        "f": "geojson",
        "resultRecordCount": 2000,
    }
    feats: list[dict] = []
    offset = 0
    try:
        while True:
            resp = SESSION.get(ARCGIS_URL, params={**params, "resultOffset": offset}, timeout=60)
            resp.raise_for_status()
            fc = resp.json()
            batch = fc.get("features", [])
            feats.extend(batch)
            if not fc.get("exceededTransferLimit") or not batch:
                break
            offset += len(batch)
    except Exception as err:  # noqa: BLE001 - degradación deliberada
        print(f"  [aviso] IDE Galicia no disponible ({err}); se conserva el catálogo actual.")
        return []

    out = []
    for f in feats:
        coords = (f.get("geometry") or {}).get("coordinates") or []
        if len(coords) < 2:
            continue
        props = f.get("properties", {})
        cod = props.get("COD_PRAIA") or f"praia_{props.get('OBJECTID')}"
        out.append(
            {
                "id": str(cod).lower(),
                "ideGaliciaId": str(cod),
                "nombre": props.get("NOME_PRAIA") or "Praia",
                "concello": props.get("CONCELLO") or "",
                "lat": round(float(coords[1]), 5),
                "lon": round(float(coords[0]), 5),
                "curado": False,
                "banderaAzul": props.get("B_AZUL") == "Si",
                "travel": {},
            }
        )
    print(f"  IDE Galicia: {len(out)} playas descargadas")
    return out


def _num(value: str):
    # Admite coma decimal ("7,5"): antes reventaba con int("7,5") sin contexto.
    value = value.strip().replace(",", ".")
    if value == "":
        return None
    return float(value) if "." in value else int(value)


def apply_curation(items: list[dict], csv_path: Path, is_route: bool) -> int:
    if not csv_path.exists():
        return 0
    by_id = {it["id"]: it for it in items}
    touched = 0
    missing: list[str] = []
    with csv_path.open(encoding="utf-8") as fh:
        for row in csv.DictReader(fh):
            rid = row.get("id", "").strip()
            item = by_id.get(rid)
            if not item:
                # Un id curado que no casa con ninguna playa (typo, o id fundido por el
                # dedup) perdería su curación en silencio: se avisa para no perderla ciega.
                if rid:
                    missing.append(rid)
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
                if key in NUMERIC_FIELDS:
                    item[key] = _num(raw)
                elif key == "banderaAzul":
                    item[key] = raw.strip().lower() == "true"
                else:
                    item[key] = raw.strip()
    if missing:
        print(f"  [aviso] {len(missing)} id(s) de curación sin playa en {csv_path.name}: {missing}")
    return touched


def mark_island_access(playas: list[dict]) -> int:
    """Marca acceso='ferry' en las playas de las Illas Atlánticas (no tienen carretera).
    Idempotente: retira el flag si una playa deja de caer en una isla (dato corregido)."""
    n = 0
    for p in playas:
        on_island = any(
            la0 <= p["lat"] <= la1 and lo0 <= p["lon"] <= lo1
            for (la0, la1, lo0, lo1) in ISLAS_FERRY_BBOX.values()
        )
        if on_island:
            p["acceso"] = "ferry"
            n += 1
        elif p.get("acceso") == "ferry":
            del p["acceso"]
    return n


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--ide",
        "--wfs",
        dest="ide",
        action="store_true",
        help="descarga las playas de la IDE de Galicia (ArcGIS REST; --wfs es alias histórico)",
    )
    parser.add_argument("--dry-run", action="store_true", help="no escribe, solo informa")
    args = parser.parse_args()

    playas_path = CATALOG / "playas.json"
    playas = json.loads(playas_path.read_text(encoding="utf-8"))
    if args.ide:
        descargadas = fetch_ide_galicia_beaches()
        if descargadas:
            ids = {p["id"] for p in playas}
            curadas = [(p["lat"], p["lon"]) for p in playas]
            added = 0
            for d in descargadas:
                if d["id"] in ids:
                    continue
                too_close = any(
                    haversine_m(d["lat"], d["lon"], la, lo) < DEDUP_METERS for la, lo in curadas
                )
                if too_close:
                    continue  # duplica una playa ya curada a mano
                playas.append(d)
                added += 1
            print(f"  Añadidas {added} playas nuevas (dedup por proximidad <{DEDUP_METERS} m)")

    n_p = apply_curation(playas, MAPPING / "curado_playas.csv", is_route=False)
    n_isla = mark_island_access(playas)
    rutas_path = CATALOG / "rutas.json"
    rutas = json.loads(rutas_path.read_text(encoding="utf-8"))
    n_r = apply_curation(rutas, MAPPING / "curado_rutas.csv", is_route=True)

    print(f"Acceso en barco (Illas Atlánticas): {n_isla} playas")
    curadas_n = sum(1 for p in playas if p.get("curado"))
    print(
        f"Curación: {n_p} playas, {n_r} rutas. Total: {len(playas)} playas "
        f"({curadas_n} curadas), {len(rutas)} rutas"
    )
    if args.dry_run:
        print("  [dry-run] no se escribe nada")
        return
    playas_path.write_text(json.dumps(playas, ensure_ascii=False, indent=2), encoding="utf-8")
    rutas_path.write_text(json.dumps(rutas, ensure_ascii=False, indent=2), encoding="utf-8")
    print("  catálogo escrito")


if __name__ == "__main__":
    main()
