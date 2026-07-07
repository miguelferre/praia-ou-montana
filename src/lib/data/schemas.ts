import { z } from 'zod';

/**
 * Esquemas zod del contrato de datos servido. Fuente ÚNICA de la FORMA de los bundles:
 * los usa el cliente al cargar (`load.ts`) y un test los valida contra los JSON reales
 * de `public/data/` en el gate (`tests/unit/data/bundles.test.ts`). Así, lo que pasa el
 * gate carga en el navegador con el mismo esquema — no dos validadores que puedan
 * divergir (T4). Los validadores Python siguen aparte para las reglas de negocio
 * (bbox de Galicia, ids duplicados, cobertura del forecast), no para la forma.
 *
 * `passthrough` no descarta claves: valida la forma sin perder campos del bundle.
 */
export const TravelLegSchema = z.object({ cocheMin: z.number() }).passthrough();

export const BaseSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  lat: z.number(),
  lon: z.number(),
});

export const PlayaSchema = z
  .object({
    id: z.string(),
    nombre: z.string(),
    concello: z.string(),
    lat: z.number(),
    lon: z.number(),
    travel: z.record(TravelLegSchema),
  })
  .passthrough();

export const RutaSchema = z
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

export const TideEventSchema = z
  .object({ time: z.string(), type: z.enum(['high', 'low']), heightM: z.number().optional() })
  .passthrough();

export const ForecastSchema = z
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

/** Esquemas de colección tal como se sirven los bundles. */
export const BasesSchema = z.array(BaseSchema);
export const PlayasSchema = z.array(PlayaSchema);
export const RutasSchema = z.array(RutaSchema);
export const ForecastIndexSchema = z.record(ForecastSchema);
