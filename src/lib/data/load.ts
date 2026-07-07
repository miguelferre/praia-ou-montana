import type { z } from 'zod';
import { BasesSchema, ForecastIndexSchema, PlayasSchema, RutasSchema } from '@/lib/data/schemas';
import type { Base, ForecastIndex, Playa, Ruta } from '@/lib/core/types';

/**
 * Carga de los bundles estáticos servidos en /data. El JSON lo escribe la ingesta
 * Python (fe ciega en el contrato); aquí se valida en runtime con zod para que un
 * bundle corrupto falle con un mensaje claro en vez de romper la UI a mitad de uso.
 * Los esquemas viven en `schemas.ts` (fuente única) y el mismo contrato se verifica en
 * el gate contra los JSON reales, así que lo que pasa CI carga en el navegador (T4).
 */
export interface AppData {
  bases: Base[];
  playas: Playa[];
  rutas: Ruta[];
  forecast: ForecastIndex;
}

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
    fetchValidated<Base[]>('/data/meta/bases.json', BasesSchema),
    fetchValidated<Playa[]>('/data/catalog/playas.json', PlayasSchema),
    fetchValidated<Ruta[]>('/data/catalog/rutas.json', RutasSchema),
    fetchValidated<ForecastIndex>('/data/forecast/latest.json', ForecastIndexSchema),
  ]);
  return { bases, playas, rutas, forecast };
}
