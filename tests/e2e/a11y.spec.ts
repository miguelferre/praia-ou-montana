import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route(/openfreemap\.org|tiles\.|\.pbf|\.mvt/, (route) => route.abort());
});

test('la página no tiene violaciones de accesibilidad graves', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Ajusta lo que te importa' })).toBeVisible();

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .exclude('.map') // el contenedor de MapLibre queda vacío al bloquear los tiles
    .analyze();

  const serias = results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  );
  // Mensaje legible si algo falla: qué regla y en qué selector.
  expect(serias.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`)).toEqual([]);
});
