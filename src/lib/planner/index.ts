/**
 * Orquestador: rankea playas y rutas y emite el veredicto. Es la capa de
 * composición (igual que la UI), por lo que SÍ puede importar `beaches` y
 * `routes` a la vez — lo que no se permite es que esos dos se importen entre sí.
 */
import { rankBeaches, type BeachRanking } from '@/lib/beaches';
import { rankRoutes, type RouteRanking } from '@/lib/routes';
import { decide, type VerdictResult } from '@/lib/verdict';
import type { Base, ForecastIndex, Playa, Ruta, UserPrefs } from '@/lib/core/types';

export interface Catalog {
  playas: Playa[];
  rutas: Ruta[];
}

export interface PlanInput {
  catalog: Catalog;
  base: Base;
  date: Date;
  forecast: ForecastIndex;
  prefs: UserPrefs;
}

export interface Plan {
  beaches: BeachRanking;
  routes: RouteRanking;
  verdict: VerdictResult;
}

export function plan(input: PlanInput): Plan {
  const { catalog, base, date, forecast, prefs } = input;
  const ctx = { base, date, forecast, prefs };
  const beaches = rankBeaches(catalog.playas, ctx);
  const routes = rankRoutes(catalog.rutas, ctx);
  const verdict = decide(beaches.best, routes.best, { modo: prefs.modo, date });
  return { beaches, routes, verdict };
}
