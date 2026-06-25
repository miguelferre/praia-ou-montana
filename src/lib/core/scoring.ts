/**
 * Núcleo de scoring genérico (sin dominio): combina factores normalizados en una
 * puntuación 0..100 con suma ponderada. Los módulos `beaches` y `routes` construyen
 * sus `Factor[]` y llaman a `score()`. Mantenerlo explicable es un requisito de
 * producto (PAIR): cada puntuación expone su desglose.
 */

/** Factor ya normalizado a [0,1] con su peso y etiqueta legible. */
export interface Factor {
  key: string;
  /** Valor normalizado 0..1. */
  value: number;
  /** Peso relativo (se normaliza contra el resto). */
  weight: number;
  /** Etiqueta legible para el desglose mostrado al usuario. */
  label: string;
}

export interface ScoreBreakdownItem {
  key: string;
  label: string;
  /** Contribución en puntos al total (0..100). */
  points: number;
  /** Valor normalizado del factor (0..1). */
  value: number;
  /** Peso efectivo usado. */
  weight: number;
}

export interface Score {
  /** Puntuación final 0..100. */
  total: number;
  breakdown: ScoreBreakdownItem[];
}

/** Recorta a [0,1]; trata NaN como 0 para no propagar basura a la UI. */
export function clamp01(x: number): number {
  if (Number.isNaN(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

/** Mapea `value` dentro de [min,max] a [0,1] linealmente (con recorte). */
export function linear(value: number, min: number, max: number): number {
  if (max === min) return 0;
  return clamp01((value - min) / (max - min));
}

/** Igual que `linear` pero invertido: min→1, max→0. */
export function linearInverse(value: number, min: number, max: number): number {
  return clamp01(1 - linear(value, min, max));
}

/**
 * Combina factores en una puntuación 0..100. El peso de cada factor se normaliza
 * contra la suma de pesos, de modo que añadir/quitar factores no rompe la escala.
 */
export function score(factors: Factor[]): Score {
  const totalWeight = factors.reduce((acc, f) => acc + Math.max(0, f.weight), 0);
  if (totalWeight <= 0) {
    return { total: 0, breakdown: [] };
  }
  const breakdown: ScoreBreakdownItem[] = factors.map((f) => {
    const weight = Math.max(0, f.weight);
    const value = clamp01(f.value);
    const points = ((value * weight) / totalWeight) * 100;
    return { key: f.key, label: f.label, points, value, weight };
  });
  const total = breakdown.reduce((acc, b) => acc + b.points, 0);
  return { total, breakdown };
}
