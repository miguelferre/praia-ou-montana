import type { Pesos, UserPrefs } from './types';

/** Pesos por defecto del motor (0..1). Ajustables por el usuario con sliders. */
export const DEFAULT_PESOS: Pesos = {
  clima: 0.3,
  cercania: 0.2,
  solEfectivo: 0.2,
  tempAgua: 0.1,
  masificacion: 0.1,
  servicios: 0.05,
  dificultadFit: 0.2,
  circular: 0.1,
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
