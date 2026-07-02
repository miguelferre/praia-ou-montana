#!/usr/bin/env python3
"""Fusiona los casi-duplicados del catálogo de playas.

La IDE de Galicia parte muchas playas en 2-3 registros (COD_PRAIA distintos, mismas
coordenadas ± unos cientos de metros, mismo nombre). Este script agrupa por concello
+ nombre normalizado y, cuando las entradas del grupo están CERCA (<= UMBRAL_M, el
mismo criterio de "segmentación del IDE" que usa validate_catalog), conserva una y
descarta el resto, quedándose con la señal más rica de todas (banderaAzul, chiringuitos…).

Los grupos con el mismo nombre pero LEJOS (p. ej. 'Area Grande' en Arteixo a 5,5 km)
NO se tocan: son dos playas distintas o un error de ubicación, y los delata el
validador aparte.

Correr DESPUÉS de build_catalog.py (que regenera los duplicados desde el IDE).

Uso:
    python scripts/ingest/dedup_playas.py            # dry-run (informe)
    python scripts/ingest/dedup_playas.py --apply    # escribe playas.json
"""

from __future__ import annotations

import argparse
import json
import re
import unicodedata
from collections import defaultdict
from pathlib import Path

from common import haversine_m

ROOT = Path(__file__).resolve().parents[2]
PLAYAS = ROOT / "public" / "data" / "catalog" / "playas.json"

# Mismo umbral que validate_catalog: por debajo es segmentación del IDE (misma playa),
# por encima huele a dos playas distintas o a una mal ubicada (no se fusiona).
UMBRAL_M = 1200


def _norm(s: str) -> str:
    s = unicodedata.normalize("NFKD", s or "").encode("ascii", "ignore").decode().lower()
    s = re.sub(r"\b(praia|playa|de|do|da|dos|das|o|a)\b", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def _score(p: dict) -> tuple:
    """Prioridad para elegir la entrada que se conserva: la de más señal."""
    return (
        bool(p.get("curado")),
        bool(p.get("banderaAzul")),
        p.get("chiringuitosCount") or 0,
        -len(p["id"]),
    )


def _merge_into(keeper: dict, group: list[dict]) -> None:
    """Vuelca en `keeper` la mejor señal de todo el grupo (no pierde datos útiles)."""
    if any(p.get("banderaAzul") for p in group):
        keeper["banderaAzul"] = True
    chir = [p["chiringuitosCount"] for p in group if isinstance(p.get("chiringuitosCount"), int)]
    if chir:
        keeper["chiringuitosCount"] = max(chir)
    rest = [p["restauracionM"] for p in group if isinstance(p.get("restauracionM"), (int, float))]
    if rest:
        keeper["restauracionM"] = min(rest)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true", help="escribe playas.json (si no, dry-run)")
    args = ap.parse_args()

    playas = json.loads(PLAYAS.read_text(encoding="utf-8"))
    groups: dict[tuple[str, str], list[dict]] = defaultdict(list)
    for p in playas:
        groups[(p["concello"].lower(), _norm(p["nombre"]))].append(p)

    drop_ids: set[str] = set()
    merged = 0
    print("grupos fusionados (keep = se conserva, drop = se elimina):")
    for (_conc, name), group in sorted(groups.items()):
        if len(group) < 2:
            continue
        far = max(
            haversine_m(a["lat"], a["lon"], b["lat"], b["lon"])
            for i, a in enumerate(group)
            for b in group[i + 1 :]
        )
        if far > UMBRAL_M:
            print(f"  [SKIP {far:.0f} m] {group[0]['concello']} | {name} -> dos playas, sin tocar")
            continue
        keeper = max(group, key=_score)
        _merge_into(keeper, group)
        drop = [p["id"] for p in group if p is not keeper]
        drop_ids.update(drop)
        merged += 1
        conc = group[0]["concello"][:16]
        print(f"  {conc:16} | {name[:20]:20} | keep {keeper['id']} drop {drop}")

    kept = [p for p in playas if p["id"] not in drop_ids]
    print(f"\n{merged} grupos, {len(drop_ids)} eliminadas: {len(playas)} -> {len(kept)} playas")
    print(f"banderaAzul=true tras dedup: {sum(1 for p in kept if p.get('banderaAzul'))}")

    if args.apply:
        PLAYAS.write_text(json.dumps(kept, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"\nEscrito {PLAYAS.relative_to(ROOT)}")
    else:
        print("\n(dry-run; usa --apply para escribir)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
