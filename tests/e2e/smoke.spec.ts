import { expect, test } from '@playwright/test';

// Bloquea tiles/estilo del mapa: los smoke tests validan la app, no MapLibre, y
// así no dependen de la red (convención del proyecto: los tests no tocan servicios).
test.beforeEach(async ({ page }) => {
  await page.route(/openfreemap\.org|tiles\.|\.pbf|\.mvt/, (route) => route.abort());
});

test('carga el dashboard con datos reales (zod acepta el catálogo)', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: /Praia/ })).toBeVisible();
  // Si la isla hidrata y los datos validan, aparecen los controles y los pesos;
  // si zod rechazara los bundles, se vería el aviso de error en su lugar.
  await expect(page.getByLabel('Tu base', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Ajusta lo que te importa' })).toBeVisible();
  await expect(page.getByText('⚠️')).toHaveCount(0);
});

test('el veredicto del día se renderiza', async ({ page }) => {
  await page.goto('/');
  // El encabezado del veredicto ("Hoy mejor…") siempre está; el resultado varía.
  await expect(page.getByText('Hoy mejor…')).toBeVisible();
});

test('el cambio de idioma ES→GL actualiza texto y URL', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'GL', exact: true }).click();
  await expect(page).toHaveURL(/lang=gl/);
  await expect(page.getByText(/hoxe en Galicia/i)).toBeVisible();
});

test('ajustar un peso lo persiste en la URL y sobrevive a la recarga', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('radio', { name: 'Cercanía: 5 de 5' }).click();
  await expect(page).toHaveURL(/[?&]w=/);

  await page.reload();
  await expect(page.getByRole('radio', { name: 'Cercanía: 5 de 5' })).toBeChecked();
});

test('elegir base la refleja en la URL', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Tu base', { exact: true }).selectOption({ label: 'Esteiro (Muros)' });
  await expect(page).toHaveURL(/base=esteiro/);
});
