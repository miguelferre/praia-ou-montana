import type { Dict } from '@/i18n';

// Fuentes de datos con enlace (nombres propios, iguales en es/gl). Las licencias
// completas viven en ATTRIBUTION.md; el pie las enlaza.
const SOURCES: { name: string; url: string }[] = [
  { name: 'Open-Meteo', url: 'https://open-meteo.com/' },
  { name: 'IDE Galicia', url: 'https://ideg.xunta.gal/' },
  { name: 'OpenStreetMap', url: 'https://www.openstreetmap.org/copyright' },
  { name: 'OpenFreeMap', url: 'https://openfreemap.org/' },
  { name: 'OSRM', url: 'https://project-osrm.org/' },
  { name: 'OpenRouteService', url: 'https://openrouteservice.org/' },
  { name: 'PVGIS', url: 'https://joint-research-centre.ec.europa.eu/pvgis_en' },
  { name: 'ADEAC', url: 'https://www.adeac.es/' },
];
const ATTRIBUTION_URL = 'https://github.com/miguelferre/praia-ou-montana/blob/main/ATTRIBUTION.md';

export function Footer({ dict }: { dict: Dict }) {
  return (
    <footer className="app-footer">
      {dict.footer.label}{' '}
      {SOURCES.map((s, i) => (
        <span key={s.name}>
          {i > 0 && ' · '}
          <a href={s.url} target="_blank" rel="noreferrer">
            {s.name}
          </a>
        </span>
      ))}
      . {dict.footer.note}{' '}
      <a href={ATTRIBUTION_URL} target="_blank" rel="noreferrer">
        {dict.footer.licenses}
      </a>
    </footer>
  );
}
