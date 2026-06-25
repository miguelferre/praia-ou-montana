import type { Pesos, UserPrefs } from './types';

/** Pesos por defecto del motor (escala 1..5 de importancia). El scoring los
 *  normaliza, así que solo importan las proporciones entre ellos. */
export const DEFAULT_PESOS: Pesos = {
  clima: 5,
  cercania: 3,
  solEfectivo: 3,
  tempAgua: 2,
  masificacion: 2,
  servicios: 1,
  dificultadFit: 3,
  circular: 2,
};

/** Preferencias por defecto: base Santiago, modo automático, coche, hasta 90 min. */
export function defaultPrefs(): UserPrefs {
  return {
    baseId: 'santiago',
    modo: 'auto',
    transporte: 'coche',
    maxViajeMin: 90,
    rutaPref: { kmObjetivo: 10, desnivelObjetivo: 400 },
    requierePmr: false,
    pesos: { ...DEFAULT_PESOS },
  };
}
