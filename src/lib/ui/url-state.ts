import type { Modo } from '@/lib/core/types';
import { DEFAULT_LANG, isLang, type Lang } from '@/i18n';

/** Estado persistido en la URL (compartible/recargable). */
export interface UrlState {
  baseId: string;
  modo: Modo;
  lang: Lang;
  requierePmr: boolean;
  maxViajeMin: number;
}

const MODOS: Modo[] = ['auto', 'solo_playa', 'solo_ruta'];

function isModo(value: string): value is Modo {
  return (MODOS as string[]).includes(value);
}

export function readUrlState(search: string, fallbackBase: string): UrlState {
  const p = new URLSearchParams(search);
  const modoRaw = p.get('modo') ?? 'auto';
  const langRaw = p.get('lang') ?? DEFAULT_LANG;
  const maxRaw = Number(p.get('max'));
  return {
    baseId: p.get('base') ?? fallbackBase,
    modo: isModo(modoRaw) ? modoRaw : 'auto',
    lang: isLang(langRaw) ? langRaw : DEFAULT_LANG,
    requierePmr: p.get('pmr') === '1',
    maxViajeMin: Number.isFinite(maxRaw) && maxRaw > 0 ? maxRaw : 90,
  };
}

export function writeUrlState(state: UrlState): void {
  const p = new URLSearchParams();
  p.set('base', state.baseId);
  p.set('modo', state.modo);
  p.set('lang', state.lang);
  if (state.requierePmr) p.set('pmr', '1');
  if (state.maxViajeMin !== 90) p.set('max', String(state.maxViajeMin));
  window.history.replaceState(null, '', `${window.location.pathname}?${p.toString()}`);
}
