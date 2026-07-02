"""Tests del validador de catálogo (funciones puras, sin red ni ficheros)."""

from validate_catalog import PLAYA_REQUIRED, validate_items, warn_misplaced


def _playa(**over):
    base = {
        "id": "p1",
        "nombre": "Praia Test",
        "concello": "Noia",
        "lat": 42.79,
        "lon": -8.91,
        "travel": {},
    }
    base.update(over)
    return base


def test_catalogo_valido_no_da_errores():
    assert validate_items([_playa()], PLAYA_REQUIRED, "lat", "lon") == []


def test_falla_coordenada_fuera_de_galicia():
    errs = validate_items([_playa(lat=40.0, lon=-3.7)], PLAYA_REQUIRED, "lat", "lon")
    assert any("fuera de Galicia" in e for e in errs)


def test_falla_campo_ausente():
    errs = validate_items([_playa(nombre="")], PLAYA_REQUIRED, "lat", "lon")
    assert any("nombre" in e for e in errs)


def test_falla_id_duplicado():
    errs = validate_items([_playa(id="dup"), _playa(id="dup")], PLAYA_REQUIRED, "lat", "lon")
    assert any("duplicado" in e for e in errs)


def test_falla_coordenada_no_numerica():
    errs = validate_items([_playa(lat="42.8")], PLAYA_REQUIRED, "lat", "lon")
    assert any("no numéricos" in e for e in errs)


def test_lista_vacia_es_error():
    assert validate_items([], PLAYA_REQUIRED, "lat", "lon")


def test_aviso_mismo_nombre_lejos():
    # Dos "Praia do Testal" en Noia a >1.2 km → aviso (el patrón del bug real).
    items = [
        _playa(id="a", nombre="Praia do Testal", lat=42.790, lon=-8.913),
        _playa(id="b", nombre="Praia do Testal", lat=42.779, lon=-8.923),
    ]
    warns = warn_misplaced(items, "lat", "lon")
    assert len(warns) == 1 and "testal" in warns[0].lower()


def test_sin_aviso_si_estan_cerca():
    items = [
        _playa(id="a", nombre="Praia do Testal", lat=42.7906, lon=-8.9126),
        _playa(id="b", nombre="Praia do Testal", lat=42.7908, lon=-8.9128),
    ]
    assert warn_misplaced(items, "lat", "lon") == []
