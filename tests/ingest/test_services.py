"""Tests del conteo de servicios por rejilla (funciones puras, sin red)."""

from build_services import build_index, cell_of, count_near


def test_cell_of_agrupa_puntos_cercanos():
    assert cell_of(42.800, -8.900) == cell_of(42.8009, -8.9009)


def test_cell_of_separa_puntos_lejanos():
    assert cell_of(42.80, -8.90) != cell_of(42.90, -8.90)


def test_count_near_solo_cuenta_dentro_del_radio():
    beach = (42.80, -8.90)
    amenities = [
        (42.8005, -8.9000),  # ~55 m dentro
        (42.8010, -8.9010),  # ~130 m dentro
        (42.8000, -8.9060),  # ~490 m fuera (celda vecina)
        (42.8500, -8.9500),  # lejos
    ]
    assert count_near(beach[0], beach[1], build_index(amenities), 350) == 2


def test_count_near_cero_sin_locales():
    assert count_near(42.8, -8.9, build_index([]), 350) == 0


def test_count_near_incluye_celdas_vecinas():
    # Un local en una celda contigua pero dentro del radio debe contarse.
    beach = (42.8000, -8.9000)
    vecino = (42.8000, -8.9030)  # ~245 m, celda de lon distinta
    assert count_near(beach[0], beach[1], build_index([vecino]), 350) == 1
