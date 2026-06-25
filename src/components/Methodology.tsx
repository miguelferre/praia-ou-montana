import type { Dict } from '@/i18n';

// Sección de explicabilidad (PAIR): explica en lenguaje llano cómo se calcula cada
// factor y el veredicto. El texto vive en el diccionario (es/gl).
const ITEMS: (keyof Dict['metodologia'])[] = [
  'clima',
  'cercania',
  'solEfectivo',
  'tempAgua',
  'masificacion',
  'servicios',
  'dificultadFit',
  'circular',
  'veredicto',
  'datos',
];

export function Methodology({ dict }: { dict: Dict }) {
  const m = dict.metodologia;
  return (
    <details className="card sliders methodology">
      <summary>{m.title}</summary>
      <p className="muted">{m.intro}</p>
      <ul className="method-list">
        {ITEMS.map((k) => (
          <li key={k}>{m[k]}</li>
        ))}
      </ul>
    </details>
  );
}
