"""Tests de las utilidades compartidas de ingesta (funciones puras, sin red)."""

from common import chunks, haversine_km, haversine_m


def test_haversine_mismo_punto_es_cero():
    assert haversine_km(42.8782, -8.5448, 42.8782, -8.5448) == 0.0


def test_haversine_santiago_coruna_aprox_55km():
    d = haversine_km(42.8782, -8.5448, 43.3623, -8.4115)
    assert 50 < d < 60


def test_haversine_es_simetrica():
    ida = haversine_km(42.8782, -8.5448, 43.3623, -8.4115)
    vuelta = haversine_km(43.3623, -8.4115, 42.8782, -8.5448)
    assert abs(ida - vuelta) < 1e-9


def test_haversine_m_es_km_por_mil():
    km = haversine_km(42.8782, -8.5448, 43.3623, -8.4115)
    m = haversine_m(42.8782, -8.5448, 43.3623, -8.4115)
    assert abs(m - km * 1000) < 1e-6


def test_chunks_trocea_en_tamanos_correctos():
    assert [list(c) for c in chunks([1, 2, 3, 4, 5], 2)] == [[1, 2], [3, 4], [5]]


def test_chunks_lista_vacia():
    assert list(chunks([], 3)) == []
