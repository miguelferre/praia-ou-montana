/**
 * Módulo de PLAYAS. Construye los factores específicos de playa y rankea.
 * Importa solo de `@/lib/core`. NO importa `@/lib/routes` (modularidad: permite
 * escindir una app de solo playas).
 */
import { computeSun } from '@/lib/core/sun';
import { roughDriveMinutes } from '@/lib/core/geo';
import { clamp01, linear, linearInverse, score, type Factor } from '@/lib/core/scoring';
import type { ScoredPlaya } from '@/lib/core/result';
import type { Base, Forecast, ForecastIndex, Playa, UserPrefs } from '@/lib/core/types';

export interface BeachContext {
  base: Base;
  date: Date;
  forecast: ForecastIndex;
  prefs: UserPrefs;
}

export interface BeachRanking {
  ranked: ScoredPlaya[];
  best?: ScoredPlaya;
}

/** Bondad climática para PLAYA (0..1): premia calor y sol, penaliza lluvia/nubes/viento. */
export function climaPlaya(f: Forecast): number {
  const temp = linear(f.tempMaxC, 16, 26);
  const lluvia = linearInverse(f.precipProb, 10, 80);
  const nubes = linearInverse(f.nubosidad, 20, 90);
  const viento = linearInverse(f.vientoKmh, 12, 40);
  return clamp01(0.4 * temp + 0.25 * lluvia + 0.2 * nubes + 0.15 * viento);
}

/** Proxy de masificación → comodidad (0..1): playa larga = más espacio; sin dato, neutro. */
function comodidadMasificacion(p: Playa): number {
  if (p.longitudM === undefined) return 0.5;
  return linear(p.longitudM, 100, 1500);
}

/** Servicios (0..1): chiringuitos/restauración cercana. Sin dato, neutro-bajo. */
function servicios(p: Playa): number {
  if (p.chiringuitosCount === undefined) return 0.4;
  return linear(p.chiringuitosCount, 0, 4);
}

/** Banda de confort de temperatura del agua (0..1). <14 °C nada; >=21 °C ideal. */
function confortAgua(tempAguaC: number | undefined): number {
  if (tempAguaC === undefined) return 0;
  return linear(tempAguaC, 14, 21);
}

/** ¿La playa cumple los filtros duros (viaje y PMR)? */
function pasaFiltros(p: Playa, travelMin: number, prefs: UserPrefs): boolean {
  if (travelMin > prefs.maxViajeMin) return false;
  if (prefs.requierePmr) {
    const pmr = p.pmr;
    if (!pmr) return false;
    if (!pmr.rampa && !pmr.sillaAnfibia) return false;
  }
  return true;
}

interface RawBeach {
  playa: Playa;
  forecast?: Forecast;
  travelMin: number;
  afternoonSunMinutes: number;
  effectiveSunsetIso: string;
  tempAguaC?: number;
}

/** Rankea las playas que pasan filtros. `sol_efectivo` se normaliza contra el mejor del set. */
export function rankBeaches(playas: Playa[], ctx: BeachContext): BeachRanking {
  const { base, date, forecast, prefs } = ctx;

  // Paso 1: métricas crudas solo de las que pasan filtros.
  const raw: RawBeach[] = [];
  for (const playa of playas) {
    const travelMin = playa.travel[base.id]?.cocheMin ?? roughDriveMinutes(base, playa);
    if (!pasaFiltros(playa, travelMin, prefs)) continue;
    const sun = computeSun(date, playa.lat, playa.lon, playa.horizonProfile);
    const f = forecast[playa.id];
    raw.push({
      playa,
      ...(f ? { forecast: f } : {}),
      travelMin,
      afternoonSunMinutes: sun.afternoonSunMinutes,
      effectiveSunsetIso: sun.effectiveSunset.toISOString(),
      ...(f?.tempAguaC !== undefined ? { tempAguaC: f.tempAguaC } : {}),
    });
  }

  const maxSun = raw.reduce((m, r) => Math.max(m, r.afternoonSunMinutes), 0);

  // Paso 2: factores y score.
  const ranked: ScoredPlaya[] = raw.map((r) => {
    const { pesos } = prefs;
    const factors: Factor[] = [
      {
        key: 'clima',
        label: 'Clima',
        weight: pesos.clima,
        value: r.forecast ? climaPlaya(r.forecast) : 0.5,
      },
      {
        key: 'cercania',
        label: 'Cercanía',
        weight: pesos.cercania,
        value: linearInverse(r.travelMin, 0, prefs.maxViajeMin),
      },
      {
        key: 'solEfectivo',
        label: 'Horas de sol',
        weight: pesos.solEfectivo,
        value: maxSun > 0 ? r.afternoonSunMinutes / maxSun : 0,
      },
      {
        key: 'tempAgua',
        label: 'Agua',
        weight: pesos.tempAgua,
        value: confortAgua(r.tempAguaC),
      },
      {
        key: 'masificacion',
        label: 'Espacio',
        weight: pesos.masificacion,
        value: comodidadMasificacion(r.playa),
      },
      {
        key: 'servicios',
        label: 'Servicios',
        weight: pesos.servicios,
        value: servicios(r.playa),
      },
    ];
    const scored: ScoredPlaya = {
      kind: 'playa',
      playa: r.playa,
      score: score(factors),
      travelMin: r.travelMin,
      effectiveSunsetIso: r.effectiveSunsetIso,
      ...(r.tempAguaC !== undefined ? { tempAguaC: r.tempAguaC } : {}),
      ...(r.forecast?.uvIndex !== undefined ? { uvIndex: r.forecast.uvIndex } : {}),
      ...(r.forecast?.mareas !== undefined ? { mareas: r.forecast.mareas } : {}),
    };
    return scored;
  });

  ranked.sort((a, b) => b.score.total - a.score.total);
  const best = ranked[0];
  return best ? { ranked, best } : { ranked };
}
