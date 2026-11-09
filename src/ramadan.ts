// Determines the Ramadan period (1 Ramadan to 1 Shawwal) using the built-in
// Intl Umm al-Qura calendar, falling back to a static table if it is unavailable.

const DAY = 86400e3;

// [hijri year, 1 Ramadan, 1 Shawwal] — generated from Intl islamic-umalqura.
const FALLBACK: ReadonlyArray<[number, string, string]> = [
  [1447, '2026-02-18', '2026-03-20'],
  [1448, '2027-02-08', '2027-03-09'],
  [1449, '2028-01-28', '2028-02-26'],
  [1450, '2029-01-16', '2029-02-14'],
  [1451, '2030-01-05', '2030-02-04'],
  [1452, '2030-12-26', '2031-01-24'],
  [1453, '2031-12-16', '2032-01-14'],
  [1454, '2032-12-04', '2033-01-03'],
  [1455, '2033-11-23', '2033-12-23'],
  [1456, '2034-11-12', '2034-12-12'],
  [1457, '2035-11-01', '2035-12-01'],
  [1458, '2036-10-21', '2036-11-19'],
  [1459, '2037-10-10', '2037-11-09'],
  [1460, '2038-09-30', '2038-10-29'],
  [1461, '2039-09-19', '2039-10-19'],
  [1462, '2040-09-08', '2040-10-07'],
];

export interface RamadanInfo {
  inRamadan: boolean;
  year: number;
  start: Date;
  end: Date;
  /** number of days in Ramadan (29 or 30) */
  length: number;
  /** day N of Ramadan (only during Ramadan) */
  day?: number;
  /** days until 1 Ramadan (only before Ramadan) */
  daysLeft?: number;
  /** days until 1 Shawwal (only during Ramadan) */
  daysToEid?: number;
}

interface Period {
  year: number;
  start: Date;
  end: Date;
}

function makeFormatter(locale: string, month: 'numeric' | 'long'): Intl.DateTimeFormat | null {
  try {
    const f = new Intl.DateTimeFormat(`${locale}-u-ca-islamic-umalqura`, { year: 'numeric', month, day: 'numeric' });
    return f.resolvedOptions().calendar === 'islamic-umalqura' ? f : null;
  } catch {
    return null;
  }
}

const numeric = makeFormatter('en-US', 'numeric');
const pretty = new Map<string, Intl.DateTimeFormat | null>();

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const addDays = (date: Date, n: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + n);
const daysBetween = (a: Date, b: Date) => Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / DAY);
// Use noon so DST transitions can't push the date to a neighbouring day.
const noon = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);

function hijri(f: Intl.DateTimeFormat, date: Date) {
  const parts: Partial<Record<Intl.DateTimeFormatPartTypes, string>> = {};
  for (const p of f.formatToParts(noon(date))) parts[p.type] = p.value;
  return { year: parseInt(parts.year ?? '', 10), month: Number(parts.month), day: Number(parts.day) };
}

function periodsFromIntl(f: Intl.DateTimeFormat, today: Date): Period[] {
  const periods: Period[] = [];
  let start: Date | null = null;
  let year = 0;
  for (let i = -31; i < 400 && periods.length < 2; i++) {
    const d = addDays(today, i);
    const h = hijri(f, d);
    if (h.month === 9 && h.day === 1) {
      start = d;
      year = h.year;
    } else if (h.month === 10 && h.day === 1 && start) {
      periods.push({ year, start, end: d });
      start = null;
    }
  }
  return periods;
}

function periodsFromTable(): Period[] {
  const parse = (s: string) => {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
  };
  return FALLBACK.map(([year, start, end]) => ({ year, start: parse(start), end: parse(end) }));
}

/**
 * Ramadan info relative to `now`.
 * offsetDays: shift the dates (e.g. +1 if your country starts a day after Umm al-Qura).
 */
export function getRamadanInfo(now: Date, offsetDays = 0): RamadanInfo | null {
  const today = startOfDay(now);
  const periods = numeric ? periodsFromIntl(numeric, today) : periodsFromTable();
  for (const p of periods) {
    const start = addDays(p.start, offsetDays);
    const end = addDays(p.end, offsetDays);
    if (today >= end) continue;
    const base = { year: p.year, start, end, length: daysBetween(start, end) };
    if (today >= start) {
      return { ...base, inRamadan: true, day: daysBetween(start, today) + 1, daysToEid: daysBetween(today, end) };
    }
    return { ...base, inRamadan: false, daysLeft: daysBetween(today, start) };
  }
  return null;
}

/** Hijri date, e.g. "29 Jumadilawal 1448 H" (id-ID) or "29 Jumada I 1448 AH" (en-GB). */
export function formatHijri(date: Date, offsetDays = 0, locale = 'id-ID'): string | null {
  if (!pretty.has(locale)) pretty.set(locale, makeFormatter(locale, 'long'));
  return pretty.get(locale)?.format(noon(addDays(date, -offsetDays))) ?? null;
}
