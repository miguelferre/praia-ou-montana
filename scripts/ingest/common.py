#!/usr/bin/env python3
"""Utilidades compartidas por los scripts de ingesta.

Centraliza lo que antes estaba duplicado (haversine, troceado) y una sesión HTTP
con reintentos, para que un fallo transitorio de una API externa (Open-Meteo,
PVGIS, OSRM, ArcGIS) no aborte toda la ingesta.
"""

from __future__ import annotations

from collections.abc import Iterator, Sequence
from math import asin, cos, radians, sin, sqrt

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

EARTH_RADIUS_KM = 6371.0


def chunks[T](seq: Sequence[T], size: int) -> Iterator[Sequence[T]]:
    """Trocea `seq` en subsecuencias de como mucho `size` elementos."""
    for i in range(0, len(seq), size):
        yield seq[i : i + size]


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Distancia Haversine en kilómetros entre dos coordenadas."""
    dlat, dlon = radians(lat2 - lat1), radians(lon2 - lon1)
    h = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
    return 2 * EARTH_RADIUS_KM * asin(min(1, sqrt(h)))


def haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Distancia Haversine en metros (para deduplicar playas cercanas)."""
    return haversine_km(lat1, lon1, lat2, lon2) * 1000.0


def make_session(total: int = 3, backoff: float = 1.0) -> requests.Session:
    """Sesión `requests` con reintentos exponenciales ante fallos transitorios
    (429 y 5xx). El `timeout` de cada llamada se sigue pasando en cada `get/post`."""
    retry = Retry(
        total=total,
        backoff_factor=backoff,
        status_forcelist=(429, 500, 502, 503, 504),
        allowed_methods=frozenset({"GET", "POST"}),
        raise_on_status=False,
    )
    adapter = HTTPAdapter(max_retries=retry)
    session = requests.Session()
    session.mount("https://", adapter)
    session.mount("http://", adapter)
    return session
