import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import type { Dict } from '@/i18n';
import type { ScoredPlaya, ScoredRuta } from '@/lib/core/result';
import { GALICIA_CENTER } from '@/lib/core/geo';
import type { Base } from '@/lib/core/types';
import { hhmm, NEUTRAL_MARKER, round, scoreColor, sunsetColor, waterColor } from '@/lib/ui/format';

// Estilo de mapa gratuito y sin API key.
const STYLE = 'https://tiles.openfreemap.org/styles/liberty';

/** Qué dato muestran los marcadores del mapa (etiqueta y escala de color). */
export type MapMetric = 'score' | 'agua' | 'sol' | 'viaje';
export const MAP_METRICS: MapMetric[] = ['score', 'agua', 'sol', 'viaje'];

interface Props {
  base: Base;
  playas: ScoredPlaya[];
  rutas: ScoredRuta[];
  tab: 'playa' | 'ruta';
  metric: MapMetric;
  onMetric: (m: MapMetric) => void;
  activeId: string | null;
  onSelect: (id: string) => void;
  dict: Dict;
}

function beachLabel(p: ScoredPlaya, metric: MapMetric): string {
  switch (metric) {
    case 'agua':
      return p.tempAguaC !== undefined ? `${round(p.tempAguaC)}°` : '·';
    case 'sol':
      return p.effectiveSunsetIso ? hhmm(p.effectiveSunsetIso) : '·';
    case 'viaje':
      return `${p.travelMin}'`;
    default:
      return `${round(p.score.total)}`;
  }
}

function routeLabel(r: ScoredRuta, metric: MapMetric): string {
  return metric === 'viaje' ? `${r.travelMin}'` : `${round(r.score.total)}`;
}

/** Rangos dinámicos (agua, ocaso) de las playas visibles, para normalizar el color. */
interface MarkerRanges {
  sunMin: number;
  sunMax: number;
  aguaMin: number;
  aguaMax: number;
}

/**
 * Color del marcador de playa según la métrica: azules para el agua y atardecer para el
 * ocaso, ambos normalizados sobre el rango del día (`MarkerRanges`), y la escala de
 * puntuación para score/viaje. Sin dato en la métrica, gris neutro.
 */
function beachMarkerColor(p: ScoredPlaya, metric: MapMetric, r: MarkerRanges): string {
  if (metric === 'agua') {
    return p.tempAguaC !== undefined
      ? waterColor(p.tempAguaC, r.aguaMin, r.aguaMax)
      : NEUTRAL_MARKER;
  }
  if (metric === 'sol') {
    if (!p.effectiveSunsetIso) return NEUTRAL_MARKER;
    const span = r.sunMax - r.sunMin;
    const t = span > 0 ? (new Date(p.effectiveSunsetIso).getTime() - r.sunMin) / span : 0.5;
    return sunsetColor(t);
  }
  return scoreColor(p.score.total);
}

