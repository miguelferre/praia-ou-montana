import { describe, expect, it } from 'vitest';
import { computeSun } from '@/lib/core/sun';
import type { Playa } from '@/lib/core/types';
// Fixture CONGELADO: dos playas reales con su perfil PVGIS. El test de lógica no debe
// depender del catálogo vivo (`public/data/catalog/playas.json`), que la ingesta
// regenera y que el bot commitea sin correr esta suite (F20). Regenerable desde el
// catálogo con el snippet de tests/unit/fixtures/README si esas playas cambian.
import fixture from '../fixtures/horizon-beaches.json';

const beaches = fixture as unknown as Playa[];

function beach(id: string): Playa {
  const p = beaches.find((b) => b.id === id);
  if (!p) throw new Error(`Playa no encontrada en el fixture: ${id}`);
  return p;
}

const VERANO = new Date('2026-07-15T12:00:00Z');

describe('puesta de sol efectiva con perfiles PVGIS reales (fixture congelado)', () => {
  it('los perfiles de horizonte del fixture tienen 48 puntos (azimut -180..172.5)', () => {
    for (const p of beaches) expect(p.horizonProfile).toHaveLength(48);
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
