"""Tests del emparejado duración→minutos con fallback haversine (funciones puras, sin red)."""

from build_travel import minutes_or_rough, rough_minutes

BASE = {"lat": 42.8782, "lon": -8.5448}


def test_minutes_convierte_segundos_a_minutos():
    assert minutes_or_rough(BASE, [(43.3623, -8.4115)], [3600.0]) == [60]


def test_minutes_cae_a_haversine_si_no_hay_ruta():
    # Un destino irrutable (None) NO debe quedar en 0 min: eso daría cercanía perfecta
    # falsa desde todas las bases. Debe caer a la estimación en línea recta (>0).
    lat, lon = 43.3623, -8.4115
    out = minutes_or_rough(BASE, [(lat, lon)], [None])
    assert out == [rough_minutes(BASE, lat, lon)]
    assert out[0] > 0


def test_minutes_mezcla_rutables_e_irrutables():
    dests = [(43.36, -8.41), (42.24, -8.72)]
    out = minutes_or_rough(BASE, dests, [1800.0, None])
    assert out[0] == 30
    assert out[1] == rough_minutes(BASE, 42.24, -8.72)
