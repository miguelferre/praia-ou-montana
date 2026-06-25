import { describe, expect, it } from 'vitest';
import { computeSun } from '@/lib/core/sun';
import type { Playa } from '@/lib/core/types';
// Caso real con perfiles de horizonte de PVGIS ya grabados en el catálogo
// (regenerables con scripts/ingest/fetch_horizon.py).
import playasData from '../../../public/data/catalog/playas.json';

const catalog = playasData as unknown as Playa[];

function beach(id: string): Playa {
  const p = catalog.find((b) => b.id === id);
  if (!p) throw new Error(`Playa no encontrada: ${id}`);
  return p;
}

const VERANO = new Date('2026-07-15T12:00:00Z');

describe('puesta de sol efectiva con perfiles PVGIS reales', () => {
  it('los perfiles de horizonte tienen 48 puntos (azimut -180..172.5)', () => {
    for (const p of catalog) {
      if (p.horizonProfile) expect(p.horizonProfile).toHaveLength(48);
    }
  });

  it('en la ría de Muros, una playa con monte al oeste (Ancoradoiro) pierde el sol antes que una abierta (Carnota)', () => {
    const carnota = beach('carnota-area-maior');
    const ancoradoiro = beach('ancoradoiro-muros');
    const sCarnota = computeSun(VERANO, carnota.lat, carnota.lon, carnota.horizonProfile);
    const sAncoradoiro = computeSun(
      VERANO,
      ancoradoiro.lat,
      ancoradoiro.lon,
      ancoradoiro.horizonProfile,
    );
    expect(sAncoradoiro.effectiveSunset.getTime()).toBeLessThan(sCarnota.effectiveSunset.getTime());
    expect(sAncoradoiro.afternoonSunMinutes).toBeLessThan(sCarnota.afternoonSunMinutes);
  });
});
