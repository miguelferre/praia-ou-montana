import type { Score } from './scoring';
import type { Playa, Ruta, TideEvent } from './types';

/** Playa puntuada lista para mapa/lista/ficha. */
export interface ScoredPlaya {
  kind: 'playa';
  playa: Playa;
  score: Score;
  travelMin: number;
  /** Puesta efectiva (ISO) para la ficha. */
  effectiveSunsetIso?: string;
  /** Temperatura del agua (°C) para el marcador del mapa. */
  tempAguaC?: number;
  /** Índice UV máximo del día (informativo, no puntúa). */
  uvIndex?: number;
  /** Mareas del día (informativo, no puntúa). */
  mareas?: TideEvent[];
}

/** Ruta puntuada lista para mapa/lista/ficha. */
export interface ScoredRuta {
  kind: 'ruta';
  ruta: Ruta;
  score: Score;
  travelMin: number;
  /** Índice UV máximo del día (informativo, no puntúa). */
  uvIndex?: number;
}

export type ScoredItem = ScoredPlaya | ScoredRuta;
