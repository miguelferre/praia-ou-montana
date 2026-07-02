import type { Dict, Lang } from '@/i18n';
import type { Base, Modo } from '@/lib/core/types';

interface Props {
  bases: Base[];
  baseId: string;
  onBase: (id: string) => void;
  modo: Modo;
  onModo: (m: Modo) => void;
  requierePmr: boolean;
  onPmr: (v: boolean) => void;
  maxViajeMin: number;
  onMax: (v: number) => void;
  lang: Lang;
  onLang: (l: Lang) => void;
  dict: Dict;
}

export function Controls(props: Props) {
  const {
    bases,
    baseId,
    onBase,
    modo,
    onModo,
    requierePmr,
    onPmr,
    maxViajeMin,
    onMax,
    lang,
    onLang,
    dict,
  } = props;

  return (
    <div className="controls">
      <div className="field">
        <label htmlFor="base">{dict.controls.base}</label>
        <select id="base" value={baseId} onChange={(e) => onBase(e.target.value)}>
          {bases.map((b) => (
            <option key={b.id} value={b.id}>
              {b.nombre}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label>{dict.controls.mode}</label>
        <div className="seg" role="group" aria-label={dict.controls.mode}>
          <button aria-pressed={modo === 'auto'} onClick={() => onModo('auto')}>
            {dict.controls.auto}
          </button>
          <button aria-pressed={modo === 'solo_playa'} onClick={() => onModo('solo_playa')}>
            {dict.controls.soloPlaya}
          </button>
          <button aria-pressed={modo === 'solo_ruta'} onClick={() => onModo('solo_ruta')}>
            {dict.controls.soloRuta}
          </button>
        </div>
      </div>

      <div className="field field-travel">
        <label htmlFor="max">
          {dict.controls.maxTravel}: <b>{maxViajeMin} min</b>
        </label>
        <input
          id="max"
          type="range"
          min={15}
          max={240}
          step={1}
          value={maxViajeMin}
          onChange={(e) => onMax(Number(e.target.value))}
        />
      </div>

      <label className="chk">
        <input type="checkbox" checked={requierePmr} onChange={(e) => onPmr(e.target.checked)} />
        {dict.controls.pmr}
      </label>

      <div className="seg lang-toggle" role="group" aria-label="idioma">
        <button aria-pressed={lang === 'es'} onClick={() => onLang('es')}>
          ES
        </button>
        <button aria-pressed={lang === 'gl'} onClick={() => onLang('gl')}>
          GL
        </button>
      </div>
    </div>
  );
}
