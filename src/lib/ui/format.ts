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

/** Color neutro para un marcador sin dato en la métrica elegida (gris azulado). */
export const NEUTRAL_MARKER = 'oklch(0.72 0.02 240)';

/**
 * Escala de AZULES para la temperatura del agua, DINÁMICA por día: se normaliza sobre el
 * rango `[min,max]` de las playas visibles (lo calcula quien llama, con un span mínimo
 * para no exagerar diferencias triviales). Así el gradiente completo cubre el rango real
 * del día —que suele ser de pocos grados— y **1 °C se distingue** de un vistazo (fría =
 * cian claro apagado; cálida = azul profundo e intenso). L tope 0.72 para que el texto
 * blanco (con sombra) siga legible.
 */
export function waterColor(tempAguaC: number, min: number, max: number): string {
  const span = max - min;
  const t = span > 0 ? Math.max(0, Math.min(1, (tempAguaC - min) / span)) : 0.5;
  const l = 0.72 - 0.28 * t;
  const c = 0.05 + 0.12 * t;
  const h = 245 - 25 * t;
  return `oklch(${l.toFixed(3)} ${c.toFixed(3)} ${h.toFixed(1)})`;
}

/**
 * Escala de ATARDECER (dorado → naranja) para la hora de ocaso. Recibe `t` ya
 * normalizado [0,1] dentro del rango de ocasos visibles (más tarde = más naranja), no
 * la hora absoluta, porque ese rango cambia con la estación.
 */
export function sunsetColor(t: number): string {
  const u = Math.max(0, Math.min(1, t));
  const l = 0.72 - 0.14 * u;
  const c = 0.13 + 0.04 * u;
  const h = 88 - 43 * u;
  return `oklch(${l.toFixed(3)} ${c.toFixed(3)} ${h.toFixed(1)})`;
}

/** Hora HH:MM (24 h) de un ISO, en la zona de Galicia. Fijar la zona evita que un
 *  visitante desde otro huso vea el ocaso o las mareas en su hora local sin avisar. */
export function hhmm(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Madrid',
  });
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