export function MapDashboard(props: Props) {
  const { base, playas, rutas, tab, metric, onMetric, activeId, onSelect, dict } = props;
  // Agua y ocaso no aplican a rutas: en esa pestaña la métrica efectiva cae a 'score'
  // (y sus botones se deshabilitan) para que no queden inertes pero pulsables (F23).
  const effectiveMetric: MapMetric =
    tab === 'ruta' && (metric === 'agua' || metric === 'sol') ? 'score' : metric;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const markersById = useRef<Map<string, HTMLButtonElement>>(new Map());
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const activeIdRef = useRef(activeId);
  activeIdRef.current = activeId;

  // Inicialización del mapa (una vez).
  useEffect(() => {
    if (!containerRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE,
      center: [GALICIA_CENTER.lon, GALICIA_CENTER.lat],
      zoom: 8,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Marcadores: se recrean al cambiar datos, pestaña, métrica o base — y solo entonces
  // se re-encuadra el mapa. La SELECCIÓN no entra aquí: antes re-encuadraba y deshacía
  // el zoom/pan del usuario al tocar un marcador (F8); su resaltado vive en el efecto
  // siguiente, que solo cambia la clase sin recrear ni mover el mapa.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    for (const m of markersRef.current) m.remove();
    markersRef.current = [];
    markersById.current = new Map();
    const bounds = new maplibregl.LngLatBounds();

    const addMarker = (
      id: string,
      lat: number,
      lon: number,
      bg: string,
      label: string,
      isRuta: boolean,
    ) => {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = `marker${isRuta ? ' ruta' : ''}${activeIdRef.current === id ? ' is-active' : ''}`;
      el.style.background = bg;
      el.textContent = label;
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        onSelectRef.current(id);
      });
      const marker = new maplibregl.Marker({ element: el }).setLngLat([lon, lat]).addTo(map);
      markersRef.current.push(marker);
      markersById.current.set(id, el);
      bounds.extend([lon, lat]);
    };

    if (tab === 'playa') {
      // Rango dinámico de la métrica sobre las playas visibles (agua y ocaso), para que
      // el gradiente cubra el rango real del día y las diferencias pequeñas se distingan.
      let sunMin = Infinity;
      let sunMax = -Infinity;
      let aguaMin = Infinity;
      let aguaMax = -Infinity;
      if (effectiveMetric === 'sol') {
        for (const p of playas) {
          if (p.effectiveSunsetIso) {
            const t = new Date(p.effectiveSunsetIso).getTime();
            sunMin = Math.min(sunMin, t);
            sunMax = Math.max(sunMax, t);
          }
        }
      } else if (effectiveMetric === 'agua') {
        for (const p of playas) {
          if (p.tempAguaC !== undefined) {
            aguaMin = Math.min(aguaMin, p.tempAguaC);
            aguaMax = Math.max(aguaMax, p.tempAguaC);
          }
        }
        // Span mínimo de 2 °C: si las playas visibles están casi a la misma temperatura,
        // no se estira una diferencia trivial al gradiente completo.
        if (Number.isFinite(aguaMin) && aguaMax - aguaMin < 2) {
          const mid = (aguaMin + aguaMax) / 2;
          aguaMin = mid - 1;
          aguaMax = mid + 1;
        }
      }
      const ranges: MarkerRanges = { sunMin, sunMax, aguaMin, aguaMax };
      for (const p of playas) {
        addMarker(
          p.playa.id,
          p.playa.lat,
          p.playa.lon,
          beachMarkerColor(p, effectiveMetric, ranges),
          beachLabel(p, effectiveMetric),
          false,
        );
      }
    } else {
      for (const r of rutas) {
        addMarker(
          r.ruta.id,
          r.ruta.latInicio,
          r.ruta.lonInicio,
          scoreColor(r.score.total),
          routeLabel(r, effectiveMetric),
          true,
        );
      }
    }

    // Marcador de la base.
    const baseEl = document.createElement('div');
    baseEl.className = 'marker';
    baseEl.style.background = 'var(--accent)';
    baseEl.textContent = '★';
    markersRef.current.push(
      new maplibregl.Marker({ element: baseEl }).setLngLat([base.lon, base.lat]).addTo(map),
    );
    bounds.extend([base.lon, base.lat]);

    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, { padding: 60, maxZoom: 11, duration: 400 });
    }
  }, [playas, rutas, tab, effectiveMetric, base]);

  // Resaltado del marcador activo: togglea la clase sobre los marcadores ya creados,
  // sin recrearlos ni re-encuadrar el mapa (F8).
  useEffect(() => {
    markersById.current.forEach((el, id) => {
      el.classList.toggle('is-active', id === activeId);
    });
  }, [activeId]);

  return (
    <div>
      <div className="map-toolbar">
        <span className="map-toolbar-cap">{dict.map.show}</span>
        <div className="seg" role="group" aria-label={dict.map.show}>
          {MAP_METRICS.map((m) => {
            const disabled = tab === 'ruta' && (m === 'agua' || m === 'sol');
            return (
              <button
                key={m}
                type="button"
                aria-pressed={effectiveMetric === m}
                disabled={disabled}
                onClick={() => onMetric(m)}
              >
                {dict.map[m]}
              </button>
            );
          })}
        </div>
      </div>
      <div className="map" ref={containerRef} role="application" aria-label={dict.map.aria} />
      <div className="map-legend">
        <span>
          <span className="legend-dot" style={{ background: 'var(--accent)' }} />
          {base.nombre}
        </span>
        <span>
          <span className="legend-dot" style={{ background: 'var(--score-good)' }} />
          {tab === 'playa' ? dict.panel.beaches : dict.panel.routes}
        </span>
      </div>
    </div>
  );
}
