import type { Dict } from '@/i18n';
import type { ScoredPlaya, ScoredRuta } from '@/lib/core/result';
import { hhmm, round, scoreColor } from '@/lib/ui/format';

export type Tab = 'playa' | 'ruta';

interface Props {
  tab: Tab;
  onTab: (t: Tab) => void;
  playas: ScoredPlaya[];
  rutas: ScoredRuta[];
  activeId: string | null;
  onSelect: (id: string) => void;
  dict: Dict;
  showTabs: boolean;
}

export function DestinationList(props: Props) {
  const { tab, onTab, playas, rutas, activeId, onSelect, dict, showTabs } = props;
  const items = tab === 'playa' ? playas : rutas;

  return (
    <div>
      {showTabs && (
        <div
          className="panel-tabs seg"
          role="group"
          aria-label={`${dict.panel.beaches} / ${dict.panel.routes}`}
        >
          <button aria-pressed={tab === 'playa'} onClick={() => onTab('playa')}>
            {dict.panel.beaches}
          </button>
          <button aria-pressed={tab === 'ruta'} onClick={() => onTab('ruta')}>
            {dict.panel.routes}
          </button>
        </div>
      )}

      {items.length === 0 ? (
        <p className="muted">{dict.panel.noResults}</p>
      ) : (
        <div className="list">
          {items.map((it, i) =>
            it.kind === 'playa' ? (
              <BeachRow
                key={it.playa.id}
                item={it}
                rank={i + 1}
                active={activeId === it.playa.id}
                onSelect={onSelect}
                dict={dict}
              />
            ) : (
              <RouteRow
                key={it.ruta.id}
                item={it}
                rank={i + 1}
                active={activeId === it.ruta.id}
                onSelect={onSelect}
                dict={dict}
              />
            ),
          )}
        </div>
      )}
    </div>
  );
}

function Badge({ total }: { total: number }) {
  return (
    <span className="score-badge" style={{ background: scoreColor(total) }}>
      {round(total)}
    </span>
  );
}

function BeachRow({
  item,
  rank,
  active,
  onSelect,
  dict,
}: {
  item: ScoredPlaya;
  rank: number;
  active: boolean;
  onSelect: (id: string) => void;
  dict: Dict;
}) {
  return (
    <button
      className={`dest${active ? ' is-active' : ''}`}
      onClick={() => onSelect(item.playa.id)}
      aria-pressed={active}
    >
      <Badge total={item.score.total} />
      <span>
        <span className="dest-name">{item.playa.nombre}</span>
        <span className="dest-meta">
          <span>
            {item.travelMin} {dict.card.travel}
          </span>
          {item.tempAguaC !== undefined && (
            <span>
              {dict.card.water} {round(item.tempAguaC)}°
            </span>
          )}
          {item.effectiveSunsetIso && (
            <span>
              {dict.card.sunset} {hhmm(item.effectiveSunsetIso)}
            </span>
          )}
        </span>
      </span>
      <span className="rank-num">#{rank}</span>
    </button>
  );
}

function RouteRow({
  item,
  rank,
  active,
  onSelect,
  dict,
}: {
  item: ScoredRuta;
  rank: number;
  active: boolean;
  onSelect: (id: string) => void;
  dict: Dict;
}) {
  return (
    <button
      className={`dest${active ? ' is-active' : ''}`}
      onClick={() => onSelect(item.ruta.id)}
      aria-pressed={active}
    >
      <Badge total={item.score.total} />
      <span>
        <span className="dest-name">{item.ruta.nombre}</span>
        <span className="dest-meta">
          <span>
            {item.travelMin} {dict.card.travel}
          </span>
          <span>{item.ruta.km} km</span>
          <span>
            {item.ruta.desnivelPosM} m {dict.card.elevation}
          </span>
          <span>{item.ruta.tipo === 'circular' ? dict.card.circular : dict.card.linear}</span>
        </span>
      </span>
      <span className="rank-num">#{rank}</span>
    </button>
  );
}
