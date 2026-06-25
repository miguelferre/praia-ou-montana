import { RatingControl } from './RatingControl';
import type { Dict } from '@/i18n';
import type { Pesos } from '@/lib/core/types';

type GroupTitle = 'groupCommon' | 'groupBeach' | 'groupRoute';

const GROUPS: { title: GroupTitle; keys: (keyof Pesos)[] }[] = [
  { title: 'groupCommon', keys: ['clima', 'cercania'] },
  { title: 'groupBeach', keys: ['solEfectivo', 'tempAgua', 'masificacion', 'servicios'] },
  { title: 'groupRoute', keys: ['dificultadFit', 'circular'] },
];

interface Props {
  pesos: Pesos;
  onChange: (p: Pesos) => void;
  onReset: () => void;
  dict: Dict;
}

export function WeightSliders({ pesos, onChange, onReset, dict }: Props) {
  return (
    <section className="card weights">
      <div className="weights-head">
        <h2 className="weights-title">{dict.sliders.title}</h2>
        <button className="btn btn-sm" onClick={onReset}>
          {dict.sliders.reset}
        </button>
      </div>
      {GROUPS.map((g) => (
        <div className="weights-group" data-group={g.title} key={g.title}>
          <h3 className="weights-group-title">{dict.sliders[g.title]}</h3>
          <div className="weights-grid">
            {g.keys.map((k) => (
              <RatingControl
                key={k}
                label={dict.factors[k]}
                value={pesos[k]}
                onChange={(v) => onChange({ ...pesos, [k]: v })}
                hint={dict.metodologia[k]}
              />
            ))}
          </div>
        </div>
      ))}
      <p className="muted sliders-hint">{dict.sliders.hint}</p>
    </section>
  );
}
