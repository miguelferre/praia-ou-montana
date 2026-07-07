"""Tests del marcado de acceso en barco por isla (funciones puras, sin red)."""

from build_catalog import mark_island_access


def test_marca_playa_en_cies():
    playas = [{"id": "a", "lat": 42.23, "lon": -8.90}]  # dentro de la bbox de Cíes
    assert mark_island_access(playas) == 1
    assert playas[0]["acceso"] == "ferry"


def test_no_marca_playa_continental():
    playas = [{"id": "b", "lat": 42.88, "lon": -8.54}]  # Santiago, tierra adentro
    assert mark_island_access(playas) == 0
    assert "acceso" not in playas[0]


def test_idempotente_retira_flag_si_deja_de_ser_isla():
    # Un dato corregido (antes marcado ferry, ahora en tierra) pierde el flag.
    playas = [{"id": "c", "lat": 42.88, "lon": -8.54, "acceso": "ferry"}]
    mark_island_access(playas)
    assert "acceso" not in playas[0]
