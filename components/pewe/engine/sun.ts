/**
 * Pewe's real sky: where the sun is right now, what colour the air is, and
 * which season the fields are in.
 */

export const PEWE_LAT = 17.5605;
export const PEWE_LNG = 73.2422;

const rad = Math.PI / 180;

/** Solar elevation and azimuth (degrees, azimuth clockwise from north). NOAA approximation. */
export function sunPosition(date: Date, lat = PEWE_LAT, lng = PEWE_LNG) {
  const jd = date.getTime() / 86400000 + 2440587.5;
  const t = (jd - 2451545.0) / 36525;
  const l0 = (280.46646 + t * (36000.76983 + t * 0.0003032)) % 360;
  const m = 357.52911 + t * (35999.05029 - 0.0001537 * t);
  const e = 0.016708634 - t * (0.000042037 + 0.0000001267 * t);
  const c =
    Math.sin(m * rad) * (1.914602 - t * (0.004817 + 0.000014 * t)) +
    Math.sin(2 * m * rad) * (0.019993 - 0.000101 * t) +
    Math.sin(3 * m * rad) * 0.000289;
  const trueLong = l0 + c;
  const omega = 125.04 - 1934.136 * t;
  const lambda = trueLong - 0.00569 - 0.00478 * Math.sin(omega * rad);
  const eps0 = 23 + (26 + (21.448 - t * (46.815 + t * (0.00059 - t * 0.001813))) / 60) / 60;
  const eps = eps0 + 0.00256 * Math.cos(omega * rad);
  const decl = Math.asin(Math.sin(eps * rad) * Math.sin(lambda * rad));
  const y = Math.tan((eps / 2) * rad) ** 2;
  const eqTime =
    4 *
    (y * Math.sin(2 * l0 * rad) -
      2 * e * Math.sin(m * rad) +
      4 * e * y * Math.sin(m * rad) * Math.cos(2 * l0 * rad) -
      0.5 * y * y * Math.sin(4 * l0 * rad) -
      1.25 * e * e * Math.sin(2 * m * rad)) /
    rad;
  const utcMin = date.getUTCHours() * 60 + date.getUTCMinutes() + date.getUTCSeconds() / 60;
  let tst = (utcMin + eqTime + 4 * lng) % 1440;
  if (tst < 0) tst += 1440;
  let ha = tst / 4 - 180;
  if (ha < -180) ha += 360;
  const latR = lat * rad;
  const cosZen = Math.sin(latR) * Math.sin(decl) + Math.cos(latR) * Math.cos(decl) * Math.cos(ha * rad);
  const zen = Math.acos(Math.min(Math.max(cosZen, -1), 1));
  const elevation = 90 - zen / rad;
  let az =
    Math.acos(
      Math.min(Math.max((Math.sin(latR) * Math.cos(zen) - Math.sin(decl)) / (Math.cos(latR) * Math.sin(zen)), -1), 1),
    ) / rad;
  az = ha > 0 ? (az + 180) % 360 : (540 - az) % 360;
  return { elevation, azimuth: az };
}

/** The moon, roughly opposite the sun, high enough to light the night. */
export function moonPosition(sunAz: number) {
  return { elevation: 42, azimuth: (sunAz + 160) % 360 };
}

/** Wall-clock parts in Pewe (IST, UTC+5:30), whatever the visitor's own zone. */
export function peweClock(date: Date) {
  const ist = new Date(date.getTime() + 330 * 60000);
  const h = ist.getUTCHours();
  const m = ist.getUTCMinutes();
  return { hours: h, minutes: m, month: ist.getUTCMonth() + 1, day: ist.getUTCDate() };
}

