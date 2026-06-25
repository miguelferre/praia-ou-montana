/** Utilidades de presentación (puras). */

/** Color de la puntuación: interpola rojo → ámbar → verde según total 0..100. */
export function scoreColor(total: number): string {
  const t = Math.max(0, Math.min(100, total)) / 100;
  const hue = t < 0.5 ? 6 + (45 - 6) * (t / 0.5) : 45 + (140 - 45) * ((t - 0.5) / 0.5);
  return `hsl(${Math.round(hue)} 62% 44%)`;
}

/** Hora local HH:MM (formato 24 h) de un ISO. */
export function hhmm(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

export function round(value: number, decimals = 0): number {
  const f = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * f) / f;
}
