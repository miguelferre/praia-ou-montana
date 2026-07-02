"""Tests de los helpers puros del ingest de rutas (sin red)."""

from build_routes import (
    difficulty,
    downsample,
    endpoints,
    is_circular,
    length_km,
    parse_distance,
    positive_ascent,
)


def test_length_km_suma_dentro_de_cada_way():
    # Dos ways; la longitud no cuenta el salto entre el fin de uno y el inicio del otro.
    ways = [[(42.80, -8.90), (42.81, -8.90)], [(42.90, -8.90), (42.91, -8.90)]]
    km = length_km(ways)
    assert 2.0 < km < 2.4  # ~1.11 km por tramo de 0.01° de latitud


def test_endpoints_primero_y_ultimo():
    ways = [[(1.0, 2.0), (1.1, 2.1)], [(1.2, 2.2), (1.3, 2.3)]]
    first, last = endpoints(ways)
    assert first == (1.0, 2.0) and last == (1.3, 2.3)


def test_parse_distance():
    assert parse_distance("7") == 7.0
    assert parse_distance("12,5 km") == 12.5
    assert parse_distance(None) is None
    assert parse_distance("sin número") is None


def test_is_circular_por_tag():
    assert is_circular({"roundtrip": "yes"}, (0, 0), (9, 9)) is True
    assert is_circular({"roundtrip": "no"}, (0, 0), (0, 0)) is False


def test_is_circular_por_geometria():
    # Sin tag: inicio y fin muy cerca → circular; lejos → lineal.
    assert is_circular({}, (42.8, -8.9), (42.8001, -8.9001)) is True
    assert is_circular({}, (42.8, -8.9), (42.85, -8.95)) is False


def test_downsample_conserva_extremos_y_cuenta():
    coords = [(float(i), 0.0) for i in range(100)]
    out = downsample(coords, 10)
    assert len(out) == 10
    assert out[0] == (0.0, 0.0) and out[-1] == (99.0, 0.0)


def test_downsample_no_toca_si_ya_es_corto():
    coords = [(0.0, 0.0), (1.0, 1.0)]
    assert downsample(coords, 10) == coords


def test_positive_ascent_llano_es_cero():
    assert positive_ascent([100.0, 100.0, 100.0]) == 0.0


def test_positive_ascent_subida_monotona():
    assert positive_ascent([0.0, 50.0, 120.0, 200.0]) == 200.0


def test_positive_ascent_ignora_ruido_bajo_umbral():
    # Oscilaciones de ±3 m (por debajo del umbral de 6) no deben sumar desnivel.
    perfil = [100.0, 103.0, 99.0, 102.0, 98.0, 101.0]
    assert positive_ascent(perfil) == 0.0


def test_difficulty_umbrales():
    assert difficulty(6, 100) == "baja"
    assert difficulty(12, 400) == "media"
    assert difficulty(20, 300) == "alta"  # por km
    assert difficulty(10, 800) == "alta"  # por desnivel