export function formatClock(date: Date) {
  const { hours, minutes } = peweClock(date);
  const h12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${h12}:${String(minutes).padStart(2, "0")} ${hours < 12 ? "am" : "pm"}`;
}

export type Season = "monsoon" | "harvest" | "winter" | "summer";

export function seasonOf(month: number): Season {
  if (month >= 6 && month <= 9) return "monsoon";
  if (month >= 10 && month <= 11) return "harvest";
  if (month === 12 || month <= 2) return "winter";
  return "summer";
}

type RGB = [number, number, number];
const hex = (h: string): RGB => [
  parseInt(h.slice(1, 3), 16) / 255,
  parseInt(h.slice(3, 5), 16) / 255,
  parseInt(h.slice(5, 7), 16) / 255,
];

/** Sky and light keyed by the sun's elevation. Colours are sRGB. */
const KEYS: {
  el: number;
  zenith: RGB;
  horizon: RGB;
  sun: RGB;
  sunI: number;
  hemiSky: RGB;
  hemiGround: RGB;
  hemiI: number;
}[] = [
  { el: -18, zenith: hex("#0a1730"), horizon: hex("#23324f"), sun: hex("#a9bde6"), sunI: 0.32, hemiSky: hex("#4a6196"), hemiGround: hex("#1c2029"), hemiI: 0.95 },
  { el: -8, zenith: hex("#132650"), horizon: hex("#46557a"), sun: hex("#a9bde6"), sunI: 0.3, hemiSky: hex("#566c9c"), hemiGround: hex("#22242b"), hemiI: 0.95 },
  { el: -2, zenith: hex("#29426b"), horizon: hex("#c98d6c"), sun: hex("#ff8a4a"), sunI: 0.35, hemiSky: hex("#6b6f8f"), hemiGround: hex("#3a2c26"), hemiI: 0.5 },
  { el: 4, zenith: hex("#4f74a6"), horizon: hex("#eeb487"), sun: hex("#ffa463"), sunI: 1.6, hemiSky: hex("#b4b1c0"), hemiGround: hex("#6e553f"), hemiI: 1.0 },
  { el: 12, zenith: hex("#6c94c6"), horizon: hex("#f0d0a8"), sun: hex("#ffc995"), sunI: 2.7, hemiSky: hex("#cfd3dc"), hemiGround: hex("#857258"), hemiI: 1.35 },
  { el: 28, zenith: hex("#6f9dd2"), horizon: hex("#d9e3e8"), sun: hex("#fff0dc"), sunI: 3.0, hemiSky: hex("#dde6ee"), hemiGround: hex("#857a64"), hemiI: 1.45 },
  { el: 70, zenith: hex("#5f93cf"), horizon: hex("#e1eaee"), sun: hex("#ffffff"), sunI: 3.2, hemiSky: hex("#e3ecf2"), hemiGround: hex("#887e6a"), hemiI: 1.5 },
];

const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

export interface SkyState {
  zenith: RGB;
  horizon: RGB;
  sun: RGB;
  sunI: number;
  hemiSky: RGB;
  hemiGround: RGB;
  hemiI: number;
  /** 0 day … 1 full night */
  night: number;
  stars: number;
}

export function skyFor(elevation: number, cloud: number, rain: boolean): SkyState {
  let i = 0;
  while (i < KEYS.length - 2 && elevation > KEYS[i + 1].el) i++;
  const a = KEYS[i];
  const b = KEYS[i + 1];
  const t = Math.min(Math.max((elevation - a.el) / (b.el - a.el), 0), 1);
  const s: SkyState = {
    zenith: mix(a.zenith, b.zenith, t),
    horizon: mix(a.horizon, b.horizon, t),
    sun: mix(a.sun, b.sun, t),
    sunI: a.sunI + (b.sunI - a.sunI) * t,
    hemiSky: mix(a.hemiSky, b.hemiSky, t),
    hemiGround: mix(a.hemiGround, b.hemiGround, t),
    hemiI: a.hemiI + (b.hemiI - a.hemiI) * t,
    night: Math.min(Math.max((2 - elevation) / 10, 0), 1),
    stars: Math.min(Math.max((-6 - elevation) / 8, 0), 1),
  };
  // Monsoon cloud and rain: flatten the sky toward wet grey, soften the sun.
  const overcast = Math.min(1, cloud * 0.8 + (rain ? 0.45 : 0));
  if (overcast > 0) {
    const day = 1 - s.night;
    const grey: RGB = mix(hex("#1a1f26"), hex("#a7adb0"), day);
    const greyTop: RGB = mix(hex("#11151b"), hex("#8e979c"), day);
    s.horizon = mix(s.horizon, grey, overcast * 0.85);
    s.zenith = mix(s.zenith, greyTop, overcast * 0.85);
    s.sunI *= 1 - overcast * 0.7;
    s.hemiI *= 1 + overcast * 0.25 * day;
    s.hemiSky = mix(s.hemiSky, grey, overcast * 0.6);
    s.stars *= 1 - overcast;
  }
  return s;
}

/** Paddy, hills and creek through the year. sRGB. */
export function seasonColours(season: Season) {
  switch (season) {
    case "monsoon":
      return { field: hex("#7aa645"), fieldMix: 0.85, forest: hex("#f4fbea"), water: hex("#6f5d40") };
    case "harvest":
      return { field: hex("#c4b45e"), fieldMix: 0.9, forest: hex("#ffffff"), water: hex("#556659") };
    case "winter":
      return { field: hex("#b29a69"), fieldMix: 0.8, forest: hex("#d4d6bf"), water: hex("#4b5f5a") };
    case "summer":
      return { field: hex("#a98a5c"), fieldMix: 0.8, forest: hex("#c8c3a6"), water: hex("#4a5a55") };
  }
}
