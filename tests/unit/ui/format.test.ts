import { describe, expect, it } from 'vitest';
import { baseTravelHint, hhmm, sunsetColor, waterColor } from '@/lib/ui/format';

const COVERAGE = 150;

const lightness = (oklch: string) => Number(oklch.match(/oklch\(([\d.]+)/)?.[1]);
const hue = (oklch: string) => Number(oklch.match(/([\d.]+)\)$/)?.[1]);

describe('waterColor / sunsetColor — escalas de color del mapa', () => {
  it('agua más cálida → azul más profundo dentro del rango del día', () => {
    expect(lightness(waterColor(20, 15, 20))).toBeLessThan(lightness(waterColor(15, 15, 20)));
  });

  it('el agua se mantiene en tonos azules (hue 220..245)', () => {
    const h = hue(waterColor(17, 15, 20));
    expect(h).toBeGreaterThanOrEqual(220);
    expect(h).toBeLessThanOrEqual(245);
  });

  it('1 °C se distingue con el rango dinámico del día (ΔL perceptible)', () => {
    const dL = Math.abs(lightness(waterColor(18, 15, 20)) - lightness(waterColor(19, 15, 20)));
    expect(dL).toBeGreaterThan(0.03);
  });

  it('rango degenerado (span 0) usa el punto medio sin romper', () => {
    expect(lightness(waterColor(18, 18, 18))).toBeCloseTo(0.58, 2); // t=0.5 → L 0.58
  });

  it('ocaso más tardío → más naranja (menor hue que el temprano)', () => {
    expect(hue(sunsetColor(1))).toBeLessThan(hue(sunsetColor(0)));
  });

  it('acota t fuera de [0,1]', () => {
    expect(sunsetColor(-1)).toBe(sunsetColor(0));
    expect(sunsetColor(2)).toBe(sunsetColor(1));
  });
});

describe('hhmm — hora en Europe/Madrid (F24)', () => {
  it('convierte un ISO UTC a la hora de Galicia (verano, +02)', () => {
    expect(hhmm('2026-07-15T18:30:00Z')).toBe('20:30');
  });

  it('respeta un ISO ya con offset de Madrid', () => {
    expect(hhmm('2026-07-15T08:15:00+02:00')).toBe('08:15');
  });
});

describe('baseTravelHint — aviso honesto de la base libre (F11)', () => {
  it('calculando → baseCalculating', () => {
    expect(baseTravelHint('loading', 90, COVERAGE)).toBe('baseCalculating');
  });

  it('estimación → baseApprox', () => {
    expect(baseTravelHint('approx', 90, COVERAGE)).toBe('baseApprox');
  });

  it('real dentro de la cobertura → baseReal', () => {
    expect(baseTravelHint('real', 150, COVERAGE)).toBe('baseReal');
  });

  it('real por encima de la cobertura → baseRealPartial (no promete de más)', () => {
    expect(baseTravelHint('real', 200, COVERAGE)).toBe('baseRealPartial');
  });

  it('idle → sin aviso', () => {
    expect(baseTravelHint('idle', 90, COVERAGE)).toBeNull();
  });
});
