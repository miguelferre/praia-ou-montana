import { describe, expect, it } from 'vitest';
import { BasesSchema, ForecastIndexSchema, PlayasSchema, RutasSchema } from '@/lib/data/schemas';
import bases from '../../../public/data/meta/bases.json';
import playas from '../../../public/data/catalog/playas.json';
import rutas from '../../../public/data/catalog/rutas.json';
import forecast from '../../../public/data/forecast/latest.json';

/**
 * Valida los bundles REALES servidos con el mismo zod que usa el cliente (T4). Si la
 * ingesta escribe algo que zod rechazaría, se caza aquí, en el gate, en vez de que
 * reviente la carga en el navegador de cada usuario (loadAppData es todo-o-nada).
 * Al fallar, muestra el primer issue de zod para poder depurarlo.
 */
describe('los bundles servidos cumplen el contrato zod del cliente', () => {
  it('bases.json', () => {
    const r = BasesSchema.safeParse(bases);
    expect(r.success ? null : r.error.issues[0]).toBeNull();
  });

  it('playas.json', () => {
    const r = PlayasSchema.safeParse(playas);
    expect(r.success ? null : r.error.issues[0]).toBeNull();
  });

  it('rutas.json', () => {
    const r = RutasSchema.safeParse(rutas);
    expect(r.success ? null : r.error.issues[0]).toBeNull();
  });

  it('forecast/latest.json', () => {
    const r = ForecastIndexSchema.safeParse(forecast);
    expect(r.success ? null : r.error.issues[0]).toBeNull();
  });
});
