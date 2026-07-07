"""Tests de la fusión de casi-duplicados de playas (funciones puras, sin red)."""

from dedup_playas import _merge_into, _norm, _score


def test_norm_quita_articulos_y_praia():
    assert _norm("Praia de Area Grande") == _norm("area grande")


def test_score_prefiere_curada():
    assert _score({"id": "p1", "curado": True}) > _score({"id": "p2"})


def test_score_prefiere_con_horizonte():
    # A igualdad de curado/bandera, se conserva la entrada con perfil de horizonte,
    # para no perder la puesta efectiva al fundir (F18).
    con = {"id": "praia_1", "horizonProfile": [1.0, 2.0]}
    sin = {"id": "praia_2"}
    assert _score(con) > _score(sin)


def test_merge_hereda_horizonte_si_el_keeper_no_lo_tiene():
    keeper = {"id": "k"}
    group = [keeper, {"id": "o", "horizonProfile": [3.0, 4.0]}]
    _merge_into(keeper, group)
    assert keeper["horizonProfile"] == [3.0, 4.0]
