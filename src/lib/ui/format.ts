/** Utilidades de presentación (puras). */

/**
 * Color de la puntuación (OKLCH): rojo → naranja → verde. Anclado al rango REAL
 * en que caen las notas (≈35–72), no a 0–100, para que un 52 y un 63 se distingan
 * de un vistazo en vez de salir todos del mismo marrón.
 */
export function scoreColor(total: number): string {
  const t = Math.max(0, Math.min(1, (total - 35) / 37));
  const hue = 25 + 115 * t; // 25 rojo → 140 verde
  return `oklch(0.62 0.16 ${Math.round(hue)})`;
}

/** Hora local HH:MM (formato 24 h) de un ISO. */
export function hhmm(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

export function round(value: number, decimals = 0): number {
  const f = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * f) / f;
}

export type TravelState = 'idle' | 'loading' | 'real' | 'approx';

/**
 * Clave de aviso de la base libre según el estado del cálculo de tiempos. Cuando los
 * tiempos son reales pero el máximo pedido supera la cobertura de la preselección
 * (`coverageMin`), se degrada a `baseRealPartial`: los destinos más lejanos van a
 * estimación, así que "reales" no debe prometer de más (F11). `idle` no muestra aviso.
 */
export function baseTravelHint(
  state: TravelState,
  maxViajeMin: number,
  coverageMin: number,
): 'baseCalculating' | 'baseReal' | 'baseRealPartial' | 'baseApprox' | null {
  switch (state) {
    case 'loading':
      return 'baseCalculating';
    case 'real':
      return maxViajeMin > coverageMin ? 'baseRealPartial' : 'baseReal';
    case 'approx':
      return 'baseApprox';
    default:
      return null;
  }
}

export type UvLevel = 'low' | 'moderate' | 'high' | 'veryHigh' | 'extreme';

/** Nivel de riesgo UV según la escala OMS (0–2 bajo … 11+ extremo). */
export function uvLevel(uv: number): UvLevel {
  if (uv < 3) return 'low';
  if (uv < 6) return 'moderate';
  if (uv < 8) return 'high';
  if (uv < 11) return 'veryHigh';
  return 'extreme';
}
