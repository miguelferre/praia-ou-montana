import { describe, expect, it } from 'vitest';
import { readUrlState } from '@/lib/ui/url-state';
import { DEFAULT_PESOS, DEFAULT_RUTA_PREF } from '@/lib/core/prefs';

describe('readUrlState — valores por defecto', () => {
  it('sin query usa base de fallback y defaults', () => {
    const s = readUrlState('', 'santiago');
    expect(s.baseId).toBe('santiago');
    expect(s.modo).toBe('auto');
    expect(s.requierePmr).toBe(false);
    expect(s.maxViajeMin).toBe(90);
    expect(s.pesos).toEqual(DEFAULT_PESOS);
    expect(s.rutaPref).toEqual(DEFAULT_RUTA_PREF);
    expect(s.tab).toBe('playa');
  });
});

describe('readUrlState — ruta ideal (rk/rd)', () => {
  it('lee km y desnivel objetivo', () => {
    const s = readUrlState('?rk=15&rd=800', 'santiago');
    expect(s.rutaPref).toEqual({ kmObjetivo: 15, desnivelObjetivo: 800 });
  });

  it('acota los valores fuera de rango a los límites del slider', () => {
    const s = readUrlState('?rk=999&rd=-50', 'santiago');
    expect(s.rutaPref.kmObjetivo).toBe(25); // máximo de km
    expect(s.rutaPref.desnivelObjetivo).toBe(0); // mínimo de desnivel
  });

  it('valores no numéricos caen al defecto', () => {
    expect(readUrlState('?rk=foo&rd=bar', 'santiago').rutaPref).toEqual(DEFAULT_RUTA_PREF);
  });
});

describe('readUrlState — parámetros base', () => {
  it('lee base, modo, pmr y max', () => {
    const s = readUrlState('?base=esteiro&modo=solo_playa&pmr=1&max=30', 'santiago');
    expect(s.baseId).toBe('esteiro');
    expect(s.modo).toBe('solo_playa');
    expect(s.requierePmr).toBe(true);
    expect(s.maxViajeMin).toBe(30);
  });

  it('descarta valores inválidos de modo y max', () => {
    const s = readUrlState('?modo=volar&max=-5', 'santiago');
    expect(s.modo).toBe('auto');
    expect(s.maxViajeMin).toBe(90);
  });
});

describe('readUrlState — pesos (parámetro w)', () => {
  it('reconstruye los pesos desde un CSV válido, en el orden fijo', () => {
    // Valores dentro de 1..5 (distintos por posición) para probar el mapeo de orden.
    const s = readUrlState('?w=1,2,3,4,5,4,3,2', 'santiago');
    expect(s.pesos).toEqual({
      clima: 1,
      cercania: 2,
      solEfectivo: 3,
      tempAgua: 4,
      masificacion: 5,
      servicios: 4,
      dificultadFit: 3,
      circular: 2,
    });
  });

  it('cae a los pesos por defecto si el CSV está incompleto', () => {
    expect(readUrlState('?w=1,2,3', 'santiago').pesos).toEqual(DEFAULT_PESOS);
  });

  it('cae a los pesos por defecto si hay valores no numéricos', () => {
    expect(readUrlState('?w=1,2,x,4,5,6,7,8', 'santiago').pesos).toEqual(DEFAULT_PESOS);
  });

  it('acota los pesos fuera del rango 1..5 (URL manipulada)', () => {
    const s = readUrlState('?w=0,9,3,3,3,3,3,3', 'santiago');
    expect(s.pesos.clima).toBe(1); // 0 → 1
    expect(s.pesos.cercania).toBe(5); // 9 → 5
    expect(s.pesos.solEfectivo).toBe(3);
  });
});

describe('readUrlState — base libre (custom)', () => {
  it('lee coordenadas y nombre cuando base=custom', () => {
    const s = readUrlState('?base=custom&blat=42.24&blon=-8.72&bn=Vigo', 'santiago');
    expect(s.baseId).toBe('custom');
    expect(s.baseLat).toBe(42.24);
    expect(s.baseLon).toBe(-8.72);
    expect(s.baseName).toBe('Vigo');
  });

  it('ignora blat/blon si la base no es custom', () => {
    const s = readUrlState('?base=santiago&blat=42.24&blon=-8.72', 'santiago');
    expect(s.baseLat).toBeUndefined();
    expect(s.baseLon).toBeUndefined();
  });

  it('base=custom sin coordenadas cae al fallback (no deja estado colgado)', () => {
    const s = readUrlState('?base=custom', 'santiago');
    expect(s.baseId).toBe('santiago');
    expect(s.baseLat).toBeUndefined();
    expect(s.baseLon).toBeUndefined();
  });

  it('base=custom con coordenadas inválidas cae al fallback', () => {
    const s = readUrlState('?base=custom&blat=foo&blon=-8.72', 'santiago');
    expect(s.baseId).toBe('santiago');
    expect(s.baseLat).toBeUndefined();
  });
});

describe('readUrlState — pestaña', () => {
  it('acepta tab=ruta', () => {
    expect(readUrlState('?tab=ruta', 'santiago').tab).toBe('ruta');
  });

  it('cualquier otro valor cae a playa', () => {
    expect(readUrlState('?tab=montana', 'santiago').tab).toBe('playa');
  });
});
