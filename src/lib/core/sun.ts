import SunCalc from 'suncalc';

/**
 * Sol y puesta de sol EFECTIVA (el diferenciador del producto).
 *
 * En v0 no hay perfil de horizonte: la puesta efectiva = puesta astronómica.
 * En v1 se pasa `horizonProfile` (de PVGIS) y la puesta efectiva es el instante
 * en que la altitud del sol cae por debajo del horizonte real (un monte al oeste
 * adelanta la puesta: justo el matiz de "un lado de la ría pierde el sol antes").
 */

const DEG = 180 / Math.PI;

export interface SunInfo {
  sunrise: Date;
  solarNoon: Date;
  /** Puesta de sol astronómica (horizonte plano). */
  sunset: Date;
  /** Puesta efectiva considerando la orografía (== astronómica si no hay perfil). */
  effectiveSunset: Date;
  /** Minutos de sol entre el mediodía solar y la puesta efectiva (independiente de zona horaria). */
  afternoonSunMinutes: number;
}

/**
 * Convención del perfil PVGIS (a verificar con un fixture real en v1, ver
 * docs/DATA.md): índice `i` → azimut sur-referenciado `az_i = -180 + i·(360/N)`,
 * con oeste positivo, igual que el azimut de SunCalc. Devuelve el ángulo de
 * elevación del horizonte (grados) en `azSouthDegrees`, interpolado linealmente.
 */
export function horizonElevationDeg(profile: number[], azSouthDegrees: number): number {
  const n = profile.length;
  if (n === 0) return 0;
  const step = 360 / n;
  let az = azSouthDegrees;
  while (az < -180) az += 360;
  while (az >= 180) az -= 360;
  const pos = (az + 180) / step;
  const i0 = Math.floor(pos) % n;
  const i1 = (i0 + 1) % n;
  const frac = pos - Math.floor(pos);
  const v0 = profile[i0] ?? 0;
  const v1 = profile[i1] ?? 0;
  return v0 + (v1 - v0) * frac;
}

function findEffectiveSunset(
  lat: number,
  lon: number,
  profile: number[],
  start: Date,
  end: Date,
): Date {
  const stepMs = 60 * 1000; // 1 minuto
  for (let t = start.getTime(); t <= end.getTime(); t += stepMs) {
    const when = new Date(t);
    const pos = SunCalc.getPosition(when, lat, lon);
    const altDeg = pos.altitude * DEG;
    const horizon = horizonElevationDeg(profile, pos.azimuth * DEG);
    if (altDeg <= horizon) return when;
  }
  return end;
}

/** Calcula los instantes de sol del día para una coordenada. */
export function computeSun(
  date: Date,
  lat: number,
  lon: number,
  horizonProfile?: number[],
): SunInfo {
  const times = SunCalc.getTimes(date, lat, lon);
  const { sunrise, solarNoon, sunset } = times;
  const effectiveSunset =
    horizonProfile && horizonProfile.length > 0
      ? findEffectiveSunset(lat, lon, horizonProfile, solarNoon, sunset)
      : sunset;
  const afternoonSunMinutes = Math.max(
    0,
    (effectiveSunset.getTime() - solarNoon.getTime()) / 60_000,
  );
  return { sunrise, solarNoon, sunset, effectiveSunset, afternoonSunMinutes };
}
