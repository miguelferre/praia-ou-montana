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
    <details className="card sliders" open>
      <summary>{dict.sliders.title}</summary>
      <p className="muted sliders-hint">{dict.sliders.hint}</p>
      {KEYS.map((k) => (
        <div className="slider-row" key={k}>
          <label htmlFor={`w-${k}`}>{dict.factors[k]}</label>
          <input
            id={`w-${k}`}
            type="range"
            min={1}
            max={5}
            step={1}
            list="pesos-ticks"
            value={pesos[k]}
            onChange={(e) => onChange({ ...pesos, [k]: Number(e.target.value) })}
          />
          <span className="slider-val">{pesos[k]}</span>
        </div>
      ))}
      <datalist id="pesos-ticks">
        <option value="1"></option>
        <option value="2"></option>
        <option value="3"></option>
        <option value="4"></option>
        <option value="5"></option>
      </datalist>
      <button className="btn" onClick={onReset} style={{ marginTop: 12 }}>
        {dict.sliders.reset}
      </button>
    </details>
  );
}
