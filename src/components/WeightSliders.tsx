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
    <details className="card sliders">
      <summary>{dict.sliders.title}</summary>
      {KEYS.map((k) => (
        <div className="slider-row" key={k}>
          <label htmlFor={`w-${k}`}>{dict.factors[k]}</label>
          <input
            id={`w-${k}`}
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={pesos[k]}
            onChange={(e) => onChange({ ...pesos, [k]: Number(e.target.value) })}
          />
        </div>
      ))}
      <button className="btn" onClick={onReset} style={{ marginTop: 12 }}>
        {dict.sliders.reset}
      </button>
    </details>
  );
}
