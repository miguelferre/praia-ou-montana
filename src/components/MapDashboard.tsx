import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import type { Dict } from '@/i18n';
import type { ScoredPlaya, ScoredRuta } from '@/lib/core/result';
import type { Base } from '@/lib/core/types';
import { hhmm, round, scoreColor } from '@/lib/ui/format';

// Estilo de mapa gratuito y sin API key.
const STYLE = 'https://tiles.openfreemap.org/styles/liberty';

/** Qué dato muestran los marcadores del mapa (el color siempre es la puntuación). */
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

export function MapDashboard(props: Props) {
  const { base, playas, rutas, tab, metric, onMetric, activeId, onSelect, dict } = props;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  // Inicialización del mapa (una vez).
  useEffect(() => {
    if (!containerRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE,
      center: [-8.7, 42.75],
      zoom: 8,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Marcadores: se recrean al cambiar datos, pestaña, métrica o selección.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    for (const m of markersRef.current) m.remove();
    markersRef.current = [];
    const bounds = new maplibregl.LngLatBounds();

    const addMarker = (
      id: string,
      lat: number,
      lon: number,
      total: number,
      label: string,
      isRuta: boolean,
    ) => {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = `marker${isRuta ? ' ruta' : ''}${activeId === id ? ' is-active' : ''}`;
      el.style.background = scoreColor(total);
      el.textContent = label;
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        onSelectRef.current(id);
      });
      const marker = new maplibregl.Marker({ element: el }).setLngLat([lon, lat]).addTo(map);
      markersRef.current.push(marker);
      bounds.extend([lon, lat]);
    };

    if (tab === 'playa') {
      for (const p of playas) {
        addMarker(
          p.playa.id,
          p.playa.lat,
          p.playa.lon,
          p.score.total,
          beachLabel(p, metric),
          false,
        );
      }
    } else {
      for (const r of rutas) {
        addMarker(
          r.ruta.id,
          r.ruta.latInicio,
          r.ruta.lonInicio,
          r.score.total,
          routeLabel(r, metric),
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
  }, [playas, rutas, tab, metric, activeId, base]);

  return (
    <div>
      <div className="map-toolbar">
        <span className="map-toolbar-cap">{dict.map.show}</span>
        <div className="seg" role="group" aria-label={dict.map.show}>
          {MAP_METRICS.map((m) => (
            <button key={m} type="button" aria-pressed={metric === m} onClick={() => onMetric(m)}>
              {dict.map[m]}
            </button>
          ))}
        </div>
      </div>
      <div className="map" ref={containerRef} role="application" aria-label="Mapa de Galicia" />
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
