import type { ReactNode } from 'react';
import type { Dict } from '@/i18n';
import type { VerdictResult } from '@/lib/verdict';
import { hhmm, round } from '@/lib/ui/format';

function why(v: VerdictResult, dict: Dict): ReactNode {
  const { beach, route } = v;
  if (v.veredicto === 'ninguna') return dict.panel.noResults;

  const beachBits = beach ? (
    <>
      <b>{beach.playa.nombre}</b> ({round(beach.score.total)})
      {beach.effectiveSunsetIso ? ` · ${dict.card.sunset} ${hhmm(beach.effectiveSunsetIso)}` : ''}
      {beach.tempAguaC !== undefined ? ` · ${dict.verdict.water} ${round(beach.tempAguaC)}°` : ''}
      {` · ${beach.travelMin} ${dict.verdict.minCar}`}
    </>
  ) : null;

  const routeBits = route ? (
    <>
      <b>{route.ruta.nombre}</b> ({round(route.score.total)}) · {route.ruta.km} km ·{' '}
      {route.ruta.desnivelPosM} m {dict.card.elevation} · {route.travelMin} {dict.verdict.minCar}
    </>
  ) : null;

  if (v.veredicto === 'playa' && beachBits) return beachBits;
  if (v.veredicto === 'montana' && routeBits) return routeBits;
  return (
    <>
      {beachBits}
      <br />
      {routeBits}
      <br />
      <span className="tie-note">{dict.verdict.tie}</span>
    </>
  );
}

/** Fecha corta (dd/m) de un ISO YYYY-MM-DD; el mediodía evita saltos de zona. */
function shortDate(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'numeric',
  });
}

export function VerdictCard({
  verdict,
  dict,
  stale = false,
  forecastDate,
}: {
  verdict: VerdictResult;
  dict: Dict;
  /** El forecast servido no es de hoy: se avisa para no vender una meteo caducada como "hoy". */
  stale?: boolean;
  forecastDate?: string;
}) {
  const title =
    verdict.veredicto === 'playa'
      ? dict.verdict.playa
      : verdict.veredicto === 'montana'
        ? dict.verdict.montana
        : verdict.veredicto === 'ambas'
          ? dict.verdict.ambas
          : dict.verdict.ninguna;

  return (
    <section className="verdict" data-kind={verdict.veredicto}>
      <div className="verdict-scrim" aria-hidden="true" />
      <div className="verdict-content">
        <p className="verdict-eyebrow">{dict.verdict.heading}</p>
        {stale && forecastDate && (
          <p className="verdict-stale" role="status">
            🕒 {shortDate(forecastDate)} — {dict.verdict.staleNote}
          </p>
        )}
        <h2 className="verdict-title">{title}</h2>
        <div className="verdict-why">{why(verdict, dict)}</div>
        {verdict.seasonalHandicap > 0 && verdict.beach && verdict.route && (
          <p className="verdict-handicap">
            −{verdict.seasonalHandicap} {dict.verdict.handicap}
          </p>
        )}
      </div>
    </section>
  );
}
