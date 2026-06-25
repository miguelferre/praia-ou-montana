// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

// Praia ou montaña — sitio estático con una sola isla React (el dashboard).
// La i18n (ES/GL) se resuelve en cliente con un toggle, no con espejo de rutas:
// es deliberado para el MVP personal (ver docs/DATA.md). El espejo + SEO llegan
// con la fase pública (v2).
// https://astro.build/config
export default defineConfig({
  site: 'https://praiaoumontana.gal',
  output: 'static',
  integrations: [react()],
});
