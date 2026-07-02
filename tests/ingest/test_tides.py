"""Tests de la extracción de mareas (extremos de la curva de nivel del mar)."""

from math import cos, pi

from fetch_forecast import _parabolic_offset, extract_tides


def _semidiurnal_curve(hours: int = 24):
    """Curva cosenoidal de periodo 12 h: máximos en h=3 y h=15, mínimos en h=9 y h=21."""
    times = [f"2026-07-15T{h:02d}:00" for h in range(hours)]
    levels = [cos(2 * pi * (h - 3) / 12) for h in range(hours)]
    return times, levels


def test_extract_tides_alterna_pleamar_y_bajamar():
    times, levels = _semidiurnal_curve()
    tides = extract_tides(times, levels, offset_s=7200)
    tipos = [t["type"] for t in tides]
    assert tipos == ["high", "low", "high", "low"]


def test_extract_tides_horas_cercanas_a_los_extremos():
    times, levels = _semidiurnal_curve()
    tides = extract_tides(times, levels, offset_s=7200)
    horas = [int(t["time"][11:13]) for t in tides]
    # Máximos ~3 y ~15, mínimos ~9 y ~21 (con el refinado parabólico, ±1 h).
    assert horas[0] in (2, 3)
    assert horas[1] in (8, 9)
    assert horas[2] in (14, 15)


def test_extract_tides_incluye_zona_horaria():
    times, levels = _semidiurnal_curve()
    tides = extract_tides(times, levels, offset_s=7200)
    assert tides[0]["time"].endswith("+02:00")


def test_extract_tides_ignora_nulos():
    times = [f"2026-07-15T{h:02d}:00" for h in range(5)]
    levels = [0.0, None, 1.0, None, 0.0]
    # No hay tres puntos consecutivos no nulos → no se puede detectar ningún extremo.
    assert extract_tides(times, levels, offset_s=0) == []


def test_parabolic_offset_pico_simetrico_es_cero():
    assert _parabolic_offset(0.0, 1.0, 0.0) == 0.0


def test_parabolic_offset_acotado():
    off = _parabolic_offset(0.0, 10.0, 9.0)
    assert -0.5 <= off <= 0.5
