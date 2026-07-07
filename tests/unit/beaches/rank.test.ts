import { describe, expect, it } from 'vitest';
import { rankBeaches } from '@/lib/beaches';
import { defaultPrefs } from '@/lib/core/prefs';
import type { ForecastIndex } from '@/lib/core/types';
import { makeForecast, makePlaya, santiago } from '../fixtures';

const date = new Date('2026-07-15T10:00:00Z');

describe('rankBeaches — filtro PMR (filtro duro)', () => {
  it('excluye playas sin PMR cuando se requiere accesibilidad', () => {
    const accesible = makePlaya({
      id: 'accesible',
      travel: { santiago: { cocheMin: 30 } },
      pmr: { rampa: true, sillaAnfibia: true, aseoAdaptado: true, aparcamiento: true },
    });
    const noAccesible = makePlaya({ id: 'no-accesible', travel: { santiago: { cocheMin: 30 } } });
    const forecast: ForecastIndex = {
      accesible: makeForecast(),
      'no-accesible': makeForecast(),
    };
    const prefs = { ...defaultPrefs(), requierePmr: true };

    const { ranked } = rankBeaches([accesible, noAccesible], {
      base: santiago,
      date,
      forecast,
      prefs,
    });
    expect(ranked.map((r) => r.playa.id)).toEqual(['accesible']);
  });
});

describe('rankBeaches — mover un peso reordena el ranking', () => {
  // A: cerca pero pequeña. B: lejos pero muy larga (más espacio).
  const cercaPequena = makePlaya({
    id: 'cerca-pequena',
    travel: { santiago: { cocheMin: 10 } },
    longitudM: 200,
  });
  const lejosGrande = makePlaya({
    id: 'lejos-grande',
    travel: { santiago: { cocheMin: 80 } },
    longitudM: 1500,
  });
  const forecast: ForecastIndex = {
    'cerca-pequena': makeForecast(),
    'lejos-grande': makeForecast(),
  };
  const beaches = [cercaPequena, lejosGrande];

  it('por defecto gana la cercana', () => {
    const { best } = rankBeaches(beaches, {
      base: santiago,
      date,
      forecast,
      prefs: defaultPrefs(),
    });
    expect(best?.playa.id).toBe('cerca-pequena');
  });

  it('subiendo el peso de espacio (masificación) gana la larga', () => {
    const prefs = defaultPrefs();
    prefs.pesos = {
      clima: 0,
      cercania: 0,
      solEfectivo: 0,
      tempAgua: 0,
      masificacion: 1,
      servicios: 0,
      dificultadFit: 0,
      circular: 0,
    };
    const { best } = rankBeaches(beaches, { base: santiago, date, forecast, prefs });
    expect(best?.playa.id).toBe('lejos-grande');
  });
});

describe('rankBeaches — propaga el UV del forecast a la ficha', () => {
  it('expone uvIndex en el item puntuado cuando hay forecast', () => {
    const playa = makePlaya({ id: 'p', travel: { santiago: { cocheMin: 20 } } });
    const forecast: ForecastIndex = { p: makeForecast({ uvIndex: 9 }) };
    const { best } = rankBeaches([playa], {
      base: santiago,
      date,
      forecast,
      prefs: defaultPrefs(),
    });
    expect(best?.uvIndex).toBe(9);
  });

  it('deja uvIndex indefinido si la playa no tiene forecast', () => {
    const playa = makePlaya({ id: 'p', travel: { santiago: { cocheMin: 20 } } });
    const { best } = rankBeaches([playa], {
      base: santiago,
      date,
      forecast: {},
      prefs: defaultPrefs(),
    });
    expect(best?.uvIndex).toBeUndefined();
  });
});

describe('rankBeaches — propaga el oleaje del forecast a la ficha', () => {
  it('expone oleajeM en el item puntuado cuando hay forecast', () => {
    const playa = makePlaya({ id: 'p', travel: { santiago: { cocheMin: 20 } } });
    const forecast: ForecastIndex = { p: makeForecast({ oleajeM: 1.4 }) };
    const { best } = rankBeaches([playa], {
      base: santiago,
      date,
      forecast,
      prefs: defaultPrefs(),
    });
    expect(best?.oleajeM).toBe(1.4);
  });
});

describe('rankBeaches — propaga las mareas del forecast a la ficha', () => {
  it('expone las mareas (pleamar/bajamar) en el item puntuado', () => {
    const playa = makePlaya({ id: 'p', travel: { santiago: { cocheMin: 20 } } });
    const mareas = [
      { time: '2026-07-15T08:15:00+02:00', heightM: 3.8, type: 'high' as const },
      { time: '2026-07-15T14:30:00+02:00', heightM: 0.9, type: 'low' as const },
    ];
    const forecast: ForecastIndex = { p: makeForecast({ mareas }) };
    const { best } = rankBeaches([playa], {
      base: santiago,
      date,
      forecast,
      prefs: defaultPrefs(),
    });
    expect(best?.mareas).toEqual(mareas);
  });
});
