// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

// Praia ou montaña — sitio estático con una sola isla React (el dashboard).
// La i18n tiene espejo de rutas: / (es) y /gl/ (gl), con <head> y hreflang
// pre-renderizados por idioma (SEO multilingüe). El dashboard es la misma isla
// client:only en ambas rutas; el idioma se lo fija la ruta y el toggle navega.
// https://astro.build/config
export default defineConfig({
  site: 'https://praiaoumontana.gal',
  output: 'static',
  integrations: [react()],
});
