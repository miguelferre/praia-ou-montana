import { describe, expect, it } from 'vitest';
import { decide, seasonalBeachHandicap } from '@/lib/verdict';
import type { ScoredPlaya, ScoredRuta } from '@/lib/core/result';
import { makePlaya, makeRuta } from '../fixtures';

const summer = new Date('2026-07-15T10:00:00Z');
const winter = new Date('2026-01-15T10:00:00Z');

function beach(total: number, tempAguaC?: number): ScoredPlaya {
  return {
    kind: 'playa',
    playa: makePlaya({ id: 'p' }),
    score: { total, breakdown: [] },
    travelMin: 20,
    ...(tempAguaC !== undefined ? { tempAguaC } : {}),
  };
}

function route(total: number): ScoredRuta {
  return {
    kind: 'ruta',
    ruta: makeRuta({ id: 'r' }),
    score: { total, breakdown: [] },
    travelMin: 30,
  };
}

describe('seasonalBeachHandicap — regla estacional explícita', () => {
  it('en verano sin agua fría no hay desventaja', () => {
    expect(seasonalBeachHandicap(beach(50), summer)).toBe(0);
  });

  it('en enero la playa parte con desventaja', () => {
    expect(seasonalBeachHandicap(undefined, winter)).toBe(8);
  });

  it('noviembre aplica media desventaja', () => {
    expect(seasonalBeachHandicap(undefined, new Date('2026-11-15T10:00:00Z'))).toBe(4);
  });

  it('el agua muy fría suma a la desventaja invernal', () => {
    // enero (8) + agua < 15 (10) = 18
    expect(seasonalBeachHandicap(beach(50, 12), winter)).toBe(18);
  });

  it('el agua templada-fría penaliza menos', () => {
    // verano (0) + 15 <= agua < 17 (5) = 5
    expect(seasonalBeachHandicap(beach(50, 16), summer)).toBe(5);
  });
});

describe('decide — modos forzados', () => {
  it('solo_playa devuelve playa si hay una', () => {
    const r = decide(beach(50), route(90), { modo: 'solo_playa', date: summer });
    expect(r.veredicto).toBe('playa');
  });

  it('solo_ruta devuelve montaña si hay una', () => {
    const r = decide(beach(90), route(50), { modo: 'solo_ruta', date: summer });
    expect(r.veredicto).toBe('montana');
  });

  it('sin candidatos, ninguna', () => {
    expect(decide(undefined, undefined, { modo: 'auto', date: summer }).veredicto).toBe('ninguna');
  });
});

describe('decide — auto compara la mejor de cada tipo', () => {
  it('empate técnico (margen < umbral) → ambas', () => {
    const r = decide(beach(50), route(50), { modo: 'auto', date: summer });
    expect(r.veredicto).toBe('ambas');
    expect(r.margin).toBe(0);
  });

  it('playa claramente mejor → playa', () => {
    expect(decide(beach(75), route(40), { modo: 'auto', date: summer }).veredicto).toBe('playa');
  });

  it('ruta claramente mejor → montaña', () => {
    expect(decide(beach(40), route(75), { modo: 'auto', date: summer }).veredicto).toBe('montana');
  });

  it('la desventaja invernal desempata hacia la montaña', () => {
    // Playa 52 vs ruta 55: en verano quedan igualadas (margen −3 → ambas); en
    // enero la desventaja de temporada (−8) hunde la playa a 44 y gana la montaña.
    const veranoResult = decide(beach(52), route(55), { modo: 'auto', date: summer });
    expect(veranoResult.veredicto).toBe('ambas');
    const inviernoResult = decide(beach(52), route(55), { modo: 'auto', date: winter });
    expect(inviernoResult.veredicto).toBe('montana');
    expect(inviernoResult.seasonalHandicap).toBe(8);
  });
});
