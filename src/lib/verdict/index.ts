/**
 * Veredicto "playa o montaña". Capa fina que compone el mejor resultado de cada
 * módulo. Importa solo tipos de `core` (los mejores ya vienen puntuados); no
 * conoce los detalles de scoring de playas ni de rutas.
 */
import type { ScoredPlaya, ScoredRuta } from '@/lib/core/result';
import type { Modo } from '@/lib/core/types';

export type Veredicto = 'playa' | 'montana' | 'ambas' | 'ninguna';

export interface VerdictContext {
  modo: Modo;
  date: Date;
}

export interface VerdictResult {
  veredicto: Veredicto;
  beach?: ScoredPlaya;
  route?: ScoredRuta;
  /** Margen ajustado (playa − ruta) tras el gate estacional. */
  margin: number;
  /** Desventaja estacional aplicada a la playa (puntos restados). */
  seasonalHandicap: number;
}

/** Umbral de empate: por debajo, el día sirve para ambas. */
const TIE = 8;

/**
 * Desventaja de la playa por agua fría o temporada (regla explícita y legible,
 * no un peso oculto): en invierno la playa parte con desventaja.
 */
export function seasonalBeachHandicap(beach: ScoredPlaya | undefined, date: Date): number {
  let handicap = 0;
  const month = date.getMonth(); // 0 = enero
  if (month <= 1 || month === 11)
    handicap += 8; // dic–feb
  else if (month === 2 || month === 10) handicap += 4; // mar, nov

  const agua = beach?.tempAguaC;
  if (agua !== undefined) {
    if (agua < 15) handicap += 10;
    else if (agua < 17) handicap += 5;
  }
  return handicap;
}

/** Decide el veredicto del día a partir del mejor de cada tipo. */
export function decide(
  beach: ScoredPlaya | undefined,
  route: ScoredRuta | undefined,
  ctx: VerdictContext,
): VerdictResult {
  const seasonalHandicap = seasonalBeachHandicap(beach, ctx.date);

  if (ctx.modo === 'solo_playa') {
    return {
      veredicto: beach ? 'playa' : 'ninguna',
      ...(beach ? { beach } : {}),
      margin: 0,
      seasonalHandicap,
    };
  }
  if (ctx.modo === 'solo_ruta') {
    return {
      veredicto: route ? 'montana' : 'ninguna',
      ...(route ? { route } : {}),
      margin: 0,
      seasonalHandicap,
    };
  }

  if (!beach && !route) {
    return { veredicto: 'ninguna', margin: 0, seasonalHandicap };
  }

  const beachScore = beach ? beach.score.total - seasonalHandicap : Number.NEGATIVE_INFINITY;
  const routeScore = route ? route.score.total : Number.NEGATIVE_INFINITY;
  const margin = beachScore - routeScore;

  let veredicto: Veredicto;
  if (beach && route && Math.abs(margin) < TIE) veredicto = 'ambas';
  else veredicto = margin >= 0 ? 'playa' : 'montana';

  return {
    veredicto,
    ...(beach ? { beach } : {}),
    ...(route ? { route } : {}),
    margin,
    seasonalHandicap,
  };
}
