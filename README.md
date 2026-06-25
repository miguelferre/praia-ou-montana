# Praia ou montaña 🏖️🥾

¿Playa o ruta de senderismo hoy en Galicia? Esta app web (instalable como PWA) toma tu **base** (Santiago por defecto) y, según la meteorología, las horas de luz y el tiempo de viaje, te da un **veredicto del día — playa o montaña** y un **ranking de destinos concretos** con el porqué de cada uno. No hace la ruta: te la propone y te enlaza a Wikiloc.

Centrada **solo en Galicia**. Castellano + galego. Estado actual: **v0 (MVP personal)** con datos de ejemplo y predicción real de Open-Meteo.

## Arranque rápido

```bash
npm install
npm run dev          # http://localhost:4321
```

Regenerar la predicción del día (datos reales, sin API key):

```bash
python -m pip install -r scripts/ingest/requirements.txt
python scripts/ingest/fetch_forecast.py
```

## Cómo funciona

- **Sin backend**: páginas estáticas (Astro) + una isla React (el dashboard de mapa). Los datos se sirven como JSON estático en `public/data/` y los genera la ingesta Python (en producción, vía GitHub Actions; las API keys nunca llegan al cliente).
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
src/components     UI (MapDashboard, VerdictCard, ...)
src/islands        isla React del dashboard
scripts/ingest     ingesta Python (forecast, travel, catalog)
public/data        JSON servido (catálogo, bases, forecast)
```
