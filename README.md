# Praia ou montaña 🏖️🥾

¿Playa o ruta de senderismo hoy en Galicia? Esta app web toma tu **base** (Santiago por defecto, o cualquier lugar) y, según la meteorología, las horas de luz y el tiempo de viaje, te da un **veredicto del día — playa o montaña** y un **ranking de destinos concretos** con el porqué de cada uno. No hace la ruta: te la propone y te enlaza a Wikiloc.

Centrada **solo en Galicia**. Castellano + galego, con espejo de rutas (`/` es, `/gl/` gl) y `hreflang`. Estado actual: **MVP** con datos reales — 954 playas (IDE Galicia + curación, banderas azules reconciliadas contra la lista oficial del año), 201 rutas de OSM, predicción de Open-Meteo (meteo, mar, mareas, UV) y tiempos de coche reales (ORS para las bases preset, OSRM bajo demanda para la base libre).

## Arranque rápido

```bash
npm install
npm run dev          # http://localhost:4321
```

Regenerar la predicción del día (datos reales, sin API key; requiere **Python ≥ 3.12**):

```bash
python -m pip install -r scripts/ingest/requirements.txt
python scripts/ingest/fetch_forecast.py
```

## Cómo funciona

- **Sin backend**: páginas estáticas (Astro) + una isla React (el dashboard de mapa). Los datos se sirven como JSON estático en `public/data/` y los genera la ingesta Python (en producción, vía GitHub Actions; las API keys nunca llegan al cliente). Los tiempos de la base libre se piden a OSRM directamente desde el navegador.
- **Motor explicable**: cada destino muestra su desglose de puntuación y tú ajustas los pesos con sliders. Ver [`docs/SCORING.md`](docs/SCORING.md).
- **Modular**: los comparadores de playas y rutas son independientes (no se importan entre sí), listos para escindir una app de solo playas.

## Documentación

- [`CLAUDE.md`](CLAUDE.md) — guía operativa y convenciones.
- [`docs/DATA.md`](docs/DATA.md) — fuentes de datos, claves de cruce y hoja de ruta por fases.
- [`docs/SCORING.md`](docs/SCORING.md) — factores, pesos y lógica del veredicto.
- [`ATTRIBUTION.md`](ATTRIBUTION.md) — licencias de los datos.

## Estructura

```
src/lib/core      núcleo puro (tipos, scoring, sol, geo)
src/lib/beaches   factores y ranking de playas  (no importa routes)
src/lib/routes    factores y ranking de rutas   (no importa beaches)
src/lib/verdict   composición del veredicto
src/lib/planner   orquestación
src/lib/data      capa de E/S: carga de bundles (zod), geocoding, routing OSRM
src/components    UI (MapDashboard, VerdictCard, ...)
src/islands       isla React del dashboard
src/layouts       cáscara HTML por idioma (/ es, /gl/ gl) con hreflang
src/i18n          diccionarios es/gl (simétricos) + metadatos SEO
scripts/ingest    ingesta Python (forecast, catálogo, servicios, rutas, dedup)
public/data       JSON servido (catálogo, bases, forecast)
```
