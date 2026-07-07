# DATA.md — fuentes de datos y claves de cruce

La biblia de datos de Praia ou montaña. Toda fuente, endpoint, key, licencia y truco vive aquí.

## Estado por fase

| Necesidad          | v0 (ahora)                                       | v1                                  | v2                     |
| ------------------ | ------------------------------------------------ | ----------------------------------- | ---------------------- |
| Meteo              | **Open-Meteo** (sin key)                         | + MeteoGalicia + AEMET playas       | —                      |
| Sol                | **SunCalc + PVGIS horizon (puesta efectiva)** ✅ | afinar perfiles por playa           | DEM propio             |
| Mar (temp/oleaje)  | Open-Meteo Marine                                | + MeteoGalicia / Puertos del Estado | —                      |
| Mareas             | **Open-Meteo `sea_level_height_msl`** ✅         | afinar (FES2014 / Puertos Estado)   | DEM/armónicos propios  |
| UV                 | **Open-Meteo `uv_index_max`** ✅ (en ficha)      | —                                   | —                      |
| Catálogo playas    | **IDE Galicia 954** ✅ + curación + dedup        | + AEMET                             | —                      |
| Bandera azul       | **lista oficial del año, reconciliada** ✅       | automatizar la descarga anual       | —                      |
| Rutas              | **OSM Overpass 201** ✅ + Wikiloc (enlace)       | + Waymarked Trails                  | —                      |
| Viaje coche        | **ORS preset + OSRM on-demand (base libre)** ✅  | —                                   | —                      |
| Transporte público | enlace a bus.gal / Maps                          | estimación (parada cerca)           | OpenTripPlanner (GTFS) |

## Meteorología

- **Open-Meteo** (principal v0). `https://api.open-meteo.com/v1/forecast` y `https://marine-api.open-meteo.com/v1/marine`. Sin key. JSON. Diario: `temperature_2m_max`, `precipitation_probability_max`, `precipitation_sum`, `wind_speed_10m_max`, `uv_index_max`; horario `cloud_cover` (nubosidad = media diurna 09–20). Marine: `sea_surface_temperature` (horario), `wave_height_max` (diario), `sea_level_height_msl` (horario → mareas, ver abajo). Implementado en `scripts/ingest/fetch_forecast.py`.
  - **Una predicción por CONCELLO**, no por playa: las playas comparten ~85 concellos, así que se piden ~85 (la primera playa como representante) y se replica a cada playa; las rutas sí se piden por su punto de inicio. Evita el rate limit (429). Llamadas troceadas (`CHUNK=100`).
- **MeteoGalicia MeteoSIX v4** (opción v1 para meteo oficial; **no se usa**). `https://servizos.meteogalicia.gal/apiv4/`. WRF local + oceanografía + orto/ocaso. **Descartada por ahora**: requiere API key gratuita pero solicitada por email (fricción y dependencia que preferimos evitar). Open-Meteo cubre meteo y mareas sin key.
- **AEMET OpenData** (v1, predicción oficial de PLAYAS). `https://opendata.aemet.es/`. API key gratis (email). Patrón HATEOAS de doble salto. Rate limit ~40–50/min → cachear. Predice por **código de playa propio de AEMET**.

## Mareas

- **Open-Meteo `sea_level_height_msl`** ✅ (Marine API, horario, sin key). En `fetch_forecast.py`, `extract_tides()` toma la curva horaria de nivel del mar y detecta los **extremos locales** (máximos = pleamares, mínimos = bajamares); la hora del pico se refina con interpolación parabólica de 3 puntos. Se mapea a `TideEvent { time, type }` (contrato interno en `core/types.ts`).
  - **Caveats (mostrar como "estimación")**: el nivel va referido a la **media del mar (MSL)**, no al cero hidrográfico de las tablas náuticas (LAT) → **la altura no es comparable con una tabla de mareas, por eso se omite** (`heightM` es opcional). Resolución **8 km**: la hora es fiable pero aproximada (±min) y no capta rías muy encajonadas. Con `forecast_days=1` se pierden los extremos pegados a 00/24 h.
  - **Afinado futuro (v1+)**: cálculo armónico propio con constituyentes FES2014 (`pyfes`/`pyTMD`) o constantes de Puertos del Estado para dar altura sobre el cero hidrográfico. El contrato `TideEvent` no cambia.

## Sol y puesta de sol efectiva (el diferenciador)

- **SunCalc** (`src/lib/core/sun.ts`): astronómico, offline, da altitud+azimut. v0.
- **Puesta EFECTIVA** ✅ **activa**: `PVGIS printhorizon` `https://re.jrc.ec.europa.eu/api/printhorizon?lat=&lon=&outputformat=json` (sin key) devuelve `outputs.horizon_profile` = 49 puntos `{A, H_hor}`. La puesta efectiva es cuando la altitud del sol cae bajo el horizonte en su azimut. Poblado por `scripts/ingest/fetch_horizon.py` en `Playa.horizonProfile`; calculado en `computeSun`.
  - **Convención CONFIRMADA** con respuesta real: azimut `A` de −180 a 180 (sur=0, oeste positivo, idéntica a SunCalc). Se guardan 48 valores (A=−180..172.5; se descarta A=180, duplicado del wraparound). Verificado por `tests/unit/core/effective-sunset.test.ts`: en la ría de Muros, Ancoradoiro (monte al oeste) pierde el sol antes que Carnota (mar abierto). _Caveat_: PVGIS (~SRTM 90 m) puede infraestimar montes muy próximos en calas encajonadas.

