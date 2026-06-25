import type { LatLng } from './types';

const EARTH_RADIUS_KM = 6371;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Distancia Haversine en km entre dos coordenadas. */
export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Estimación grosera de minutos en coche a partir de la distancia en línea recta.
 * Solo es un *fallback* cuando no hay tiempo de viaje precalculado (la ingesta lo
 * sustituye por el valor real de OpenRouteService). Asume una media de 65 km/h y
 * un factor 1.3 de sinuosidad típico de las carreteras gallegas.
 */
export function roughDriveMinutes(a: LatLng, b: LatLng): number {
  const km = haversineKm(a, b) * 1.3;
  return Math.round((km / 65) * 60);
}
