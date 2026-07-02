import { defineConfig, devices } from '@playwright/test';

/**
 * E2E sobre el servidor de desarrollo (Astro + isla React). Los specs bloquean los
 * recursos externos del mapa (tiles) para no depender de la red: comprueban la app,
 * no MapLibre. Los tests que sí toquen servicios vivos se etiquetan `@live` y quedan
 * fuera de `npm run test:e2e` (`--grep-invert @live`).
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:4321',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:4321',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
