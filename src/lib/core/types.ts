/**
 * Contrato de dominio compartido por los módulos `beaches` y `routes`.
 * Es la única dependencia común: ninguno de esos dos módulos importa al otro.
 */

export interface LatLng {
  lat: number;
  lon: number;
}

/** Base desde la que se viaja (Santiago por defecto). */
export interface Base {
  id: string;
  nombre: string;
  lat: number;
  lon: number;
}

/** Tiempo de viaje precalculado desde una base a un destino. */
export interface TravelLeg {
  cocheMin: number;
  /** Pista de transporte público (v1); en v0 puede faltar. */
  transitHint?: string;
}

/** Accesibilidad para personas con movilidad reducida. */
export interface PmrInfo {
  rampa: boolean;
  sillaAnfibia: boolean;
  aseoAdaptado: boolean;
  aparcamiento: boolean;
}

/**
 * Playa del catálogo. Los campos marcados (curado) solo están presentes cuando
 * `curado === true` (enfoque mixto: las 987 cargan con lo básico; las top se
 * enriquecen a mano).
 */
export interface Playa {
  id: string;
  ideGaliciaId: string;
  aemetCodPlaya?: string;
  banderaAzulRef?: string;
  osmIds?: number[];
  nombre: string;
  concello: string;
  ria?: string;
  lat: number;
  lon: number;
  curado: boolean;
  // --- enriquecimiento (curado) ---
  /** Azimut sur-referenciado (grados, sur=0, oeste positivo) al que mira la playa. */
  orientacionDeg?: number;
  pmr?: PmrInfo;
  /** Perfil de horizonte PVGIS: ángulos de elevación por azimut (v1). */
  horizonProfile?: number[];
  chiringuitosCount?: number;
  restauracionM?: number;
  banderaAzul?: boolean;
  tipoArena?: string;
  longitudM?: number;
  /** Viaje precalculado por base (clave = `Base.id`). */
  travel: Record<string, TravelLeg>;
}

export type TipoRuta = 'circular' | 'lineal';
export type Dificultad = 'baja' | 'media' | 'alta';

/** Ruta de senderismo. La app no la ejecuta: propone y enlaza a Wikiloc. */
export interface Ruta {
  id: string;
  osmRelationId?: number;
  wikilocUrl?: string;
  nombre: string;
  concello: string;
  latInicio: number;
  lonInicio: number;
  km: number;
  desnivelPosM: number;
  tipo: TipoRuta;
  dificultad: Dificultad;
  /** Viaje precalculado por base (clave = `Base.id`). */
  travel: Record<string, TravelLeg>;
}

/** Predicción diaria para un punto (playa o concello). Fuente Open-Meteo en v0. */
export interface Forecast {
  /** ISO date YYYY-MM-DD */
  fecha: string;
  tempMaxC: number;
  /** Probabilidad de precipitación 0..100 */
  precipProb: number;
  /** Precipitación esperada (mm) */
  precipMm: number;
  /** Cobertura nubosa media 0..100 */
  nubosidad: number;
  /** Viento medio (km/h) */
  vientoKmh: number;
  /** Índice UV máximo */
  uvIndex: number;
  /** Temperatura del agua (solo costa) °C */
  tempAguaC?: number;
  /** Altura de ola (m) */
  oleajeM?: number;
}

/** Mapa destinoId → forecast del día. */
export type ForecastIndex = Record<string, Forecast>;

export type Modo = 'auto' | 'solo_playa' | 'solo_ruta';
export type Transporte = 'coche' | 'publico' | 'ambos';

/** Pesos ajustables del motor (sliders 1..5 de importancia). Se normalizan al puntuar. */
export interface Pesos {
  clima: number;
  cercania: number;
  solEfectivo: number;
  tempAgua: number;
  masificacion: number;
  servicios: number;
  dificultadFit: number;
  circular: number;
}

export interface UserPrefs {
  baseId: string;
  modo: Modo;
  transporte: Transporte;
  maxViajeMin: number;
  /** Preferencia de dureza de ruta. */
  rutaPref: { kmObjetivo: number; desnivelObjetivo: number };
  /** Si necesita accesibilidad PMR, las playas sin PMR se filtran (filtro duro). */
  requierePmr: boolean;
  pesos: Pesos;
}
