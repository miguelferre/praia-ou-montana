/** Utilidades de presentación (puras). */

/** Color de la puntuación (OKLCH): interpola rojo → ámbar → verde según total 0..100. */
export function scoreColor(total: number): string {
  const t = Math.max(0, Math.min(100, total)) / 100;
  // Tono: rojo (25) → ámbar (70) → verde (150), perceptualmente uniforme en OKLCH.
  const hue = t < 0.5 ? 25 + (70 - 25) * (t / 0.5) : 70 + (150 - 70) * ((t - 0.5) / 0.5);
  return `oklch(0.6 0.15 ${Math.round(hue)})`;
}

/** Hora local HH:MM (formato 24 h) de un ISO. */
export function hhmm(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

export function round(value: number, decimals = 0): number {
  const f = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * f) / f;
}
