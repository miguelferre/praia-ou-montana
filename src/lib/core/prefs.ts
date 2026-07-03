import type { Pesos, RutaPref, UserPrefs } from './types';

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

/** Ruta ideal por defecto: media jornada (10 km, 400 m de desnivel). */
export const DEFAULT_RUTA_PREF: RutaPref = { kmObjetivo: 10, desnivelObjetivo: 400 };

/** Rangos de los sliders de ruta ideal (compartidos por la UI y la URL). El de km
 *  cubre el catálogo (rutas de senderismo de 3–25 km). */
export const RUTA_KM_RANGE = { min: 3, max: 25, step: 1 } as const;
export const RUTA_DESNIVEL_RANGE = { min: 0, max: 1500, step: 50 } as const;

/** Preferencias por defecto: base Santiago, modo automático, coche, hasta 90 min. */
export function defaultPrefs(): UserPrefs {
  return {
    baseId: 'santiago',
    modo: 'auto',
    transporte: 'coche',
    maxViajeMin: 90,
    rutaPref: { ...DEFAULT_RUTA_PREF },
    requierePmr: false,
    pesos: { ...DEFAULT_PESOS },
  };
}
