import { describe, expect, it } from 'vitest';
import { rankRoutes } from '@/lib/routes';
import { defaultPrefs } from '@/lib/core/prefs';
import type { Pesos } from '@/lib/core/types';
import type { ForecastIndex } from '@/lib/core/types';
import { makeForecast, makeRuta, santiago } from '../fixtures';

const date = new Date('2026-07-15T10:00:00Z');

/** Pesos a cero salvo los indicados: aísla el factor bajo prueba. */
function onlyWeights(active: Partial<Pesos>): Pesos {
  return {
    clima: 0,
    cercania: 0,
    solEfectivo: 0,
    tempAgua: 0,
    masificacion: 0,
    servicios: 0,
    dificultadFit: 0,
    circular: 0,
    ...active,
  };
}

describe('rankRoutes — filtro duro de tiempo de viaje', () => {
  it('excluye rutas que superan maxViajeMin', () => {
    const cerca = makeRuta({ id: 'cerca', travel: { santiago: { cocheMin: 40 } } });
    const lejos = makeRuta({ id: 'lejos', travel: { santiago: { cocheMin: 200 } } });
    const forecast: ForecastIndex = { cerca: makeForecast(), lejos: makeForecast() };

    const { ranked } = rankRoutes([cerca, lejos], {
      base: santiago,
      date,
      forecast,
      prefs: defaultPrefs(),
    });
    expect(ranked.map((r) => r.ruta.id)).toEqual(['cerca']);
  });
});

describe('rankRoutes — mover un peso reordena el ranking', () => {
  it('con solo el peso "circular" gana la circular sobre la lineal', () => {
    const circular = makeRuta({
      id: 'circular',
      tipo: 'circular',
      travel: { santiago: { cocheMin: 30 } },
    });
    const lineal = makeRuta({
      id: 'lineal',
      tipo: 'lineal',
      travel: { santiago: { cocheMin: 30 } },
    });
    const forecast: ForecastIndex = { circular: makeForecast(), lineal: makeForecast() };
    const prefs = { ...defaultPrefs(), pesos: onlyWeights({ circular: 1 }) };

    const { best } = rankRoutes([lineal, circular], { base: santiago, date, forecast, prefs });
    expect(best?.ruta.id).toBe('circular');
  });

  it('con solo "dificultadFit" gana la que encaja con km/desnivel objetivo', () => {
    // defaultPrefs.rutaPref = { kmObjetivo: 10, desnivelObjetivo: 400 }
    const encaja = makeRuta({
      id: 'encaja',
      km: 10,
      desnivelPosM: 400,
      travel: { santiago: { cocheMin: 30 } },
    });
    const noEncaja = makeRuta({
      id: 'no-encaja',
      km: 32,
      desnivelPosM: 1400,
      travel: { santiago: { cocheMin: 30 } },
    });
    const forecast: ForecastIndex = { encaja: makeForecast(), 'no-encaja': makeForecast() };
    const prefs = { ...defaultPrefs(), pesos: onlyWeights({ dificultadFit: 1 }) };

    const { best } = rankRoutes([noEncaja, encaja], { base: santiago, date, forecast, prefs });
    expect(best?.ruta.id).toBe('encaja');
  });
});

describe('rankRoutes — propaga el UV del forecast a la ficha', () => {
  it('expone uvIndex cuando hay forecast', () => {
    const ruta = makeRuta({ id: 'r', travel: { santiago: { cocheMin: 20 } } });
    const forecast: ForecastIndex = { r: makeForecast({ uvIndex: 8 }) };
    const { best } = rankRoutes([ruta], { base: santiago, date, forecast, prefs: defaultPrefs() });
    expect(best?.uvIndex).toBe(8);
  });

  it('deja uvIndex indefinido si no hay forecast para la ruta', () => {
    const ruta = makeRuta({ id: 'r', travel: { santiago: { cocheMin: 20 } } });
    const { best } = rankRoutes([ruta], {
      base: santiago,
      date,
      forecast: {},
      prefs: defaultPrefs(),
    });
    expect(best?.uvIndex).toBeUndefined();
  });
});
