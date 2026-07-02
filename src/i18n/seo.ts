import type { Lang } from './index';

/** Metadatos de la cáscara HTML por idioma (los pre-renderiza Astro, no la isla). */
export interface SeoMeta {
  title: string;
  description: string;
  ogLocale: string;
}

export const SEO: Record<Lang, SeoMeta> = {
  es: {
    title: 'Praia ou montaña — ¿playa o ruta hoy en Galicia?',
    description:
      '¿Playa o ruta hoy en Galicia? Un veredicto del día según el tiempo, las horas de luz y el tiempo de viaje desde tu base, con el ranking de destinos y su desglose.',
    ogLocale: 'es_ES',
  },
  gl: {
    title: 'Praia ou montaña — praia ou ruta hoxe en Galicia?',
    description:
      'Praia ou ruta hoxe en Galicia? Un veredito do día segundo o tempo, as horas de luz e o tempo de viaxe desde a túa base, co ranking de destinos e o seu desglose.',
    ogLocale: 'gl_ES',
  },
};
