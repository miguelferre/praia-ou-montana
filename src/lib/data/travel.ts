/**
 * Tiempos de viaje en coche para la "base libre".
 *
 * Las bases preset traen el tiempo a cada destino precalculado por build_travel.py
 * (OpenRouteService/OSRM en la ingesta). La base libre es una ubicación arbitraria,
 * así que no hay valor precalculado: se pide bajo demanda a OSRM (servidor público
 * de OpenStreetMap; HTTPS con CORS abierto) y se cachea por base en IndexedDB. Es
 * capa de E/S, como load.ts y geocode.ts: hace red, no es lib pura.
 *
 * El endpoint es configurable con PUBLIC_TRAVEL_ENDPOINT. Por defecto llama a OSRM
 * directamente desde el navegador (sin backend, fiel al static-first). Si en el
 * futuro quieres caché compartida o cambiar de proveedor, apúntalo a un Worker
 * propio sin tocar el resto del cliente.
 */
import { openDB, type IDBPDatabase } from 'idb';
import { roughDriveMinutes } from '@/lib/core/geo';
import type { LatLng } from '@/lib/core/types';

export interface TravelPoint {
  id: string;
  lat: number;
  lon: number;
}

export interface TravelResult {
  /** destinoId → minutos en coche (solo los que OSRM resolvió). */
  minutes: Record<string, number>;
  /** true si algún tramo falló o se omitió: el ranking cae a estimación en esos. */
  partial: boolean;
}

export interface FetchOptions {
  /** Solo se piden destinos que en línea recta caen dentro de este tiempo (con margen). */
  maxMin?: number;
  signal?: AbortSignal;
  /** Se llama tras cada tramo con el mapa acumulado, para refrescar la UI progresivamente. */
  onProgress?: (minutes: Record<string, number>) => void;
}

// OSRM /table admite varias coordenadas por llamada, pero la URL no puede crecer sin
// límite (y el demo público topa el tamaño de la matriz): se trocea.
const CHUNK = 90;
// Preselección: por encima de esto nadie conduce a una playa o ruta, así que no se
// gastan llamadas. Fijo (no atado al slider) para no re-pedir al moverlo.
const DEFAULT_MAX_MIN = 150;

const ENDPOINT =
  (import.meta.env as Record<string, string | undefined>).PUBLIC_TRAVEL_ENDPOINT?.replace(
    /\/$/,
    '',
  ) ?? 'https://router.project-osrm.org';
const TABLE_PATH = '/table/v1/driving/';

const DB_NAME = 'praia-travel';
const STORE = 'byBase';

/** Trocea `items` en grupos de `size`. */
export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/**
 * Destinos para los que merece la pena pedir tiempo real: los que en línea recta ya
 * caen dentro (con margen) del presupuesto. Ordenados por cercanía para que los
 * primeros tramos —los que dominan el ranking— lleguen antes.
 */
export function candidatesWithin(
  base: LatLng,
  points: TravelPoint[],
  maxMin: number,
): TravelPoint[] {
  const budget = maxMin * 1.4 + 10; // OSRM real puede diferir de la estimación: margen holgado
  return points
    .map((p) => ({ p, min: roughDriveMinutes(base, p) }))
    .filter((x) => x.min <= budget)
    .sort((a, b) => a.min - b.min)
    .map((x) => x.p);
}

/** URL OSRM Table con la base como única `source` y los destinos como el resto. */
export function buildTableUrl(base: LatLng, dests: TravelPoint[]): string {
  const coords = [base, ...dests].map((p) => `${p.lon},${p.lat}`).join(';');
  return `${ENDPOINT}${TABLE_PATH}${coords}?sources=0&annotations=duration`;
}

/**
 * Respuesta OSRM Table → mapa destinoId → minutos. `durations[0]` es la fila de la
 * base: `[0, t1, t2, …]` en segundos (índice 0 = la propia base). Ignora nulos.
 */
export function parseTable(json: unknown, dests: TravelPoint[]): Record<string, number> {
  const row = (json as { durations?: (number | null)[][] } | null)?.durations?.[0];
  const out: Record<string, number> = {};
  if (!Array.isArray(row)) return out;
  dests.forEach((d, i) => {
    const secs = row[i + 1];
    if (typeof secs === 'number' && Number.isFinite(secs)) out[d.id] = Math.round(secs / 60);
  });
  return out;
}

/** Clave de caché: base redondeada a ~1 km para reutilizar entre puntos próximos. */
function baseKey(base: LatLng): string {
  return `${base.lat.toFixed(2)},${base.lon.toFixed(2)}`;
}

async function openCache(): Promise<IDBPDatabase | null> {
  try {
    return await openDB(DB_NAME, 1, {
      upgrade(d) {
        d.createObjectStore(STORE);
      },
    });
  } catch {
    return null; // IndexedDB no disponible (modo privado, SSR…): seguimos sin caché
  }
}

async function fetchTable(
  base: LatLng,
  dests: TravelPoint[],
  signal?: AbortSignal,
): Promise<Record<string, number>> {
  const res = await fetch(buildTableUrl(base, dests), { signal: signal ?? null });
  if (!res.ok) throw new Error(`OSRM respondió ${res.status}`);
  return parseTable(await res.json(), dests);
}

/**
 * Tiempos reales base→destino para la base libre. Preselecciona por cercanía,
 * trocea, cachea por base en IndexedDB (pide solo lo que falte) y tolera fallos
 * parciales: los tramos que fallen se omiten y el ranking cae a la estimación.
 */
export async function fetchCustomTravel(
  base: LatLng,
  points: TravelPoint[],
  opts: FetchOptions = {},
): Promise<TravelResult> {
  const { maxMin = DEFAULT_MAX_MIN, signal, onProgress } = opts;
  const wanted = candidatesWithin(base, points, maxMin);
  const key = baseKey(base);

  const cache = await openCache();
  let cached: Record<string, number> = {};
  if (cache) {
    try {
      cached = ((await cache.get(STORE, key)) as Record<string, number> | undefined) ?? {};
    } catch {
      cached = {};
    }
  }

  const minutes: Record<string, number> = { ...cached };
  const missing = wanted.filter((p) => minutes[p.id] == null);
  if (onProgress && Object.keys(cached).length) onProgress({ ...minutes });

  let partial = false;
  for (const group of chunk(missing, CHUNK)) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    try {
      Object.assign(minutes, await fetchTable(base, group, signal));
      onProgress?.({ ...minutes });
    } catch (err) {
      if (signal?.aborted) throw err;
      partial = true; // tramo fallido: esos destinos quedan a la estimación en línea recta
    }
  }

  if (cache && missing.length) {
    try {
      await cache.put(STORE, minutes, key);
    } catch {
      // caché best-effort: si no se puede persistir, no pasa nada
    }
  }
  return { minutes, partial };
}
