"""Pone `scripts/ingest` en el path para poder importar los módulos de ingesta."""

import sys
from pathlib import Path

INGEST = Path(__file__).resolve().parents[2] / "scripts" / "ingest"
sys.path.insert(0, str(INGEST))
