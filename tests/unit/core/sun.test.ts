import { describe, expect, it } from 'vitest';
import { computeSun, horizonElevationDeg } from '@/lib/core/sun';

// Carnota (mira al oeste sobre el Atlántico).
const LAT = 42.82;
const LON = -9.11;
const VERANO = new Date('2026-07-15T12:00:00Z');

describe('horizonElevationDeg', () => {
  it('perfil constante devuelve ese valor en cualquier azimut', () => {
    const profile = new Array<number>(48).fill(10);
    expect(horizonElevationDeg(profile, 0)).toBeCloseTo(10, 5);
    expect(horizonElevationDeg(profile, 90)).toBeCloseTo(10, 5);
    expect(horizonElevationDeg(profile, -120)).toBeCloseTo(10, 5);
  });
  it('perfil vacío devuelve 0', () => {
    expect(horizonElevationDeg([], 45)).toBe(0);
  });
});

describe('computeSun', () => {
  it('orden temporal: amanecer < mediodía < puesta', () => {
    const sun = computeSun(VERANO, LAT, LON);
    expect(sun.sunrise.getTime()).toBeLessThan(sun.solarNoon.getTime());
    expect(sun.solarNoon.getTime()).toBeLessThan(sun.sunset.getTime());
    expect(sun.afternoonSunMinutes).toBeGreaterThan(0);
  });

  it('sin perfil de horizonte, la puesta efectiva == astronómica', () => {
    const sun = computeSun(VERANO, LAT, LON);
    expect(sun.effectiveSunset.getTime()).toBe(sun.sunset.getTime());
  });

  it('un monte al oeste adelanta la puesta efectiva y acorta la tarde de sol', () => {
    // Pared de 35° de elevación en azimuts del oeste (sur-referenciado +45..+135).
    const profile = new Array<number>(48).fill(0);
    for (let i = 30; i <= 42; i++) profile[i] = 35;

    const llano = computeSun(VERANO, LAT, LON);
    const conMonte = computeSun(VERANO, LAT, LON, profile);

    expect(conMonte.effectiveSunset.getTime()).toBeLessThan(llano.sunset.getTime());
    expect(conMonte.afternoonSunMinutes).toBeLessThan(llano.afternoonSunMinutes);
  });
});
