/** Diccionario castellano. `gl.ts` se tipa como `typeof es`, lo que obliga a que
 *  ambos idiomas tengan exactamente las mismas claves. */
export const es = {
  appName: 'Praia ou montaña',
  tagline: '¿Playa o ruta hoy en Galicia? Según el tiempo, la luz y tu base.',
  controls: {
    base: 'Tu base',
    mode: 'Qué te apetece',
    auto: 'Que decida el tiempo',
    soloPlaya: 'Solo playa',
    soloRuta: 'Solo ruta',
    maxTravel: 'Tiempo máx. de viaje',
    pmr: 'Necesito acceso adaptado (PMR)',
  },
  verdict: {
    heading: 'Hoy mejor…',
    playa: 'PLAYA',
    montana: 'MONTAÑA',
    ambas: 'Buen día para ambas',
    ninguna: 'Sin opciones cerca',
    losesSun: 'pierde el sol a las',
    water: 'agua a',
    minCar: 'min en coche',
    tie: 'Están muy igualadas: elige según te apetezca.',
  },
  panel: {
    beaches: 'Playas',
    routes: 'Rutas',
    why: '¿Por qué?',
    noResults: 'Nada dentro de tu tiempo de viaje. Sube el máximo o cambia de base.',
    scoreLow: 'peor',
    scoreHigh: 'mejor',
  },
  map: {
    show: 'Mostrar',
    score: 'Puntuación',
    agua: 'Tª agua',
    sol: 'Ocaso',
    viaje: 'Viaje',
  },
  card: {
    travel: 'min en coche',
    water: 'Tª agua',
    sunset: 'Sol hasta',
    elevation: 'desnivel',
    circular: 'Circular',
    linear: 'Lineal',
    wikiloc: 'Ver en Wikiloc',
    directions: 'Cómo llegar',
    crowdEstimate: 'masificación estimada',
  },
  factors: {
    clima: 'Clima',
    cercania: 'Cercanía',
    solEfectivo: 'Horas de sol',
    tempAgua: 'Tª agua',
    masificacion: 'Espacio',
    servicios: 'Servicios',
    dificultadFit: 'Exigencia',
    circular: 'Circular',
  },
  sliders: {
    title: 'Ajusta lo que te importa',
    reset: 'Restablecer',
    hint: '1 = poco · 5 = mucho. Pasa el cursor por la ⓘ para ver qué mide cada uno.',
    groupCommon: 'Comunes',
    groupBeach: 'Playa',
    groupRoute: 'Ruta',
  },
  metodologia: {
    title: 'Cómo se calcula',
    intro:
      'Cada destino puntúa de 0 a 100 sumando estos factores con el peso (1–5) que tú les das. El veredicto compara la mejor playa con la mejor ruta del día.',
    clima:
      'Clima: premia temperatura agradable y sol; penaliza lluvia, nubes y viento. En rutas, el calor fuerte y la lluvia pesan más.',
    cercania: 'Cercanía: cuanto menos tiempo en coche desde tu base, mejor.',
    solEfectivo:
      'Horas de sol: a qué hora se pone el sol en esa playa de verdad, contando los montes al oeste (no solo el horizonte llano). Cuanto más tarde, mejor.',
    tempAgua: 'Tª agua: temperatura del mar; por debajo de ~17° puntúa bajo.',
    masificacion:
      'Espacio: estimación de cuánto sitio hay (las playas largas puntúan más). Es solo una estimación.',
    servicios:
      'Servicios: chiringuitos y restauración cerca. Si activas el acceso PMR, actúa como filtro: descarta las playas que no lo tienen.',
    dificultadFit: 'Exigencia: lo cerca que está la ruta de los km y el desnivel que prefieres.',
    circular: 'Circular: bonus si la ruta es circular (no vuelves por el mismo sitio).',
    veredicto:
      'Veredicto: gana playa o montaña según la mejor opción de cada una. En invierno o con el agua fría, la playa parte con desventaja. Si están muy igualadas, te dice que sirve para ambas.',
    datos:
      'Datos: tiempo de Open-Meteo, horizonte de PVGIS, playas de la Xunta de Galicia, mapa de OpenStreetMap. Las rutas se enlazan a Wikiloc.',
  },
  footer:
    'Datos: Open-Meteo · IDE Galicia · OpenStreetMap. Las rutas se hacen en Wikiloc. Demo con datos de ejemplo.',
};

export type Dict = typeof es;
