# DATA.md — fuentes de datos y claves de cruce

La biblia de datos de Praia ou montaña. Toda fuente, endpoint, key, licencia y truco vive aquí.

## Estado por fase

| Necesidad          | v0 (ahora)                                       | v1                                  | v2                     |
| ------------------ | ------------------------------------------------ | ----------------------------------- | ---------------------- |
| Meteo              | **Open-Meteo** (sin key)                         | + MeteoGalicia + AEMET playas       | —                      |
| Sol                | **SunCalc + PVGIS horizon (puesta efectiva)** ✅ | afinar perfiles por playa           | DEM propio             |
| Mar (temp/oleaje)  | Open-Meteo Marine                                | + MeteoGalicia / Puertos del Estado | —                      |
| Catálogo playas    | **IDE Galicia 992** ✅ + curación                | cruce AEMET / bandera azul / OSM    | —                      |
| Rutas              | semilla + Wikiloc (enlace)                       | + OSM/Waymarked Trails              | —                      |
| Viaje coche        | ORS Matrix / haversine                           | base libre (Worker)                 | —                      |
| Transporte público | enlace a bus.gal / Maps                          | estimación (parada cerca)           | OpenTripPlanner (GTFS) |

## Meteorología

- **Open-Meteo** (principal v0). `https://api.open-meteo.com/v1/forecast` y `https://marine-api.open-meteo.com/v1/marine`. Sin key. JSON. Diario: `temperature_2m_max`, `precipitation_probability_max`, `precipitation_sum`, `wind_speed_10m_max`, `uv_index_max`; horario `cloud_cover` (nubosidad = media diurna 09–20). Marine: `sea_surface_temperature` (horario), `wave_height_max` (diario). Implementado en `scripts/ingest/fetch_forecast.py`.
  - **Una predicción por CONCELLO**, no por playa: las ~992 playas comparten ~85 concellos, así que se piden ~85 (la primera playa como representante) y se replica a cada playa. Evita el rate limit (429) y es meteorológicamente equivalente. Llamadas troceadas (`CHUNK=100`).
- **MeteoGalicia MeteoSIX v4** (v1, principal Galicia). `https://servizos.meteogalicia.gal/apiv4/`. **Requiere API key** (solicitar). Modelo WRF local + oceanografía + mareas + orto/ocaso. Máx 7 días/llamada.
- **AEMET OpenData** (v1, predicción oficial de PLAYAS). `https://opendata.aemet.es/`. API key gratis (email). Patrón HATEOAS de doble salto. Rate limit ~40–50/min → cachear. Predice por **código de playa propio de AEMET**.

## Sol y puesta de sol efectiva (el diferenciador)

- **SunCalc** (`src/lib/core/sun.ts`): astronómico, offline, da altitud+azimut. v0.
- **Puesta EFECTIVA** ✅ **activa**: `PVGIS printhorizon` `https://re.jrc.ec.europa.eu/api/printhorizon?lat=&lon=&outputformat=json` (sin key) devuelve `outputs.horizon_profile` = 49 puntos `{A, H_hor}`. La puesta efectiva es cuando la altitud del sol cae bajo el horizonte en su azimut. Poblado por `scripts/ingest/fetch_horizon.py` en `Playa.horizonProfile`; calculado en `computeSun`.
  - **Convención CONFIRMADA** con respuesta real: azimut `A` de −180 a 180 (sur=0, oeste positivo, idéntica a SunCalc). Se guardan 48 valores (A=−180..172.5; se descarta A=180, duplicado del wraparound). Verificado por `tests/unit/core/effective-sunset.test.ts`: en la ría de Muros, Ancoradoiro (monte al oeste) pierde el sol antes que Carnota (mar abierto). _Caveat_: PVGIS (~SRTM 90 m) puede infraestimar montes muy próximos en calas encajonadas.

## Catálogo de playas y claves de cruce

No hay clave universal. Estrategia (`scripts/ingest/build_catalog.py`):

1. **IDE de Galicia = maestra** ✅ (987 playas). Fuente CONFIRMADA: servicio ArcGIS REST de la Xunta con GeoJSON nativo (no WFS clásico): `https://ideg.xunta.gal/servizos/rest/services/CubertaTerrestre/Clasificacion_PRAIAS/MapServer/0/query?where=1=1&outFields=*&outSR=4326&f=geojson`. Campos: `NOME_PRAIA`, `CONCELLO`, `COD_PRAIA` (id), `B_AZUL`. Coords ya en WGS84 `[lon, lat, z, m]` (usar los 2 primeros). `Playa.id` = `COD_PRAIA`. Las playas curadas a mano se preservan por dedup de proximidad (<400 m). Catálogo actual: **992 playas** (984 IDE + 8 semilla curadas).
2. **IDE ↔ AEMET**: AEMET no da coords limpias por código → cruce por `(concello + nombre normalizado)` fuzzy + validación manual en `data/mapping/`.
3. **IDE ↔ bandera azul** (dataset Xunta, CSV, CC BY-SA): por concello+nombre+proximidad <300 m.
4. **IDE ↔ OSM**: por proximidad; los chiringuitos salen de Overpass `amenity=bar|restaurant` alrededor de las coords (precalcular, no en runtime).
5. **PMR** (COGAMI, no estructurado): extracción manual a `data/mapping/curado_playas.csv`.

La curación manual (`data/mapping/curado_*.csv`) es el activo de calidad: marca `curado=true` y añade orientación, PMR, longitud, bandera azul, enlaces Wikiloc.

## Rutas

- **OSM / Waymarked Trails** (v1): relaciones `route=hiking`, geometría, GPX. Desnivel vía DEM/Open-Elevation.
- **Wikiloc**: NO tiene API. Solo **enlace** curado (encaja con "la app no hace la ruta"). No scrapear trazados.

## Transporte

- **Coche**: OpenRouteService Matrix `https://api.openrouteservice.org/v2/matrix/driving-car` (key gratis, 2500/día; una llamada por base → todos los destinos). Sin key, `build_travel.py` cae a estimación haversine. Geocoding base libre (v2): Nominatim.
- **Transporte público**: hay GTFS abierto (bus.gal/Xunta, Renfe) pero **no** API de planificación multimodal pública. v1 = estimar "hay parada cerca / tiempo aproximado" + enlazar a bus.gal / Google Maps Transit. v2 = OpenTripPlanner propio con los GTFS (el 80% del esfuerzo).

## Bundles servidos (`public/data/`)

- `catalog/playas.json`, `catalog/rutas.json` — cambian con ingesta mensual.
- `forecast/latest.json` (+ `YYYY-MM-DD.json`) — diario, ligero.
- `meta/bases.json` — bases disponibles.

Las **API keys** (MeteoGalicia, AEMET, ORS) van en GitHub Secrets y solo se usan en la ingesta (CI), **nunca en el cliente**.
