import { z } from 'zod';
import type { Base, ForecastIndex, Playa, Ruta } from '@/lib/core/types';

/**
 * Carga de los bundles estáticos servidos en /data. El JSON lo escribe la ingesta
 * Python (fe ciega en el contrato); aquí se valida en runtime con zod para que un
 * bundle corrupto falle con un mensaje claro en vez de romper la UI a mitad de uso.
 * Solo se validan los campos que el cliente consume; el resto se conserva tal cual.
 */
export interface AppData {
  bases: Base[];
  playas: Playa[];
  rutas: Ruta[];
  forecast: ForecastIndex;
}

const TravelLegSchema = z.object({ cocheMin: z.number() }).passthrough();

const BaseSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  lat: z.number(),
  lon: z.number(),
});

const PlayaSchema = z
  .object({
    id: z.string(),
    nombre: z.string(),
    concello: z.string(),
    lat: z.number(),
    lon: z.number(),
    travel: z.record(TravelLegSchema),
  })
  .passthrough();

const RutaSchema = z
  .object({
    id: z.string(),
    nombre: z.string(),
    concello: z.string(),
    latInicio: z.number(),
    lonInicio: z.number(),
    km: z.number(),
    desnivelPosM: z.number(),
    tipo: z.enum(['circular', 'lineal']),
    dificultad: z.enum(['baja', 'media', 'alta']),
    travel: z.record(TravelLegSchema),
  })
  .passthrough();

const TideEventSchema = z
  .object({ time: z.string(), type: z.enum(['high', 'low']), heightM: z.number().optional() })
  .passthrough();

const ForecastSchema = z
  .object({
    fecha: z.string(),
    tempMaxC: z.number(),
    precipProb: z.number(),
    precipMm: z.number(),
    nubosidad: z.number(),
    vientoKmh: z.number(),
    uvIndex: z.number(),
    tempAguaC: z.number().optional(),
    oleajeM: z.number().optional(),
    mareas: z.array(TideEventSchema).optional(),
  })
  .passthrough();

/**
 * Descarga y valida un bundle. Devuelve el dato original (con todos sus campos) una
 * vez comprobada la forma: `passthrough` no descarta claves y evita falsos negativos.
 */
async function fetchValidated<T>(url: string, schema: z.ZodTypeAny): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`No se pudo cargar ${url} (${res.status})`);
  const data: unknown = await res.json();
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const where = issue?.path.length ? issue.path.join('.') : 'raíz';
    throw new Error(
      `Datos inválidos en ${url}: ${where} — ${issue?.message ?? 'esquema inesperado'}`,
    );
  }
  return data as T;
}

export async function loadAppData(): Promise<AppData> {
  const [bases, playas, rutas, forecast] = await Promise.all([
    fetchValidated<Base[]>('/data/meta/bases.json', z.array(BaseSchema)),
    fetchValidated<Playa[]>('/data/catalog/playas.json', z.array(PlayaSchema)),
    fetchValidated<Ruta[]>('/data/catalog/rutas.json', z.array(RutaSchema)),
    fetchValidated<ForecastIndex>('/data/forecast/latest.json', z.record(ForecastSchema)),
  ]);
  return { bases, playas, rutas, forecast };
}
