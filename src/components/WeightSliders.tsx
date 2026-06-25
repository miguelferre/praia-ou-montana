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

const OPTS = [1, 2, 3, 4, 5];

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
          <label className="weight-field" key={k}>
            <span>{dict.factors[k]}</span>
            <select
              value={pesos[k]}
              onChange={(e) => onChange({ ...pesos, [k]: Number(e.target.value) })}
            >
              {OPTS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <p className="muted sliders-hint">{dict.sliders.hint}</p>
    </section>
  );
}
