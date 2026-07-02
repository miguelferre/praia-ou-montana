import { useState } from 'react';
import type { Dict } from '@/i18n';
import { geocode, reverseGeocode, type GeoPlace } from '@/lib/data/geocode';

type Status = 'idle' | 'busy' | 'notfound';

/** Base libre: busca un lugar (Nominatim) o usa el GPS del navegador y devuelve el
 *  punto elegido. La E/S vive aquí (widget), no en la lib pura. */
export function BaseSearch({ onPick, dict }: { onPick: (p: GeoPlace) => void; dict: Dict }) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<Status>('idle');

  async function search() {
    const q = query.trim();
    if (!q || status === 'busy') return;
    setStatus('busy');
    try {
      const [first] = await geocode(q);
      if (!first) return setStatus('notfound');
      onPick(first);
      setQuery('');
      setStatus('idle');
    } catch {
      setStatus('notfound');
    }
  }

  function useLocation() {
    if (!navigator.geolocation || status === 'busy') return setStatus('notfound');
    setStatus('busy');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords;
        const nombre = await reverseGeocode(lat, lon, dict.controls.myLocation);
        onPick({ nombre, lat, lon });
        setStatus('idle');
      },
      () => setStatus('notfound'),
    );
  }

  return (
    <div className="base-search">
      <div className="base-search-row">
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (status === 'notfound') setStatus('idle');
          }}
          onKeyDown={(e) => e.key === 'Enter' && search()}
          placeholder={dict.controls.basePlaceholder}
          aria-label={dict.controls.basePlaceholder}
        />
        <button type="button" onClick={search} disabled={status === 'busy'}>
          {status === 'busy' ? dict.controls.baseSearching : dict.controls.baseSearch}
        </button>
        <button
          type="button"
          className="loc-btn"
          onClick={useLocation}
          disabled={status === 'busy'}
          title={dict.controls.myLocation}
          aria-label={dict.controls.myLocation}
        >
          <span aria-hidden="true">📍</span>
        </button>
      </div>
      {status === 'notfound' && (
        <span className="base-search-msg" role="status">
          {dict.controls.baseNotFound}
        </span>
      )}
    </div>
  );
}
