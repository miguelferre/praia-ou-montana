import type { Score } from './scoring';
import type { Playa, Ruta } from './types';

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
}

/** Ruta puntuada lista para mapa/lista/ficha. */
export interface ScoredRuta {
  kind: 'ruta';
  ruta: Ruta;
  score: Score;
  travelMin: number;
}

export type ScoredItem = ScoredPlaya | ScoredRuta;
