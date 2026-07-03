import type { Dict } from '@/i18n';
import type { ScoredItem } from '@/lib/core/result';
import type { Base, TideEvent } from '@/lib/core/types';
import { hhmm, round, scoreColor, uvLevel } from '@/lib/ui/format';

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

/** Índice UV con su nivel de riesgo (OMS). Informativo: no entra en la puntuación. */
function UvStat({ uv, dict }: { uv: number | undefined; dict: Dict }) {
  if (uv === undefined) return null;
  return <Stat k={dict.card.uv} v={`${round(uv)} · ${dict.card.uvLevels[uvLevel(uv)]}`} />;
}

/** Pleamares y bajamares del día (Open-Meteo). Informativo: no entra en la puntuación. */
function Tides({ mareas, dict }: { mareas: TideEvent[] | undefined; dict: Dict }) {
  if (!mareas || mareas.length === 0) return null;
  return (
    <div className="tides">
      <span className="k">{dict.card.tides}</span>
      {mareas.map((m) => {
        const label = m.type === 'high' ? dict.card.highTide : dict.card.lowTide;
        return (
          <span
            className={`tide ${m.type === 'high' ? 'is-high' : 'is-low'}`}
            key={m.time}
            title={label}
          >
            <span className="arrow" aria-hidden="true">
              {m.type === 'high' ? '▲' : '▼'}
            </span>{' '}
            {hhmm(m.time)}
            {m.heightM !== undefined && <span className="h"> {m.heightM.toFixed(1)} m</span>}
          </span>
        );
      })}
      <span className="tides-note">· {dict.card.tidesEstimate}</span>
    </div>
  );
}

function Breakdown({ item, dict }: { item: ScoredItem; dict: Dict }) {
  // El desglose explica el número del badge: cada fila muestra los PUNTOS que ese
  // factor aporta a la nota (los `points` suman el total). La barra es esa
  // contribución como fracción de la nota, así el desglose y el badge cuadran
  // (antes se pintaba el valor normalizado suelto, que no sumaba el total).
  const total = item.score.total;
  return (
    <div className="breakdown">
      {item.score.breakdown.map((b) => {
        const label = dict.factors[b.key as keyof Dict['factors']] ?? b.label;
        const share = total > 0 ? (b.points / total) * 100 : 0;
        return (
          <div className="bd-row" key={b.key}>
            <span className="muted">{label}</span>
            <span className="bd-bar">
              <span className="bd-fill" style={{ width: `${round(share)}%` }} />
            </span>
            <span style={{ textAlign: 'right' }}>{round(b.points)}</span>
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
          <UvStat uv={item.uvIndex} dict={dict} />
          {p.longitudM !== undefined && <Stat k={dict.card.length} v={`${p.longitudM} m`} />}
          {p.chiringuitosCount !== undefined && (
            <Stat k={dict.factors.servicios} v={`${p.chiringuitosCount}`} />
          )}
        </div>
        <Tides mareas={item.mareas} dict={dict} />
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
        <Stat k={dict.card.km} v={`${r.km}`} />
        <Stat k={dict.card.elevation} v={`${r.desnivelPosM} m`} />
        <Stat
          k={dict.card.type}
          v={r.tipo === 'circular' ? dict.card.circular : dict.card.linear}
        />
        <Stat k={dict.card.difficulty} v={dict.card.difficultyLevels[r.dificultad]} />
        <UvStat uv={item.uvIndex} dict={dict} />
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
