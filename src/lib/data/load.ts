import type { Base, ForecastIndex, Playa, Ruta } from '@/lib/core/types';

/**
 * Carga de los bundles estáticos servidos en /data. En v0 es un fetch tipado
 * directo; el endurecimiento con zod + caché IndexedDB (convención ComparaClima)
 * llega al cerrar el pipeline de ingesta.
 */
export interface AppData {
  bases: Base[];
  playas: Playa[];
  rutas: Ruta[];
  forecast: ForecastIndex;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`No se pudo cargar ${url} (${res.status})`);
  return (await res.json()) as T;
}

export async function loadAppData(): Promise<AppData> {
  const [bases, playas, rutas, forecast] = await Promise.all([
    fetchJson<Base[]>('/data/meta/bases.json'),
    fetchJson<Playa[]>('/data/catalog/playas.json'),
    fetchJson<Ruta[]>('/data/catalog/rutas.json'),
    fetchJson<ForecastIndex>('/data/forecast/latest.json'),
  ]);
  return { bases, playas, rutas, forecast };
}
