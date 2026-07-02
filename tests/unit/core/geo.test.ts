import { describe, expect, it } from 'vitest';
import { GALICIA_CENTER, haversineKm, roughDriveMinutes } from '@/lib/core/geo';

const santiago = { lat: 42.8782, lon: -8.5448 };
const coruna = { lat: 43.3623, lon: -8.4115 };

describe('haversineKm', () => {
  it('el mismo punto dista 0 km', () => {
    expect(haversineKm(santiago, santiago)).toBe(0);
  });

  it('Santiago–A Coruña ≈ 55 km (línea recta)', () => {
    const d = haversineKm(santiago, coruna);
    expect(d).toBeGreaterThan(50);
    expect(d).toBeLessThan(60);
  });

  it('es simétrica', () => {
    expect(haversineKm(santiago, coruna)).toBeCloseTo(haversineKm(coruna, santiago), 6);
  });
});

describe('roughDriveMinutes (fallback sin ruta precalculada)', () => {
  it('el mismo punto son 0 min', () => {
    expect(roughDriveMinutes(santiago, santiago)).toBe(0);
  });

  it('aplica sinuosidad y velocidad media sobre la distancia', () => {
    const km = haversineKm(santiago, coruna);
    expect(roughDriveMinutes(santiago, coruna)).toBe(Math.round(((km * 1.3) / 65) * 60));
  });

  it('un destino más lejano tarda más', () => {
    const cerca = { lat: 42.9, lon: -8.55 };
    const lejos = { lat: 43.5, lon: -8.2 };
    expect(roughDriveMinutes(santiago, lejos)).toBeGreaterThan(roughDriveMinutes(santiago, cerca));
  });
});

describe('GALICIA_CENTER', () => {
  it('es una coordenada válida dentro de Galicia', () => {
    expect(GALICIA_CENTER.lat).toBeGreaterThan(41.8);
    expect(GALICIA_CENTER.lat).toBeLessThan(43.8);
    expect(GALICIA_CENTER.lon).toBeGreaterThan(-9.3);
    expect(GALICIA_CENTER.lon).toBeLessThan(-6.7);
  });
});
