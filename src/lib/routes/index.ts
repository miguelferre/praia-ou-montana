/**
 * Módulo de RUTAS. Construye los factores específicos de senderismo y rankea.
 * Importa solo de `@/lib/core`. NO importa `@/lib/beaches`.
 */
import { roughDriveMinutes } from '@/lib/core/geo';
import { clamp01, linearInverse, score, type Factor } from '@/lib/core/scoring';
import type { ScoredRuta } from '@/lib/core/result';
import type { Base, Forecast, ForecastIndex, Ruta, UserPrefs } from '@/lib/core/types';

export interface RouteContext {
  base: Base;
  date: Date;
  forecast: ForecastIndex;
  prefs: UserPrefs;
}

export interface RouteRanking {
  ranked: ScoredRuta[];
  best?: ScoredRuta;
}

/**
 * Bondad climática para RUTA (0..1): confort en banda templada (ideal ~16 °C),
 * penaliza la lluvia con más peso que en playa, y el viento moderadamente.
 */
export function climaRuta(f: Forecast): number {
  const confortTemp = clamp01(1 - Math.abs(f.tempMaxC - 16) / 14);
  const lluvia = linearInverse(f.precipProb, 10, 70);
  const nubes = linearInverse(f.nubosidad, 30, 100);
  const viento = linearInverse(f.vientoKmh, 15, 45);
  return clamp01(0.35 * confortTemp + 0.4 * lluvia + 0.1 * nubes + 0.15 * viento);
}

/** Ajuste de la ruta a la preferencia de dureza (0..1): km y desnivel objetivo. */
function dificultadFit(r: Ruta, prefs: UserPrefs): number {
  const { kmObjetivo, desnivelObjetivo } = prefs.rutaPref;
  const km = linearInverse(Math.abs(r.km - kmObjetivo), 0, Math.max(kmObjetivo, 1));
  const desn = linearInverse(
    Math.abs(r.desnivelPosM - desnivelObjetivo),
    0,
    Math.max(desnivelObjetivo, 1),
  );
  return clamp01(0.5 * km + 0.5 * desn);
}

export function rankRoutes(rutas: Ruta[], ctx: RouteContext): RouteRanking {
  const { base, date: _date, forecast, prefs } = ctx;
  const { pesos } = prefs;

  const ranked: ScoredRuta[] = [];
  for (const ruta of rutas) {
    const travelMin =
      ruta.travel[base.id]?.cocheMin ??
      roughDriveMinutes(base, {
        lat: ruta.latInicio,
        lon: ruta.lonInicio,
      });
    if (travelMin > prefs.maxViajeMin) continue;
    const f = forecast[ruta.id];
    const factors: Factor[] = [
      {
        key: 'clima',
        label: 'Clima',
        weight: pesos.clima,
        value: f ? climaRuta(f) : 0.5,
      },
      {
        key: 'cercania',
        label: 'Cercanía',
        weight: pesos.cercania,
        value: linearInverse(travelMin, 0, prefs.maxViajeMin),
      },
      {
        key: 'dificultadFit',
        label: 'Dureza',
        weight: pesos.dificultadFit,
        value: dificultadFit(ruta, prefs),
      },
      {
        key: 'circular',
        label: 'Circular',
        weight: pesos.circular,
        value: ruta.tipo === 'circular' ? 1 : 0,
      },
    ];
    ranked.push({
      kind: 'ruta',
      ruta,
      score: score(factors),
      travelMin,
      ...(f?.uvIndex !== undefined ? { uvIndex: f.uvIndex } : {}),
    });
  }

  ranked.sort((a, b) => b.score.total - a.score.total);
  const best = ranked[0];
  return best ? { ranked, best } : { ranked };
}
