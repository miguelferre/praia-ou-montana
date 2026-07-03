import { describe, expect, it } from 'vitest';
import { baseTravelHint, hhmm } from '@/lib/ui/format';

const COVERAGE = 150;

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
