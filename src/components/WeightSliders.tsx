import { RatingControl } from './RatingControl';
import type { Dict } from '@/i18n';
import type { Pesos } from '@/lib/core/types';

const KEYS: (keyof Pesos)[] = [
  'clima',
  'cercania',
  'solEfectivo',
  'tempAgua',
  'masificacion',
  'servicios',
  'dificultadFit',
  'circular',
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
      <div className="weights-grid">
        {KEYS.map((k) => (
          <RatingControl
            key={k}
            label={dict.factors[k]}
            value={pesos[k]}
            onChange={(v) => onChange({ ...pesos, [k]: v })}
          />
        ))}
      </div>
      <p className="muted sliders-hint">{dict.sliders.hint}</p>
    </section>
  );
}
