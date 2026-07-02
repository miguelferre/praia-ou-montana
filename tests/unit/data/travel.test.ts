import { describe, expect, it } from 'vitest';
import {
  buildTableUrl,
  candidatesWithin,
  chunk,
  parseTable,
  type TravelPoint,
} from '@/lib/data/travel';

const SANTIAGO = { lat: 42.8805, lon: -8.5449 };

describe('chunk', () => {
  it('trocea en grupos del tamaño dado', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });
  it('lista vacía → sin grupos', () => {
    expect(chunk([], 3)).toEqual([]);
  });
});

describe('candidatesWithin', () => {
  it('descarta lo que queda fuera del presupuesto y ordena por cercanía', () => {
    const pts: TravelPoint[] = [
      { id: 'lejos', lat: 43.68, lon: -7.0 }, // costa de Lugo, >150 km
      { id: 'cerca', lat: 42.9, lon: -8.5 }, // a las afueras de Santiago
    ];
    expect(candidatesWithin(SANTIAGO, pts, 60).map((p) => p.id)).toEqual(['cerca']);
  });
  it('ordena de más cerca a más lejos', () => {
    const near: TravelPoint = { id: 'a', lat: 42.89, lon: -8.54 };
    const mid: TravelPoint = { id: 'b', lat: 42.7, lon: -8.4 };
    expect(candidatesWithin(SANTIAGO, [mid, near], 120).map((p) => p.id)).toEqual(['a', 'b']);
  });
});

describe('buildTableUrl', () => {
  it('pone la base como source=0 y usa el orden lon,lat', () => {
    const url = buildTableUrl(SANTIAGO, [{ id: 'x', lat: 42.79, lon: -8.91 }]);
    expect(url).toContain('/table/v1/driving/-8.5449,42.8805;-8.91,42.79');
    expect(url).toContain('sources=0');
    expect(url).toContain('annotations=duration');
  });
});

describe('parseTable', () => {
  const dests: TravelPoint[] = [
    { id: 'a', lat: 0, lon: 0 },
    { id: 'b', lat: 0, lon: 0 },
  ];
  it('mapea la fila de la base (segundos→min) saltando la propia base', () => {
    expect(parseTable({ durations: [[0, 2510.4, 4260.3]] }, dests)).toEqual({ a: 42, b: 71 });
  });
  it('ignora tramos nulos (sin ruta)', () => {
    expect(parseTable({ durations: [[0, null, 600]] }, dests)).toEqual({ b: 10 });
  });
  it('respuesta corrupta → mapa vacío', () => {
    expect(parseTable({}, dests)).toEqual({});
    expect(parseTable(null, dests)).toEqual({});
  });
});
