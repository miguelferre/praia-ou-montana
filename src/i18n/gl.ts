import type { Dict } from './es';

/** Diccionario galego. El tipo `Dict` garantiza simetría de claves con `es`. */
export const gl: Dict = {
  appName: 'Praia ou montaña',
  tagline: 'Praia ou ruta hoxe en Galicia? Segundo o tempo, a luz e a túa base.',
  controls: {
    base: 'A túa base',
    mode: 'Que che apetece',
    auto: 'Que decida o tempo',
    soloPlaya: 'Só praia',
    soloRuta: 'Só ruta',
    maxTravel: 'Tempo máx. de viaxe',
    pmr: 'Necesito acceso adaptado (PMR)',
  },
  verdict: {
    heading: 'Hoxe mellor…',
    playa: 'PRAIA',
    montana: 'MONTAÑA',
    ambas: 'Bo día para as dúas',
    ninguna: 'Sen opcións preto',
    losesSun: 'perde o sol ás',
    water: 'auga a',
    minCar: 'min en coche',
    tie: 'Están moi igualadas: escolle segundo che apeteza.',
  },
  panel: {
    beaches: 'Praias',
    routes: 'Rutas',
    why: 'Por que?',
    noResults: 'Nada dentro do teu tempo de viaxe. Sobe o máximo ou cambia de base.',
  },
  card: {
    travel: 'min en coche',
    water: 'Auga',
    sunset: 'Sol ata',
    elevation: 'desnivel',
    circular: 'Circular',
    linear: 'Lineal',
    wikiloc: 'Ver en Wikiloc',
    directions: 'Como chegar',
    crowdEstimate: 'masificación estimada',
  },
  factors: {
    clima: 'Clima',
    cercania: 'Proximidade',
    solEfectivo: 'Horas de sol',
    tempAgua: 'Auga',
    masificacion: 'Espazo',
    servicios: 'Servizos',
    dificultadFit: 'Dureza',
    circular: 'Circular',
  },
  sliders: {
    title: 'Axusta o que che importa',
    reset: 'Restablecer',
  },
  footer:
    'Datos: Open-Meteo · IDE Galicia · OpenStreetMap. As rutas fanse en Wikiloc. Demo con datos de exemplo.',
};
