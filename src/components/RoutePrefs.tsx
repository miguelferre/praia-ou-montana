import type { Dict } from '@/i18n';
import { RUTA_DESNIVEL_RANGE, RUTA_KM_RANGE } from '@/lib/core/prefs';
import type { RutaPref } from '@/lib/core/types';

interface Props {
  rutaPref: RutaPref;
  onChange: (p: RutaPref) => void;
  dict: Dict;
}

/**
 * Sliders de "ruta ideal": km y desnivel objetivo del usuario, que alimentan el factor
 * de dureza (`dificultadFit`). Antes estaban hardcodeados pese a que la metodología
 * prometía "los km y el desnivel que prefieres" (F21). Solo tiene sentido cuando el
 * modo incluye rutas; el Dashboard decide cuándo mostrarlo.
 */
export function RoutePrefs({ rutaPref, onChange, dict }: Props) {
  return (
    <section className="card weights route-prefs">
      <h2 className="weights-title">{dict.rutaPref.title}</h2>
      <div className="route-prefs-grid">
        <div className="field field-travel">
          <label htmlFor="ruta-km">
            {dict.rutaPref.km}: <b>{rutaPref.kmObjetivo} km</b>
          </label>
          <input
            id="ruta-km"
            type="range"
            min={RUTA_KM_RANGE.min}
            max={RUTA_KM_RANGE.max}
            step={RUTA_KM_RANGE.step}
            value={rutaPref.kmObjetivo}
            onChange={(e) => onChange({ ...rutaPref, kmObjetivo: Number(e.target.value) })}
          />
        </div>
        <div className="field field-travel">
          <label htmlFor="ruta-desnivel">
            {dict.rutaPref.desnivel}: <b>{rutaPref.desnivelObjetivo} m</b>
          </label>
          <input
            id="ruta-desnivel"
            type="range"
            min={RUTA_DESNIVEL_RANGE.min}
            max={RUTA_DESNIVEL_RANGE.max}
            step={RUTA_DESNIVEL_RANGE.step}
            value={rutaPref.desnivelObjetivo}
            onChange={(e) => onChange({ ...rutaPref, desnivelObjetivo: Number(e.target.value) })}
          />
        </div>
      </div>
      <p className="muted sliders-hint">{dict.rutaPref.hint}</p>
    </section>
  );
}
