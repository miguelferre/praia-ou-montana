/**
 * Geocoding para la "base libre" (fase pública): traduce un texto o unas coordenadas
 * GPS a un punto de partida. Usa Nominatim (OpenStreetMap, sin key), solo en respuesta
 * a una acción explícita del usuario (buscar / usar mi ubicación), nunca autocompletar,
 * para respetar su política de uso. Capa de E/S, como `load.ts` (no es lib pura).
 */
export interface GeoPlace {
  nombre: string;
  lat: number;
  lon: number;
}

const SEARCH_URL = 'https://nominatim.openstreetmap.org/search';
const REVERSE_URL = 'https://nominatim.openstreetmap.org/reverse';
// Viewbox de Galicia para priorizar resultados locales (no acotado: permite fuera).
const GALICIA_VIEWBOX = '-9.6,43.9,-6.7,41.8';

function shortName(displayName: string): string {
  return displayName.split(',')[0]?.trim() || displayName;
}

/** Geocodifica un texto a candidatos (máx. 5), sesgados a Galicia. */
export async function geocode(query: string): Promise<GeoPlace[]> {
  const url = new URL(SEARCH_URL);
  url.search = new URLSearchParams({
    q: query,
    format: 'jsonv2',
    limit: '5',
    countrycodes: 'es',
    'accept-language': 'gl,es',
    viewbox: GALICIA_VIEWBOX,
  }).toString();
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Geocoding falló (${res.status})`);
  const data = (await res.json()) as Array<{ display_name: string; lat: string; lon: string }>;
  return data
    .map((d) => ({ nombre: shortName(d.display_name), lat: Number(d.lat), lon: Number(d.lon) }))
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon));
}

/** Nombre legible de un punto GPS (para "usar mi ubicación"); tolerante a fallos. */
export async function reverseGeocode(lat: number, lon: number, fallback: string): Promise<string> {
  try {
    const url = new URL(REVERSE_URL);
    url.search = new URLSearchParams({
      lat: String(lat),
      lon: String(lon),
      format: 'jsonv2',
      zoom: '12',
      'accept-language': 'gl,es',
    }).toString();
    const res = await fetch(url);
    if (!res.ok) return fallback;
    const a = ((await res.json()) as { address?: Record<string, string> }).address ?? {};
    return a.town || a.village || a.city || a.municipality || a.county || fallback;
  } catch {
    return fallback;
  }
}
