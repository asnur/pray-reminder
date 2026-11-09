// Builds the daily schedule (today, tomorrow, yesterday's Isha) from the config.
// Does not depend on `vscode`, so it can be tested directly with Node.

import { dictionary, LOCALES, t, type Lang } from './i18n';
import { getPrayerTimes, type PrayerOptions } from './prayTimes';
import { formatHijri, getRamadanInfo, type RamadanInfo } from './ramadan';
import type { DashboardData, PrayerEntry, PrayerKey } from './shared/types';

export interface Config extends PrayerOptions {
  lang: Lang;
  method: string;
  locationName: string;
  remindBefore: number;
  modal: boolean;
  hijriOffset: number;
  showRamadan: boolean;
}

export interface Prayer {
  key: PrayerKey;
  label: string;
  time: Date;
}

export interface Snapshot {
  now: Date;
  cfg: Config;
  ramadan: RamadanInfo | null;
  inRamadan: boolean;
  today: Prayer[];
  tomorrow: Prayer[];
  yesterdayIsha: Date | null;
  /** next prayer time (excluding sunrise; Imsak only during Ramadan) */
  next: Prayer | undefined;
}

const ORDER: PrayerKey[] = ['imsak', 'fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];

/** Whether this entry gets reminders and a countdown. */
export const isReminder = (key: PrayerKey, inRamadan: boolean) =>
  key !== 'sunrise' && (key !== 'imsak' || inRamadan);

function scheduleFor(date: Date, cfg: Config): Prayer[] {
  const times = getPrayerTimes(date, cfg);
  const isFriday = date.getDay() === 5;
  const list: Prayer[] = [];
  for (const key of ORDER) {
    const time = times[key];
    if (!time) continue;
    const label = t(cfg.lang, key === 'dhuhr' && isFriday ? 'prayer.jumuah' : `prayer.${key}`);
    list.push({ key, label, time });
  }
  return list;
}

export function snapshot(cfg: Config, now = new Date()): Snapshot {
  const ramadan = getRamadanInfo(now, cfg.hijriOffset);
  const inRamadan = Boolean(ramadan?.inRamadan);
  const day = (n: number) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + n);
  const today = scheduleFor(now, cfg);
  const tomorrow = scheduleFor(day(1), cfg);
  const yesterdayIsha = scheduleFor(day(-1), cfg).find((p) => p.key === 'isha')?.time ?? null;
  const next = [...today, ...tomorrow].find((p) => isReminder(p.key, inRamadan) && p.time > now);
  return { now, cfg, ramadan, inRamadan, today, tomorrow, yesterdayIsha, next };
}

export function toDashboardData(s: Snapshot): DashboardData {
  const entry = (p: Prayer): PrayerEntry => ({ key: p.key, label: p.label, time: p.time.getTime() });
  const r = s.ramadan;
  const locale = LOCALES[s.cfg.lang];
  return {
    lang: s.cfg.lang,
    locale,
    strings: dictionary(s.cfg.lang),
    location: s.cfg.locationName,
    method: s.cfg.method,
    hijriLabel: formatHijri(s.now, s.cfg.hijriOffset, locale),
    inRamadan: s.inRamadan,
    yesterdayIsha: s.yesterdayIsha?.getTime() ?? null,
    today: s.today.map(entry),
    tomorrow: s.tomorrow.map(entry),
    ramadan:
      r && s.cfg.showRamadan
        ? { inRamadan: r.inRamadan, year: r.year, start: r.start.getTime(), end: r.end.getTime(), day: r.day, length: r.length }
        : null,
  };
}
