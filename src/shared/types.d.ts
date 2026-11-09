// Types shared by the extension host and the dashboard webview.

export type PrayerKey = 'imsak' | 'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

export interface PrayerEntry {
  key: PrayerKey;
  label: string;
  /** epoch ms */
  time: number;
}

export interface RamadanData {
  inRamadan: boolean;
  year: number;
  /** 00:00 on 1 Ramadan (epoch ms) */
  start: number;
  /** 00:00 on 1 Shawwal (epoch ms) */
  end: number;
  /** day N, only during Ramadan */
  day?: number;
  /** number of days in this year's Ramadan */
  length: number;
}

export type Lang = 'id' | 'en';

export interface DashboardData {
  lang: Lang;
  /** BCP 47 locale for date formatting, e.g. "id-ID" */
  locale: string;
  /** translation dictionary for the active language (see src/i18n.ts) */
  strings: Record<string, string>;
  location: string;
  method: string;
  hijriLabel: string | null;
  inRamadan: boolean;
  /** yesterday's Isha, used as the starting point before Fajr */
  yesterdayIsha: number | null;
  today: PrayerEntry[];
  tomorrow: PrayerEntry[];
  ramadan: RamadanData | null;
}

export type ToWebview = { type: 'data'; data: DashboardData };

export type WebviewCommand = 'pray.setLocation' | 'pray.testReminder' | 'pray.openSettings';

export type FromWebview =
  | { type: 'ready' }
  | { type: 'refresh' }
  | { type: 'command'; command: WebviewCommand }
  | { type: 'setLanguage'; lang: Lang };
