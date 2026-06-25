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

  if (v.veredicto === 'playa' && beachBits) return <>🏖️ {beachBits}</>;
  if (v.veredicto === 'montana' && routeBits) return <>🥾 {routeBits}</>;
  // ambas
  return (
    <>
      🏖️ {beachBits}
      <br />
      🥾 {routeBits}
      <br />
      <span className="muted">{dict.verdict.tie}</span>
    </>
  );
}

export function VerdictCard({ verdict, dict }: { verdict: VerdictResult; dict: Dict }) {
  const title =
    verdict.veredicto === 'playa'
      ? dict.verdict.playa
      : verdict.veredicto === 'montana'
        ? dict.verdict.montana
        : verdict.veredicto === 'ambas'
          ? dict.verdict.ambas
          : dict.verdict.ninguna;

  return (
    <section className="card verdict" data-kind={verdict.veredicto}>
      <div className="verdict-eyebrow">{dict.verdict.heading}</div>
      <h2 className="verdict-title">{title}</h2>
      <p className="verdict-why">{why(verdict, dict)}</p>
    </section>
  );
}
