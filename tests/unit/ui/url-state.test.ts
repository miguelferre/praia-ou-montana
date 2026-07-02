import { describe, expect, it } from 'vitest';
import { readUrlState } from '@/lib/ui/url-state';
import { DEFAULT_PESOS } from '@/lib/core/prefs';

// Orden fijo de los pesos en el parámetro `w` (ver url-state.ts).
const W_ORDER = 'clima,cercania,solEfectivo,tempAgua,masificacion,servicios,dificultadFit,circular';

describe('readUrlState — valores por defecto', () => {
  it('sin query usa base de fallback y defaults', () => {
    const s = readUrlState('', 'santiago');
    expect(s.baseId).toBe('santiago');
    expect(s.modo).toBe('auto');
    expect(s.requierePmr).toBe(false);
    expect(s.maxViajeMin).toBe(90);
    expect(s.pesos).toEqual(DEFAULT_PESOS);
    expect(s.tab).toBe('playa');
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
  it('reconstruye los pesos desde un CSV válido', () => {
    const s = readUrlState(
      `?w=${W_ORDER.split(',')
        .map((_, i) => i + 1)
        .join(',')}`,
      'santiago',
    );
    expect(s.pesos).toEqual({
      clima: 1,
      cercania: 2,
      solEfectivo: 3,
      tempAgua: 4,
      masificacion: 5,
      servicios: 6,
      dificultadFit: 7,
      circular: 8,
    });
  });

  it('cae a los pesos por defecto si el CSV está incompleto', () => {
    expect(readUrlState('?w=1,2,3', 'santiago').pesos).toEqual(DEFAULT_PESOS);
  });

  it('cae a los pesos por defecto si hay valores no numéricos', () => {
    expect(readUrlState('?w=1,2,x,4,5,6,7,8', 'santiago').pesos).toEqual(DEFAULT_PESOS);
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
});

describe('readUrlState — pestaña', () => {
  it('acepta tab=ruta', () => {
    expect(readUrlState('?tab=ruta', 'santiago').tab).toBe('ruta');
  });

  it('cualquier otro valor cae a playa', () => {
    expect(readUrlState('?tab=montana', 'santiago').tab).toBe('playa');
  });
});
