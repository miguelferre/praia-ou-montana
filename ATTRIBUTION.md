# Atribución de datos

Praia ou montaña usa datos abiertos de terceros. Si el proyecto se publica, estas atribuciones deben mostrarse en la interfaz.

- **Predicción meteorológica y marina**: [Open-Meteo](https://open-meteo.com/) — CC BY 4.0.
- **Mapas base**: [OpenFreeMap](https://openfreemap.org/) y © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors — ODbL.
- **Catálogo de playas**: IDE de Galicia / Turismo de Galicia, Xunta de Galicia — CC BY-SA 4.0. _Share-alike_: revisar si se redistribuyen datos derivados.
- **Bandera azul**: galardón de [ADEAC](https://www.adeac.es/); la lista oficial anual se transcribe y versiona en `data/mapping/banderas_azul_YYYY.csv`.
- **Perfil de horizonte** (v1): PVGIS, Joint Research Centre, Comisión Europea.
- **Predicción oficial de playas** (v1): © AEMET.
- **Rutas**: enlaces a [Wikiloc](https://www.wikiloc.com/) (sin redistribución de trazados); geometrías de OSM/Waymarked Trails — ODbL.
- **Tiempos de viaje**: [OpenRouteService](https://openrouteservice.org/) (HeiGIT, bases preset) y [OSRM](https://project-osrm.org/) (servidor público, base libre) — ambos sobre datos OSM, ODbL.
- **Geocodificación** de la base libre: [Nominatim](https://nominatim.org/) — © OpenStreetMap contributors, ODbL.
- **Cálculo solar**: [SunCalc](https://github.com/mourner/suncalc) — MIT.

Los datos servidos en `public/data/` son reales (IDE Galicia, OSM, Open-Meteo, PVGIS…); la predicción se regenera a diario y el catálogo mensualmente, con los scripts de `scripts/ingest/`.
