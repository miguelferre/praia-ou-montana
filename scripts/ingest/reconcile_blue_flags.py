#!/usr/bin/env python3
"""Reconcilia playas.json:banderaAzul contra la lista oficial del año.

El flag `banderaAzul` del catálogo procede del campo B_AZUL de la IDE de Galicia,
que NO se actualiza con el galardón anual: en 2026 seguía marcando playas que ya lo
habían perdido (p. ej. Samil, o todo el concello de Cangas) y arrastraba duplicados
del propio IDE. Este script vuelve a derivar el flag desde una lista oficial
versionada (data/mapping/banderas_azul_2026.csv) cruzando por concello + nombre
normalizados (sin tildes, sin artículos, sin el prefijo "Praia de…").

Los pocos casos que el cruce por nombre no resuelve —variantes ortográficas o tramos
con otro nombre— se fijan a mano en ALIAS_TRUE, cada uno con su justificación, para
que la decisión quede auditada y no escondida en una heurística.

Correr DESPUÉS de build_catalog.py (que reescribe banderaAzul desde el IDE).

Uso:
    python scripts/ingest/reconcile_blue_flags.py            # dry-run (informe)
    python scripts/ingest/reconcile_blue_flags.py --apply    # escribe playas.json
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PLAYAS = ROOT / "public" / "data" / "catalog" / "playas.json"
OFICIAL = ROOT / "data" / "mapping" / "banderas_azul_2026.csv"

# Playas cuyo nombre en el catálogo no casa con el oficial por variante o por ser un
# tramo con otro nombre, pero que SÍ tienen bandera azul 2026 (revisado a mano).
ALIAS_TRUE = {
    "praia_022": "A Area da Salsa = A Salsa (Rebipelo) (Arteixo)",
    "praia_005": "O Matadoiro = tramo de Orzán-Matadero (A Coruña)",
    "praia_982": "Repibelo = A Salsa (Rebipelo) (Arteixo)",
    "praia_563": "Cuncheira = Concheira (Baiona)",
    "praia_164": "Pareisal = O Pareixal, en A Fragata-O Pareixal (Ferrol)",
    "praia_361": "Andahío-Perbes = Perbes-Andahío (Miño; concello mal escrito en el IDE)",
    "a-lanzada": "A Lanzada = Nosa Señora da Lanzada (Sanxenxo)",
    "praia_875": "Portonovo = Baltar, en Portonovo (Sanxenxo)",
    "praia_942": "Pincho do Gato = Tombo do Gato (Vigo)",
}

# Playas que el cruce por nombre casaría por error: comparten una palabra con una
# playa premiada del mismo concello pero son OTRA playa. Se fijan a false a mano.
ALIAS_FALSE = {
    "praia_143": "Pequena de Ézaro: el galardón es O Ézaro (a maior), no esta (Dumbría)",
    "praia_290": "Pequena de Bastiagueiro: el galardón es Bastiagueiro, no esta (Oleiros)",
    "praia_922": "Punta da Guía: el galardón vigués es A Punta (Alcabre), otra playa",
}


def _strip_accents(s: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn")


def _norm(s: str) -> str:
    s = _strip_accents(s).lower().strip()
    s = re.sub(r"^praia\s+(de\s+|da\s+|do\s+|das\s+|dos\s+)?", "", s)
    s = re.sub(r"\b(o|a|os|as|de|da|do|das|dos|ou|e)\b", " ", s)
    return re.sub(r"[^a-z0-9]+", " ", s).strip()


def _nc(s: str) -> str:
    s = _strip_accents(s).lower().strip()
    s = re.sub(r"^(a|o)\s+", "", s)
    return re.sub(r"[^a-z0-9]+", " ", s).strip()


def load_oficial() -> dict[str, set[str]]:
    by_c: dict[str, set[str]] = {}
    with OFICIAL.open(encoding="utf-8") as fh:
        for row in csv.DictReader(fh):
            by_c.setdefault(_nc(row["concello"]), set()).add(_norm(row["nombre"]))
    return by_c


def is_blue(playa: dict, by_c: dict[str, set[str]]) -> bool:
    """True si la playa casa con una entrada oficial del mismo concello."""
    cn = _nc(playa["concello"])
    nn = _norm(playa["nombre"])
    # Concello por igualdad exacta: el substring casaba de más (Marín ⊂ Camariñas).
    # Los concellos sucios del IDE ("Pontedeume . Miño") se cubren con ALIAS_TRUE.
    names = by_c.get(cn, set())
    return any(nn == on or (bool(nn) and (nn in on or on in nn)) for on in names)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true", help="escribe playas.json (si no, dry-run)")
    args = ap.parse_args()

    by_c = load_oficial()
    playas = json.loads(PLAYAS.read_text(encoding="utf-8"))

    old_true = sum(1 for p in playas if p.get("banderaAzul"))
    to_true: list[dict] = []
    to_false: list[dict] = []
    new_true = 0
    for p in playas:
        pid = p["id"]
        if pid in ALIAS_TRUE:
            new = True
        elif pid in ALIAS_FALSE:
            new = False
        else:
            new = is_blue(p, by_c)
        old = bool(p.get("banderaAzul"))
        if new:
            new_true += 1
        if new and not old:
            to_true.append(p)
        elif old and not new:
            to_false.append(p)
        if args.apply:
            p["banderaAzul"] = new

    print(f"banderaAzul=true: {old_true} (antes) -> {new_true} (después)")
    print(f"\n--- pasan a FALSE ({len(to_false)}) ---")
    for p in sorted(to_false, key=lambda x: (x["concello"], x["nombre"])):
        print(f"  {p['id']:20} | {p['concello']:24} | {p['nombre']}")
    print(f"\n--- pasan a TRUE ({len(to_true)}) ---")
    for p in sorted(to_true, key=lambda x: (x["concello"], x["nombre"])):
        tail = f"   [{ALIAS_TRUE[p['id']]}]" if p["id"] in ALIAS_TRUE else ""
        print(f"  {p['id']:20} | {p['concello']:24} | {p['nombre']}{tail}")

    if args.apply:
        PLAYAS.write_text(json.dumps(playas, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"\nEscrito {PLAYAS.relative_to(ROOT)}")
    else:
        print("\n(dry-run; usa --apply para escribir)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
