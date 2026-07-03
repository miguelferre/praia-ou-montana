import {
  DEFAULT_PESOS,
  DEFAULT_RUTA_PREF,
  RUTA_DESNIVEL_RANGE,
  RUTA_KM_RANGE,
} from '@/lib/core/prefs';
import type { Modo, Pesos, RutaPref } from '@/lib/core/types';

/** Pestaña activa de la lista/mapa (playa o ruta). */
export type PanelTab = 'playa' | 'ruta';

/** Estado persistido en la URL (compartible/recargable). */
export interface UrlState {
  baseId: string;
  /** Coordenadas y nombre de la base libre (solo cuando `baseId === 'custom'`). */
  baseLat?: number;
  baseLon?: number;
  baseName?: string;
  modo: Modo;
  requierePmr: boolean;
  maxViajeMin: number;
  /** Pesos del motor: se comparten para reproducir el mismo ranking. */
  pesos: Pesos;
  /** Ruta ideal del usuario (km y desnivel objetivo) que alimenta el factor de dureza. */
  rutaPref: RutaPref;
  tab: PanelTab;
}

/** Id reservado para la base introducida por el usuario (geocoding). */
export const CUSTOM_BASE_ID = 'custom';

function numOrUndef(raw: string | null): number | undefined {
  if (raw === null) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

/** Lee un número acotado al rango [min,max]; ausente o inválido → `fallback`. */
function readRange(raw: string | null, min: number, max: number, fallback: number): number {
  const n = numOrUndef(raw);
  return n === undefined ? fallback : Math.max(min, Math.min(max, n));
}

const MODOS: Modo[] = ['auto', 'solo_playa', 'solo_ruta'];

/** Orden fijo de los pesos en la URL (no reordenar: rompería enlaces antiguos). */
const PESO_KEYS: (keyof Pesos)[] = [
  'clima',
  'cercania',
  'solEfectivo',
  'tempAgua',
  'masificacion',
  'servicios',
  'dificultadFit',
  'circular',
];

function isModo(value: string): value is Modo {
  return (MODOS as string[]).includes(value);
}

/** Serializa los pesos como CSV en el orden de `PESO_KEYS`. */
function encodePesos(pesos: Pesos): string {
  return PESO_KEYS.map((k) => pesos[k]).join(',');
}

/** Reconstruye los pesos desde el CSV; si algo no cuadra, devuelve los de defecto. */
function decodePesos(raw: string | null): Pesos {
  if (!raw) return { ...DEFAULT_PESOS };
  const parts = raw.split(',').map(Number);
  if (parts.length !== PESO_KEYS.length || parts.some((n) => !Number.isFinite(n) || n < 0)) {
    return { ...DEFAULT_PESOS };
  }
  const pesos = {} as Pesos;
  PESO_KEYS.forEach((k, i) => {
    pesos[k] = parts[i] as number;
  });
  return pesos;
}

function samePesos(a: Pesos, b: Pesos): boolean {
  return PESO_KEYS.every((k) => a[k] === b[k]);
}

export function readUrlState(search: string, fallbackBase: string): UrlState {
  const p = new URLSearchParams(search);
  const modoRaw = p.get('modo') ?? 'auto';
  const maxRaw = Number(p.get('max'));
  const tabRaw = p.get('tab');
  const rawBase = p.get('base') ?? fallbackBase;
  const baseLat = rawBase === CUSTOM_BASE_ID ? numOrUndef(p.get('blat')) : undefined;
  const baseLon = rawBase === CUSTOM_BASE_ID ? numOrUndef(p.get('blon')) : undefined;
  // base=custom exige coordenadas: sin ellas (URL truncada o manipulada) se cae al
  // fallback en vez de dejar un estado colgado — selector en 'custom' sin punto y el
  // ranking usando Santiago mientras la URL se reescribe como custom.
  const custom = baseLat !== undefined && baseLon !== undefined;
  const baseId = rawBase === CUSTOM_BASE_ID && !custom ? fallbackBase : rawBase;
  const baseName = custom ? (p.get('bn') ?? undefined) : undefined;
  return {
    baseId,
    // Cada clave opcional se incluye solo si tiene valor (exactOptionalPropertyTypes).
    ...(baseLat !== undefined && baseLon !== undefined ? { baseLat, baseLon } : {}),
    ...(baseName !== undefined ? { baseName } : {}),
    modo: isModo(modoRaw) ? modoRaw : 'auto',
    requierePmr: p.get('pmr') === '1',
    maxViajeMin: Number.isFinite(maxRaw) && maxRaw > 0 ? maxRaw : 90,
    pesos: decodePesos(p.get('w')),
    rutaPref: {
      kmObjetivo: readRange(
        p.get('rk'),
        RUTA_KM_RANGE.min,
        RUTA_KM_RANGE.max,
        DEFAULT_RUTA_PREF.kmObjetivo,
      ),
      desnivelObjetivo: readRange(
        p.get('rd'),
        RUTA_DESNIVEL_RANGE.min,
        RUTA_DESNIVEL_RANGE.max,
        DEFAULT_RUTA_PREF.desnivelObjetivo,
      ),
    },
    tab: tabRaw === 'ruta' ? 'ruta' : 'playa',
  };
}

export function writeUrlState(state: UrlState): void {
  const p = new URLSearchParams();
  p.set('base', state.baseId);
  if (
    state.baseId === CUSTOM_BASE_ID &&
    state.baseLat !== undefined &&
    state.baseLon !== undefined
  ) {
    p.set('blat', state.baseLat.toFixed(5));
    p.set('blon', state.baseLon.toFixed(5));
    if (state.baseName) p.set('bn', state.baseName);
  }
  p.set('modo', state.modo);
  if (state.requierePmr) p.set('pmr', '1');
  if (state.maxViajeMin !== 90) p.set('max', String(state.maxViajeMin));
  // Solo se añaden a la URL cuando difieren del defecto, para no ensuciarla.
  if (!samePesos(state.pesos, DEFAULT_PESOS)) p.set('w', encodePesos(state.pesos));
  if (state.rutaPref.kmObjetivo !== DEFAULT_RUTA_PREF.kmObjetivo) {
    p.set('rk', String(state.rutaPref.kmObjetivo));
  }
  if (state.rutaPref.desnivelObjetivo !== DEFAULT_RUTA_PREF.desnivelObjetivo) {
    p.set('rd', String(state.rutaPref.desnivelObjetivo));
  }
  if (state.tab === 'ruta') p.set('tab', state.tab);
  window.history.replaceState(null, '', `${window.location.pathname}?${p.toString()}`);
}