## Catálogo de playas y claves de cruce

No hay clave universal. Estrategia (`scripts/ingest/build_catalog.py`):

1. **IDE de Galicia = maestra** ✅. Fuente CONFIRMADA: servicio ArcGIS REST de la Xunta con GeoJSON nativo (no WFS clásico): `https://ideg.xunta.gal/servizos/rest/services/CubertaTerrestre/Clasificacion_PRAIAS/MapServer/0/query?where=1=1&outFields=*&outSR=4326&f=geojson`. Campos: `NOME_PRAIA`, `CONCELLO`, `COD_PRAIA` (id), `B_AZUL`. Coords ya en WGS84 `[lon, lat, z, m]` (usar los 2 primeros). `Playa.id` = `COD_PRAIA`. Catálogo actual: **954 playas** (tras fundir los casi-duplicados del IDE, ver _Dedup_ abajo).
2. **IDE ↔ AEMET**: AEMET no da coords limpias por código → cruce por `(concello + nombre normalizado)` fuzzy + validación manual en `data/mapping/`.
3. **Bandera azul** ✅: el campo `B_AZUL` del IDE está **congelado (~2024)** y no sigue el galardón anual (en 2026 seguía marcando playas que lo perdieron, p. ej. Samil, o todo Cangas). Se **reconcilia** contra una lista oficial versionada (`data/mapping/banderas_azul_YYYY.csv`) con `scripts/ingest/reconcile_blue_flags.py`: cruce por concello+nombre normalizado + overrides auditados a mano para variantes de nombre. En 2026: **128 → 118** marcadas. La lista de ADEAC no es descargable estructurada; se transcribe (Galicia Máxica contrastado con prensa) y se versiona.
4. **IDE ↔ OSM**: por proximidad. Los **servicios** ✅ (`scripts/ingest/build_services.py`) salen de Overpass `amenity=bar|restaurant|cafe`: una consulta trae los ~7.400 locales de Galicia y se cuentan los que hay a <350 m de cada playa (índice de rejilla, no en runtime) → `chiringuitosCount`. Respeta la curación manual (no toca las `curado=true`).
5. **PMR** (COGAMI, no estructurado): extracción manual a `data/mapping/curado_playas.csv`.
6. **Dedup** ✅ (`scripts/ingest/dedup_playas.py`): el IDE parte muchas playas en 2-3 registros (mismo nombre, coords a unos cientos de metros). Se agrupan por concello+nombre normalizado y, cuando están cerca (<1,2 km = "segmentación del IDE", el mismo umbral que `validate_catalog`), se conserva la entrada con más señal y se funden banderaAzul/chiringuitos. En 2026: **991 → 954**. Los homónimos LEJANOS (p. ej. _Area Grande_ en Arteixo a 5,5 km) NO se tocan: son dos playas o un error de ubicación, y los delata el validador.

La curación manual (`data/mapping/curado_*.csv`) es el activo de calidad: marca `curado=true` y añade orientación, PMR, longitud, enlaces Wikiloc. **Excepción — `banderaAzul`**: no la manda la curación sino la lista oficial del año; `reconcile_blue_flags.py` la sobreescribe **deliberadamente incluso en playas curadas** (el galardón es anual y el CSV puede quedar desfasado, así que aquí manda ADEAC). El resto de campos curados sí se preservan. **`reconcile_blue_flags.py` y `dedup_playas.py` corren DESPUÉS de `build_catalog`** (encadenados en `ingest-catalog.yml`), porque cada `--ide` reintroduce los duplicados y el `B_AZUL` histórico del IDE.

## Rutas

- **OSM Overpass** ✅ (`scripts/ingest/build_routes.py`): relaciones `route=hiking` **locales/regionales** (`network` lwn/rwn) de Galicia. Se excluyen los Caminos de Santiago (nwn/iwn, decenas de km) y se filtra a **3–25 km** (senderismo de día). Por ruta: longitud (tag `distance` o geometría), **desnivel positivo** (tag `ascent`, o muestreo de la elevación de Open-Meteo con banda de histéresis anti-ruido), circular vs lineal (`roundtrip` o inicio≈fin), dificultad (heurística km+desnivel) y **concello** (reverse de Nominatim; se descartan las de fuera de Galicia). Catálogo actual: **201 rutas**.
  - _Caveats_: el desnivel es una **estimación** (DEM ~90 m + histéresis); medido, el conjunto está sano (mediana ~26 m/km), con solo un puñado de rutas de montaña que _podrían_ estar algo altas por el muestreo. La longitud del tag `distance` es más fiable que la geométrica cuando existe. Sin altura/GPX: la app propone y enlaza, no ejecuta la ruta. `rutas.json` NO guarda el track, así que recalcular el desnivel exige re-correr la ingesta.
