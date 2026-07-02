import { DEFAULT_PESOS } from '@/lib/core/prefs';
import type { Modo, Pesos } from '@/lib/core/types';
import { DEFAULT_LANG, isLang, type Lang } from '@/i18n';

/** Pestaña activa de la lista/mapa (playa o ruta). */
export type PanelTab = 'playa' | 'ruta';

/** Estado persistido en la URL (compartible/recargable). */
export interface UrlState {
  baseId: string;
  modo: Modo;
  lang: Lang;
  requierePmr: boolean;
  maxViajeMin: number;
  /** Pesos del motor: se comparten para reproducir el mismo ranking. */
  pesos: Pesos;
  tab: PanelTab;
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
  const langRaw = p.get('lang') ?? DEFAULT_LANG;
  const maxRaw = Number(p.get('max'));
  const tabRaw = p.get('tab');
  return {
    baseId: p.get('base') ?? fallbackBase,
    modo: isModo(modoRaw) ? modoRaw : 'auto',
    lang: isLang(langRaw) ? langRaw : DEFAULT_LANG,
    requierePmr: p.get('pmr') === '1',
    maxViajeMin: Number.isFinite(maxRaw) && maxRaw > 0 ? maxRaw : 90,
    pesos: decodePesos(p.get('w')),
    tab: tabRaw === 'ruta' ? 'ruta' : 'playa',
  };
}

export function writeUrlState(state: UrlState): void {
  const p = new URLSearchParams();
  p.set('base', state.baseId);
  p.set('modo', state.modo);
  p.set('lang', state.lang);
  if (state.requierePmr) p.set('pmr', '1');
  if (state.maxViajeMin !== 90) p.set('max', String(state.maxViajeMin));
  // Solo se añaden a la URL cuando difieren del defecto, para no ensuciarla.
  if (!samePesos(state.pesos, DEFAULT_PESOS)) p.set('w', encodePesos(state.pesos));
  if (state.tab === 'ruta') p.set('tab', state.tab);
  window.history.replaceState(null, '', `${window.location.pathname}?${p.toString()}`);
}
