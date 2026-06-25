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
  },
  card: {
    travel: 'min en coche',
    water: 'Agua',
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
    tempAgua: 'Agua',
    masificacion: 'Espacio',
    servicios: 'Servicios',
    dificultadFit: 'Dureza',
    circular: 'Circular',
  },
  sliders: {
    title: 'Ajusta lo que te importa',
    reset: 'Restablecer',
  },
  footer:
    'Datos: Open-Meteo · IDE Galicia · OpenStreetMap. Las rutas se hacen en Wikiloc. Demo con datos de ejemplo.',
};

export type Dict = typeof es;
