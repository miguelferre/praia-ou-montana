import type { Base, Forecast, Playa, Ruta } from '@/lib/core/types';

export const santiago: Base = {
  id: 'santiago',
  nombre: 'Santiago de Compostela',
  lat: 42.8782,
  lon: -8.5448,
};

export function makePlaya(over: Partial<Playa> & { id: string }): Playa {
  return {
    ideGaliciaId: over.id,
    nombre: over.id,
    concello: 'Concello',
    lat: 42.82,
    lon: -9.05,
    curado: false,
    travel: {},
    ...over,
  };
}

export function makeRuta(over: Partial<Ruta> & { id: string }): Ruta {
  return {
    nombre: over.id,
    concello: 'Concello',
    latInicio: 42.75,
    lonInicio: -8.2,
    km: 10,
    desnivelPosM: 400,
    tipo: 'circular',
    dificultad: 'media',
    travel: {},
    ...over,
  };
}

export function makeForecast(over: Partial<Forecast> = {}): Forecast {
  return {
    fecha: '2026-07-15',
    tempMaxC: 24,
    precipProb: 5,
    precipMm: 0,
    nubosidad: 15,
    vientoKmh: 12,
    uvIndex: 7,
    ...over,
  };
}
