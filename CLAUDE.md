# Praia ou montaña — guía operativa para agentes

¿Playa o ruta hoy en Galicia? Según meteo, horas de luz y tiempo de viaje desde tu base, da un **veredicto del día** (playa vs montaña) y un **ranking de destinos** con su desglose. No ejecuta rutas: propone y enlaza a Wikiloc. Sitio estático Astro + isla React, datos servidos como JSON estático e ingeridos por scripts Python. Hermano de **ComparaClima** (mismo stack y filosofía: The Pudding + PAIR). MVP personal; ES + GL.

## Comandos

```
npm run dev          # servidor de desarrollo (localhost:4321)
npm run check        # typecheck + lint + format:check + tests (VERDE antes de cada commit)
npm run test         # vitest (unitarios, puros, nunca tocan red)
npm run build        # astro build -> dist/
npm run lint:py / format:py / test:py           # ruff + pytest de la ingesta (requirements-dev.txt)
python scripts/ingest/fetch_forecast.py        # predicción diaria (Open-Meteo, sin key)
python scripts/ingest/fetch_horizon.py [--dry-run]  # perfil de horizonte PVGIS -> sol efectivo
python scripts/ingest/build_travel.py [--dry-run]   # tiempos de viaje (ORS_API_KEY opcional)
python scripts/ingest/build_catalog.py [--wfs] [--dry-run]  # catálogo playas + curación
python scripts/ingest/build_routes.py [--dry-run] [--limit N]  # rutas de senderismo (OSM Overpass)
python scripts/ingest/validate_catalog.py / validate_forecast.py  # barreras de calidad (corren en CI)
```

## Mapa de arquitectura

- `src/lib/core/` — núcleo SIN dominio cruzado: `types.ts` (contrato), `scoring.ts` (suma ponderada genérica), `sun.ts` (puesta efectiva), `geo.ts`, `result.ts`, `prefs.ts`. Funciones puras, testeables en node.
- `src/lib/beaches/` y `src/lib/routes/` — factores y ranking de cada tipo. **NO se importan entre sí** (solo importan `core`). Es lo que permite escindir una app de solo playas.
- `src/lib/verdict/` — compone el mejor de cada tipo en el veredicto. `src/lib/planner/` — orquesta beaches+routes+verdict (capa de composición, como la UI).
- `src/components/` — presentacionales (MapDashboard con MapLibre, VerdictCard, DestinationList/Card, WeightSliders, Controls).
- `src/islands/dashboard/Dashboard.tsx` — única isla React (`client:only`); estado en URL.
- `src/i18n/` — `es.ts` + `gl.ts` (tipado: `gl` es `typeof es`, claves simétricas obligatorias). Toggle en cliente, sin espejo de rutas (eso es fase pública).
- `public/data/` — JSON servido: `catalog/{playas,rutas}.json`, `meta/bases.json`, `forecast/latest.json`. Lo escribe la ingesta.
- `data/mapping/` — curación manual (CSV), input de `build_catalog.py`.
- `docs/` — `DATA.md` (fuentes y claves de cruce), `SCORING.md` (factores y veredicto). **Leer antes de tocar** la materia correspondiente.

## Convenciones duras (no negociables)

1. **`beaches/` y `routes/` jamás se importan entre sí.** Solo dependen de `core/`. Verificable con tests de import.
2. Todo string visible pasa por el diccionario (`dict.*`) y existe en `es.ts` Y `gl.ts`.
3. Todo color por token CSS (`src/styles/tokens.css`). Nunca hex en componentes.
4. `src/lib/` contiene solo funciones puras (sin DOM, sin red), testeables en entorno node.
5. El motor es explicable (PAIR): cada puntuación expone su `breakdown`; los pesos son del usuario. Nada de caja negra.
6. Reglas de producto legibles, no pesos ocultos (ej. el gate estacional de la playa vive en `verdict/`, explícito).
7. Los tests nunca tocan la red. Forecast/catálogo reales se graban como fixtures fechadas.
8. La masificación es un proxy débil: muéstrala siempre como "estimación".

## Definition of Done (por cambio)

- `npm run check` verde.
- Claves i18n en ambos idiomas.
- Si tocaste `core`, `beaches`, `routes` o `verdict`: test unitario que cubra el cambio.
- Commits convencionales en inglés (`feat:`, `fix:`, `docs:`, `chore:`).

## Decisiones tomadas (no se reabren sin motivo)

Stack Astro+React+TS estático (espejo de ComparaClima); static-first con ingesta en CI (las keys nunca van al cliente); catálogo mixto (987 IDE Galicia + curación de las top); bases preset (Santiago/Esteiro/Sanxenxo) precalculadas, base libre en fase pública; i18n ES+GL con toggle. Plan completo en `C:\Users\ferre\.claude\plans\muy-bien-quiero-hacer-greedy-peach.md`.
