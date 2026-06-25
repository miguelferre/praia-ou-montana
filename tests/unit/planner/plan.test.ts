import { describe, expect, it } from 'vitest';
import { plan, type Catalog } from '@/lib/planner';
import { defaultPrefs } from '@/lib/core/prefs';
import type { ForecastIndex } from '@/lib/core/types';
import { makeForecast, makePlaya, makeRuta, santiago } from '../fixtures';

const catalog: Catalog = {
  playas: [makePlaya({ id: 'praia', travel: { santiago: { cocheMin: 30 } } })],
  rutas: [makeRuta({ id: 'ruta', travel: { santiago: { cocheMin: 55 } } })],
};

describe('plan — el veredicto cambia con tiempo y temporada', () => {
  it('día de verano caluroso (malo para caminar) y agua templada → playa', () => {
    const forecast: ForecastIndex = {
      praia: makeForecast({ tempMaxC: 27, precipProb: 0, nubosidad: 5, tempAguaC: 22 }),
      // Calor fuerte: incómodo para senderismo, baja el clima de la ruta.
      ruta: makeForecast({ tempMaxC: 32, precipProb: 0, nubosidad: 5, vientoKmh: 8 }),
    };
    const result = plan({
      catalog,
      base: santiago,
      date: new Date('2026-07-15T10:00:00Z'),
      forecast,
      prefs: defaultPrefs(),
    });
    expect(result.verdict.veredicto).toBe('playa');
  });

  it('día de invierno lluvioso y agua fría → montaña', () => {
    const forecast: ForecastIndex = {
      praia: makeForecast({
        fecha: '2026-01-15',
        tempMaxC: 11,
        precipProb: 85,
        nubosidad: 95,
        tempAguaC: 12,
      }),
      ruta: makeForecast({ fecha: '2026-01-15', tempMaxC: 11, precipProb: 60, nubosidad: 80 }),
    };
    const result = plan({
      catalog,
      base: santiago,
      date: new Date('2026-01-15T10:00:00Z'),
      forecast,
      prefs: defaultPrefs(),
    });
    expect(result.verdict.veredicto).toBe('montana');
  });
});

describe('plan — modos forzados', () => {
  const forecast: ForecastIndex = {
    praia: makeForecast({ tempAguaC: 20 }),
    ruta: makeForecast(),
  };
  const base = santiago;
  const date = new Date('2026-07-15T10:00:00Z');

  it('solo_playa siempre devuelve playa', () => {
    const prefs = { ...defaultPrefs(), modo: 'solo_playa' as const };
    expect(plan({ catalog, base, date, forecast, prefs }).verdict.veredicto).toBe('playa');
  });

  it('solo_ruta siempre devuelve montaña', () => {
    const prefs = { ...defaultPrefs(), modo: 'solo_ruta' as const };
    expect(plan({ catalog, base, date, forecast, prefs }).verdict.veredicto).toBe('montana');
  });
});