- **Rutas semilla curadas**: rutas top con `wikilocUrl` a mano; `build_routes.py` las **preserva** y deduplica las de OSM por proximidad de inicio (<400 m).
- **Waymarked Trails / Wikiloc** (futuro): enriquecer con más metadatos; Wikiloc NO tiene API (solo enlace curado, no scrapear trazados).

## Transporte

- **Coche, bases preset**: OpenRouteService Matrix `https://api.openrouteservice.org/v2/matrix/driving-car` (key gratis, 2500/día; una llamada por base → todos los destinos). Sin key, `build_travel.py` cae a **OSRM público** por carretera y luego a estimación haversine. Precalculado a JSON estático.
- **Coche, base libre** ✅: como su ubicación es arbitraria no hay precálculo; el cliente pide los tiempos a **OSRM público** (`router.project-osrm.org` `/table`, HTTPS + CORS, sin key) **bajo demanda** desde `src/lib/data/travel.ts` — preselección por cercanía, troceado, caché en IndexedDB, fallback a haversine (`roughDriveMinutes`) si un tramo falla. Endpoint configurable con `PUBLIC_TRAVEL_ENDPOINT` por si algún día se quiere un Worker propio con caché compartida. Geocoding de la base libre: Nominatim (`src/lib/data/geocode.ts`).
- **Transporte público**: hay GTFS abierto (bus.gal/Xunta, Renfe) pero **no** API de planificación multimodal pública. v1 = estimar "hay parada cerca / tiempo aproximado" + enlazar a bus.gal / Google Maps Transit. v2 = OpenTripPlanner propio con los GTFS (el 80% del esfuerzo).

## Bundles servidos (`public/data/`)

- `catalog/playas.json`, `catalog/rutas.json` — cambian con ingesta mensual.
- `forecast/latest.json` (+ `YYYY-MM-DD.json`) — diario.
- `meta/bases.json` — bases disponibles.

Tamaños actuales (crudo → gzip; **Cloudflare comprime al vuelo**, así que lo que viaja es el gzip):

| Fichero                | Crudo   | gzip   | Nota                                             |
| ---------------------- | ------- | ------ | ------------------------------------------------ |
| `catalog/playas.json`  | ~987 KB | ~77 KB | 954 playas + `travel` + `horizonProfile` (48 pt) |
| `forecast/latest.json` | ~504 KB | ~11 KB | ~1,2k destinos (playas por concello + rutas)     |
| `catalog/rutas.json`   | ~95 KB  | ~11 KB | 201 rutas de OSM                                 |

El cliente carga **~99 KB gzip** en total: aceptable para el MVP. Si el forecast crece (más días, altura de marea, más campos), la palanca es **particionar** (p. ej. mareas a `forecast/tides/{id}.json` bajo demanda) antes que engordar `latest.json`.

## Robustez y validación de la ingesta

- **Reintentos**: todos los scripts comparten `scripts/ingest/common.py` (`make_session`), una `requests.Session` con reintentos exponenciales ante 429/5xx, para que un fallo transitorio de Open-Meteo/PVGIS/OSRM/ArcGIS no aborte la ingesta. `common.py` también centraliza `haversine_*` y `chunks` (antes duplicados).
- **Validación de salida** ✅: dos validadores corren **antes del commit** en sus workflows (y en cada PR, en `check.yml`):
  - `validate_forecast.py` (en `ingest-forecast.yml`): JSON parseable, cobertura ≥90 % del catálogo, fecha única y campos numéricos del contrato.
  - `validate_catalog.py` (en `ingest-catalog.yml`, tras `reconcile_blue_flags` y `dedup_playas`): coordenadas dentro de Galicia (bbox), campos requeridos, sin ids duplicados; y **avisa** de dos entradas con el mismo nombre y concello a >1.2 km (el patrón del bug de Praia do Testal, que colocó una playa curada a 1.5 km de su sitio).
  - Si un validador falla, el workflow aborta y **no se commitea nada corrupto**.
- **Validación en cliente** ✅: `src/lib/data/load.ts` valida los bundles con **zod** al cargarlos (esquema por `passthrough`, no descarta campos); un bundle inesperado falla con mensaje claro en vez de romper la UI a mitad de uso.
- **Tests de ingesta**: `tests/ingest/` (pytest) cubre las funciones puras (`haversine`, `chunks`, extracción de mareas). Lint/format/tipos con `ruff` y `mypy` (`npm run lint:py`, `format:py`, `test:py`; deps en `scripts/ingest/requirements-dev.txt`). No están en `npm run check` porque el CI de Node no tiene Python.

Las **API keys** (MeteoGalicia, AEMET, ORS) van en GitHub Secrets y solo se usan en la ingesta (CI), **nunca en el cliente**.
