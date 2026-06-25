import type { KeyboardEvent } from 'react';

interface Props {
  label: string;
  value: number; // 1..5
  onChange: (v: number) => void;
}

const STEPS = [1, 2, 3, 4, 5];

/** Escala 1–5 con círculos numerados (panel de control): se rellenan del 1 al valor
 *  elegido. Pulsas el círculo que quieras; flechas para ajustar con teclado. */
export function RatingControl({ label, value, onChange }: Props) {
  function onKey(e: KeyboardEvent<HTMLButtonElement>) {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      onChange(Math.min(5, value + 1));
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      onChange(Math.max(1, value - 1));
    }
  }

  return (
    <div className="rating">
      <span className="rating-label">{label}</span>
      <div className="rating-dots" role="radiogroup" aria-label={label}>
        {STEPS.map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${label}: ${n} de 5`}
            tabIndex={value === n ? 0 : -1}
            className={`rating-dot${n <= value ? ' filled' : ''}`}
            onClick={() => onChange(n)}
            onKeyDown={onKey}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}
