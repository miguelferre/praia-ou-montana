import type { Dict } from '@/i18n';
import type { ScoredItem } from '@/lib/core/result';
import type { Base } from '@/lib/core/types';
import { hhmm, round, scoreColor } from '@/lib/ui/format';

function mapsDirUrl(base: Base, lat: number, lon: number): string {
  return `https://www.google.com/maps/dir/?api=1&origin=${base.lat},${base.lon}&destination=${lat},${lon}&travelmode=driving`;
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="stat">
      <div className="k">{k}</div>
      <div className="v">{v}</div>
    </div>
  );
}

function Breakdown({ item, dict }: { item: ScoredItem; dict: Dict }) {
  return (
    <div className="breakdown">
      {item.score.breakdown.map((b) => {
        const label = dict.factors[b.key as keyof Dict['factors']] ?? b.label;
        const pct = round(b.value * 100);
        return (
          <div className="bd-row" key={b.key}>
            <span className="muted">{label}</span>
            <span className="bd-bar">
              <span className="bd-fill" style={{ width: `${pct}%` }} />
            </span>
            <span style={{ textAlign: 'right' }}>{pct}</span>
          </div>
        );
      })}
    </div>
  );
}

export function DestinationCard({
  item,
  base,
  dict,
}: {
  item: ScoredItem;
  base: Base;
  dict: Dict;
}) {
  if (item.kind === 'playa') {
    const p = item.playa;
    return (
      <section className="card detail">
        <span
          className="score-badge"
          style={{ background: scoreColor(item.score.total), float: 'right' }}
        >
          {round(item.score.total)}
        </span>
        <h3>{p.nombre}</h3>
        <div className="muted">{p.concello}</div>
        <div className="detail-grid">
          <Stat k={dict.card.travel} v={`${item.travelMin} min`} />
          {item.tempAguaC !== undefined && (
            <Stat k={dict.card.water} v={`${round(item.tempAguaC)}°`} />
          )}
          {item.effectiveSunsetIso && (
            <Stat k={dict.card.sunset} v={hhmm(item.effectiveSunsetIso)} />
          )}
          {p.longitudM !== undefined && <Stat k="Longitud" v={`${p.longitudM} m`} />}
          {p.chiringuitosCount !== undefined && (
            <Stat k={dict.factors.servicios} v={`${p.chiringuitosCount}`} />
          )}
        </div>
        <div>
          {p.banderaAzul && <span className="tag">Bandera azul</span>}{' '}
          {p.pmr && (p.pmr.rampa || p.pmr.sillaAnfibia) && <span className="tag">PMR</span>}{' '}
          {p.longitudM !== undefined && <span className="tag">{dict.card.crowdEstimate}</span>}
        </div>
        <Breakdown item={item} dict={dict} />
        <div className="actions">
          <a
            className="btn primary"
            href={mapsDirUrl(base, p.lat, p.lon)}
            target="_blank"
            rel="noreferrer"
          >
            {dict.card.directions}
          </a>
        </div>
      </section>
    );
  }

  const r = item.ruta;
  return (
    <section className="card detail">
      <span
        className="score-badge"
        style={{ background: scoreColor(item.score.total), float: 'right' }}
      >
        {round(item.score.total)}
      </span>
      <h3>{r.nombre}</h3>
      <div className="muted">{r.concello}</div>
      <div className="detail-grid">
        <Stat k={dict.card.travel} v={`${item.travelMin} min`} />
        <Stat k="km" v={`${r.km}`} />
        <Stat k={dict.card.elevation} v={`${r.desnivelPosM} m`} />
        <Stat k="Tipo" v={r.tipo === 'circular' ? dict.card.circular : dict.card.linear} />
        <Stat k="Dificultad" v={r.dificultad} />
      </div>
      <Breakdown item={item} dict={dict} />
      <div className="actions">
        {r.wikilocUrl && (
          <a className="btn primary" href={r.wikilocUrl} target="_blank" rel="noreferrer">
            {dict.card.wikiloc}
          </a>
        )}
        <a
          className="btn"
          href={mapsDirUrl(base, r.latInicio, r.lonInicio)}
          target="_blank"
          rel="noreferrer"
        >
          {dict.card.directions}
        </a>
      </div>
    </section>
  );
}
