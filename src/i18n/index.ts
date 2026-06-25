import { es, type Dict } from './es';
import { gl } from './gl';

export type Lang = 'es' | 'gl';
export type { Dict };

const DICTS: Record<Lang, Dict> = { es, gl };

export const LANGS: Lang[] = ['es', 'gl'];
export const DEFAULT_LANG: Lang = 'es';

export function getDict(lang: Lang): Dict {
  return DICTS[lang];
}

export function isLang(value: string): value is Lang {
  return value === 'es' || value === 'gl';
}
