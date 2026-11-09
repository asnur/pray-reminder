// Astronomical prayer time calculation (offline, no API).
// The sun position algorithm follows PrayTimes.org (Hamid Zarrabi-Zadeh).

interface MethodParams {
  fajr: number;
  isha?: number;
  /** Isha = this many minutes after Maghrib (e.g. Umm al-Qura) */
  ishaMinutes?: number;
}

export const METHODS = {
  Kemenag: { fajr: 20, isha: 18 }, // Ministry of Religious Affairs, Indonesia
  JAKIM: { fajr: 20, isha: 18 }, // Malaysia
  MUIS: { fajr: 20, isha: 18 }, // Singapore
  MWL: { fajr: 18, isha: 17 }, // Muslim World League
  ISNA: { fajr: 15, isha: 15 },
  Egypt: { fajr: 19.5, isha: 17.5 },
  Makkah: { fajr: 18.5, ishaMinutes: 90 }, // Umm al-Qura
  Karachi: { fajr: 18, isha: 18 },
} satisfies Record<string, MethodParams>;

export type MethodName = keyof typeof METHODS;

export interface PrayerOptions {
  latitude: number;
  longitude: number;
  method?: string;
  asr?: 'Shafii' | 'Hanafi';
  /** safety margin in minutes added to every time */
  ihtiyat?: number;
  /** Imsak = this many minutes before Fajr */
  imsakMinutes?: number;
}

export interface PrayerTimes {
  imsak: Date | null;
  fajr: Date | null;
  sunrise: Date | null;
  dhuhr: Date | null;
  asr: Date | null;
  maghrib: Date | null;
  isha: Date | null;
}

const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;
const sin = (d: number) => Math.sin(rad(d));
const cos = (d: number) => Math.cos(rad(d));
const tan = (d: number) => Math.tan(rad(d));
const asin = (x: number) => deg(Math.asin(x));
const acos = (x: number) => deg(Math.acos(x));
const atan2 = (y: number, x: number) => deg(Math.atan2(y, x));
const acot = (x: number) => deg(Math.atan(1 / x));
const fix = (a: number, b: number) => a - b * Math.floor(a / b);

function julian(year: number, month: number, day: number): number {
  if (month <= 2) {
    year -= 1;
    month += 12;
  }
  const A = Math.floor(year / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + B - 1524.5;
}

function sunPosition(jd: number): { decl: number; eqt: number } {
  const D = jd - 2451545.0;
  const g = fix(357.529 + 0.98560028 * D, 360);
  const q = fix(280.459 + 0.98564736 * D, 360);
  const L = fix(q + 1.915 * sin(g) + 0.02 * sin(2 * g), 360);
  const e = 23.439 - 0.00000036 * D;
  const RA = fix(atan2(cos(e) * sin(L), cos(L)) / 15, 24);
  return { decl: asin(sin(e) * sin(L)), eqt: q / 15 - RA };
}

/**
 * Compute prayer times for the local calendar day of `date` (time of day is ignored).
 * A null value means the time cannot be computed (e.g. extreme latitudes).
 */
export function getPrayerTimes(date: Date, opts: PrayerOptions): PrayerTimes {
  const { latitude: lat, longitude: lng } = opts;
  const params: MethodParams = METHODS[opts.method as MethodName] ?? METHODS.Kemenag;
  const asrFactor = opts.asr === 'Hanafi' ? 2 : 1;
  const ihtiyat = Number.isFinite(opts.ihtiyat) ? (opts.ihtiyat as number) : 2;
  const imsakMinutes = Number.isFinite(opts.imsakMinutes) ? (opts.imsakMinutes as number) : 10;

  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const jd = julian(y, m, d) - lng / (15 * 24);

  const midDay = (t: number) => fix(12 - sunPosition(jd + t / 24).eqt, 24);
  const angleTime = (angle: number, t: number, ccw = false) => {
    const { decl } = sunPosition(jd + t / 24);
    const T = acos((-sin(angle) - sin(decl) * sin(lat)) / (cos(decl) * cos(lat))) / 15;
    return midDay(t) + (ccw ? -T : T);
  };
  const asrTime = (t: number) => {
    const { decl } = sunPosition(jd + t / 24);
    return angleTime(-acot(asrFactor + tan(Math.abs(lat - decl))), t);
  };

  // Two passes so the sun's declination is evaluated close to each event's actual time.
  let t = { fajr: 5, sunrise: 6, dhuhr: 12, asr: 13, sunset: 18, isha: 18 };
  for (let i = 0; i < 2; i++) {
    t = {
      fajr: angleTime(params.fajr, t.fajr, true),
      sunrise: angleTime(0.833, t.sunrise, true),
      dhuhr: midDay(t.dhuhr),
      asr: asrTime(t.asr),
      sunset: angleTime(0.833, t.sunset),
      isha: params.isha !== undefined ? angleTime(params.isha, t.isha) : 18,
    };
  }
  if (params.ishaMinutes !== undefined) t.isha = t.sunset + params.ishaMinutes / 60;

  const base = Date.UTC(y, m - 1, d);
  const toDate = (hours: number, offsetMinutes: number, round: (x: number) => number) => {
    if (!Number.isFinite(hours)) return null;
    const ms = base + (hours - lng / 15) * 3600e3 + offsetMinutes * 60e3;
    return new Date(round(ms / 60e3) * 60e3);
  };

  const fajr = toDate(t.fajr, ihtiyat, Math.ceil);
  return {
    imsak: fajr && new Date(fajr.getTime() - imsakMinutes * 60e3),
    fajr,
    sunrise: toDate(t.sunrise, -ihtiyat, Math.floor),
    dhuhr: toDate(t.dhuhr, ihtiyat, Math.ceil),
    asr: toDate(t.asr, ihtiyat, Math.ceil),
    maghrib: toDate(t.sunset, ihtiyat, Math.ceil),
    isha: toDate(t.isha, ihtiyat, Math.ceil),
  };
}
