import { describe, expect, it } from 'vitest';
import { clamp01, linear, linearInverse, score, type Factor } from '@/lib/core/scoring';

describe('clamp01', () => {
  it('recorta a [0,1] y trata NaN como 0', () => {
    expect(clamp01(-1)).toBe(0);
    expect(clamp01(2)).toBe(1);
    expect(clamp01(0.5)).toBe(0.5);
    expect(clamp01(Number.NaN)).toBe(0);
  });
});

describe('linear / linearInverse', () => {
  it('mapea el rango a [0,1]', () => {
    expect(linear(15, 10, 20)).toBe(0.5);
    expect(linear(5, 10, 20)).toBe(0);
    expect(linear(25, 10, 20)).toBe(1);
  });
  it('invierte el mapeo', () => {
    expect(linearInverse(10, 10, 20)).toBe(1);
    expect(linearInverse(20, 10, 20)).toBe(0);
  });
  it('no divide por cero si min===max', () => {
    expect(linear(10, 10, 10)).toBe(0);
  });
});

describe('score', () => {
  const factors: Factor[] = [
    { key: 'a', label: 'A', weight: 0.5, value: 1 },
    { key: 'b', label: 'B', weight: 0.5, value: 0 },
  ];

  it('normaliza los pesos y devuelve 0..100', () => {
    const s = score(factors);
    expect(s.total).toBeCloseTo(50, 5);
    expect(s.breakdown).toHaveLength(2);
  });

  it('el desglose suma el total', () => {
    const s = score(factors);
    const sum = s.breakdown.reduce((acc, b) => acc + b.points, 0);
    expect(sum).toBeCloseTo(s.total, 5);
  });

  it('con peso total 0 devuelve 0 sin romper', () => {
    const s = score([{ key: 'a', label: 'A', weight: 0, value: 1 }]);
    expect(s.total).toBe(0);
    expect(s.breakdown).toHaveLength(0);
  });

  it('un factor perfecto con peso único da 100', () => {
    const s = score([{ key: 'a', label: 'A', weight: 0.3, value: 1 }]);
    expect(s.total).toBeCloseTo(100, 5);
  });
});
