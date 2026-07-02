import { useEffect, useMemo, useState } from 'react';
import { Controls } from '@/components/Controls';
import { DestinationCard } from '@/components/DestinationCard';
import { DestinationList, type Tab } from '@/components/DestinationList';
import { MapDashboard, type MapMetric } from '@/components/MapDashboard';
import { Methodology } from '@/components/Methodology';
import { VerdictCard } from '@/components/VerdictCard';
import { WeightSliders } from '@/components/WeightSliders';
import { getDict, type Lang } from '@/i18n';
import { DEFAULT_PESOS } from '@/lib/core/prefs';
import type { ScoredItem } from '@/lib/core/result';
import type { Base, Modo, Pesos, UserPrefs } from '@/lib/core/types';
import { loadAppData, type AppData } from '@/lib/data/load';
import type { GeoPlace } from '@/lib/data/geocode';
import { plan } from '@/lib/planner';
import { CUSTOM_BASE_ID, readUrlState, writeUrlState } from '@/lib/ui/url-state';

function idOf(it: ScoredItem): string {
  return it.kind === 'playa' ? it.playa.id : it.ruta.id;
}

export default function Dashboard() {
  const initial = useMemo(
    () => readUrlState(typeof window !== 'undefined' ? window.location.search : '', 'santiago'),
    [],
  );

  const [data, setData] = useState<AppData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [lang, setLang] = useState<Lang>(initial.lang);
  const [baseId, setBaseId] = useState(initial.baseId);
  const [customBase, setCustomBase] = useState<GeoPlace | null>(
    initial.baseId === CUSTOM_BASE_ID &&
      initial.baseLat !== undefined &&
      initial.baseLon !== undefined
      ? { nombre: initial.baseName ?? 'Base libre', lat: initial.baseLat, lon: initial.baseLon }
      : null,
  );

  function pickCustomBase(p: GeoPlace) {
    setCustomBase(p);
    setBaseId(CUSTOM_BASE_ID);
  }
  const [modo, setModo] = useState<Modo>(initial.modo);
  const [requierePmr, setRequierePmr] = useState(initial.requierePmr);
  const [maxViajeMin, setMaxViajeMin] = useState(initial.maxViajeMin);
  const [pesos, setPesos] = useState<Pesos>(initial.pesos);
  const [tab, setTab] = useState<Tab>(initial.tab);
  const [mapMetric, setMapMetric] = useState<MapMetric>('score');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [date] = useState(() => new Date());

  const dict = getDict(lang);

  useEffect(() => {
    let alive = true;
    loadAppData()
      .then((d) => alive && setData(d))
      .catch((e: unknown) => alive && setLoadError(e instanceof Error ? e.message : String(e)));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    writeUrlState({
      baseId,
      ...(baseId === CUSTOM_BASE_ID && customBase
        ? { baseLat: customBase.lat, baseLon: customBase.lon, baseName: customBase.nombre }
        : {}),
      modo,
      lang,
      requierePmr,
      maxViajeMin,
      pesos,
      tab,
    });
  }, [baseId, customBase, modo, lang, requierePmr, maxViajeMin, pesos, tab]);

  const base: Base | undefined = useMemo(() => {
    if (baseId === CUSTOM_BASE_ID && customBase) {
      return {
        id: CUSTOM_BASE_ID,
        nombre: customBase.nombre,
        lat: customBase.lat,
        lon: customBase.lon,
      };
    }
    return data?.bases.find((b) => b.id === baseId) ?? data?.bases[0];
  }, [baseId, customBase, data]);

  // Cuando la base es libre, se añade como opción al selector (no está en bases.json).
  const basesForSelect: Base[] =
    base?.id === CUSTOM_BASE_ID ? [...(data?.bases ?? []), base] : (data?.bases ?? []);

  const result = useMemo(() => {
    if (!data || !base) return null;
    const prefs: UserPrefs = {
      baseId: base.id,
      modo,
      transporte: 'coche',
      maxViajeMin,
      rutaPref: { kmObjetivo: 10, desnivelObjetivo: 400 },
      requierePmr,
      pesos,
    };
    return plan({
      catalog: { playas: data.playas, rutas: data.rutas },
      base,
      date,
      forecast: data.forecast,
      prefs,
    });
  }, [data, base, modo, maxViajeMin, requierePmr, pesos, date]);

  if (loadError) {
    return (
      <div className="app">
        <p className="card detail">⚠️ {loadError}</p>
      </div>
    );
  }
  if (!data || !base || !result) {
    return (
      <div className="app">
        <p className="muted">Cargando…</p>
      </div>
    );
  }

  // El catálogo tiene cientos de playas; mostramos solo las mejores para no saturar
  // el mapa ni la lista. El veredicto usa el ranking completo (best), no el recorte.
  const TOP = 40;
  const playasTop = result.beaches.ranked.slice(0, TOP);
  const rutasTop = result.routes.ranked.slice(0, TOP);

  const effTab: Tab = modo === 'solo_playa' ? 'playa' : modo === 'solo_ruta' ? 'ruta' : tab;
  const list: ScoredItem[] = effTab === 'playa' ? playasTop : rutasTop;
  const totalEnRango =
    effTab === 'playa' ? result.beaches.ranked.length : result.routes.ranked.length;
  const selected: ScoredItem | undefined = list.find((it) => idOf(it) === activeId) ?? list[0];

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1 className="app-title">
            Praia <span className="sep">ou</span> montaña
          </h1>
          <div className="app-tagline">{dict.tagline}</div>
        </div>
      </header>

      <Controls
        bases={basesForSelect}
        baseId={baseId}
        onBase={setBaseId}
        onCustomBase={pickCustomBase}
        modo={modo}
        onModo={setModo}
        requierePmr={requierePmr}
        onPmr={setRequierePmr}
        maxViajeMin={maxViajeMin}
        onMax={setMaxViajeMin}
        lang={lang}
        onLang={setLang}
        dict={dict}
      />

      <WeightSliders
        pesos={pesos}
        onChange={setPesos}
        onReset={() => setPesos({ ...DEFAULT_PESOS })}
        dict={dict}
      />

      <VerdictCard verdict={result.verdict} dict={dict} />

      <div className="dashboard">
        <div className="col-map">
          <MapDashboard
            base={base}
            playas={playasTop}
            rutas={rutasTop}
            tab={effTab}
            metric={mapMetric}
            onMetric={setMapMetric}
            activeId={selected ? idOf(selected) : null}
            onSelect={setActiveId}
            dict={dict}
          />
        </div>
        <div className="col-panel">
          {selected && <DestinationCard item={selected} base={base} dict={dict} />}
          <div className="panel-bar">
            {totalEnRango > list.length && (
              <span className="panel-count muted">{`${list.length} / ${totalEnRango}`}</span>
            )}
            <span className="score-legend" aria-hidden="true">
              <span className="muted">{dict.panel.scoreLow}</span>
              <span className="score-legend-bar" />
              <span className="muted">{dict.panel.scoreHigh}</span>
            </span>
          </div>
          <DestinationList
            tab={effTab}
            onTab={setTab}
            playas={playasTop}
            rutas={rutasTop}
            activeId={selected ? idOf(selected) : null}
            onSelect={setActiveId}
            dict={dict}
            showTabs={modo === 'auto'}
          />
        </div>
      </div>

      <Methodology dict={dict} />

      <footer className="app-footer">{dict.footer}</footer>
    </div>
  );
}
