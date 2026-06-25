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
