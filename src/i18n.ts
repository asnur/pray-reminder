// Runtime translations (status bar, notifications, dashboard).
// Manifest strings (command titles, setting descriptions) live in package.nls*.json.

export type Lang = 'id' | 'en';
export type LanguageSetting = Lang | 'auto';

const id = {
  // Prayer names
  'prayer.imsak': 'Imsak',
  'prayer.fajr': 'Subuh',
  'prayer.sunrise': 'Terbit',
  'prayer.dhuhr': 'Dzuhur',
  'prayer.jumuah': 'Jumat',
  'prayer.asr': 'Ashar',
  'prayer.maghrib': 'Maghrib',
  'prayer.isha': 'Isya',

  // Short durations
  'dur.lessThanMinute': '<1m',
  'dur.hm': '{0}j {1}m',
  'dur.m': '{0}m',

  // Status bar
  'status.fallback': 'Jadwal sholat',
  'status.nextName': 'Waktu Sholat Berikutnya',
  'status.ramadanName': 'Countdown Ramadhan',
  'status.tooltipTitle': 'Jadwal Sholat — {0}',
  'status.tooltipFoot': 'Metode: {0} · klik untuk membuka dashboard',
  'status.ramadanIn': '🌙 Ramadhan {0} hari lagi',
  'status.ramadanDay': '🌙 Ramadhan hari ke-{0} · Lebaran {1} hari lagi',
  'status.ramadanTipBefore': '1 Ramadhan {0} H — {1} (perkiraan, ikuti sidang isbat)',
  'status.ramadanTipDuring': 'Ramadhan {0} H — Idul Fitri {1} (perkiraan)',

  // Notifications
  'notify.imsak': '🌙 Waktu Imsak ({0}) — segera akhiri sahur.',
  'notify.iftar': '🌙 Waktunya berbuka puasa & sholat Maghrib ({0}). Selamat berbuka!',
  'notify.jumuah': '🕌 Waktunya sholat Jumat ({0}). Simpan kerjaan, yuk ke masjid!',
  'notify.prayer': '🕌 Waktunya sholat {0} ({1}). Simpan kerjaan dulu, yuk sholat!',
  'notify.before': '⏰ {0} lagi masuk {1} ({2}). Siap-siap ya.',
  'notify.beforeTarget': 'waktu {0}',
  'notify.ok': 'Oke',
  'notify.okPray': 'Siap, sholat dulu 🙏',
  'notify.snooze': 'Ingatkan 5 menit lagi',

  // Set location
  'loc.pickTitle': 'Pilih lokasi untuk jadwal sholat',
  'loc.manual': '$(edit) Masukkan koordinat manual…',
  'loc.coordsTitle': 'Koordinat (latitude, longitude)',
  'loc.coordsInvalid': 'Format: latitude, longitude (mis. -6.2088, 106.8456)',
  'loc.nameTitle': 'Nama lokasi (opsional)',
  'loc.defaultName': 'Lokasi saya',
  'loc.saved': 'Lokasi jadwal sholat diatur ke {0}.',

  // Dashboard
  'wv.towards': 'Menuju',
  'wv.at': 'pukul {0}',
  'wv.tomorrow': 'besok',
  'wv.justEntered': '🕌 Sudah masuk waktu {0}',
  'wv.today': 'Jadwal Hari Ini',
  'wv.notPrayer': 'bukan waktu sholat',
  'wv.now': 'sekarang',
  'wv.setLocation': 'Atur Lokasi',
  'wv.testReminder': 'Tes Notifikasi',
  'wv.settings': 'Pengaturan',
  'wv.ramadanKickerBefore': 'Menuju Ramadhan',
  'wv.ramadanKickerDuring': 'Marhaban ya Ramadhan',
  'wv.ramadanTitle': 'Ramadhan {0} H',
  'wv.days': 'hari',
  'wv.hours': 'jam',
  'wv.minutes': 'menit',
  'wv.seconds': 'detik',
  'wv.dayOf': 'hari dari {0}',
  'wv.iftarIn': 'Buka puasa dalam',
  'wv.imsakIn': 'Imsak dalam',
  'wv.ramadanStart': '1 Ramadhan: {0}',
  'wv.eid': 'Idul Fitri: {0}',
  'wv.ramadanFoot': 'Perkiraan kalender Umm al-Qura · tanggal resmi mengikuti sidang isbat',
};

export type MsgKey = keyof typeof id;

const en: Record<MsgKey, string> = {
  'prayer.imsak': 'Imsak',
  'prayer.fajr': 'Fajr',
  'prayer.sunrise': 'Sunrise',
  'prayer.dhuhr': 'Dhuhr',
  'prayer.jumuah': "Jumu'ah",
  'prayer.asr': 'Asr',
  'prayer.maghrib': 'Maghrib',
  'prayer.isha': 'Isha',

  'dur.lessThanMinute': '<1m',
  'dur.hm': '{0}h {1}m',
  'dur.m': '{0}m',

  'status.fallback': 'Prayer times',
  'status.nextName': 'Next Prayer Time',
  'status.ramadanName': 'Ramadan Countdown',
  'status.tooltipTitle': 'Prayer Times — {0}',
  'status.tooltipFoot': 'Method: {0} · click to open the dashboard',
  'status.ramadanIn': '🌙 Ramadan in {0} days',
  'status.ramadanDay': '🌙 Ramadan day {0} · Eid in {1} days',
  'status.ramadanTipBefore': '1 Ramadan {0} AH — {1} (estimate, follow your local authority)',
  'status.ramadanTipDuring': 'Ramadan {0} AH — Eid al-Fitr {1} (estimate)',

  'notify.imsak': '🌙 Imsak time ({0}) — time to finish suhoor.',
  'notify.iftar': "🌙 Time to break your fast & pray Maghrib ({0}). Enjoy your iftar!",
  'notify.jumuah': "🕌 It's time for Jumu'ah prayer ({0}). Save your work and head to the mosque!",
  'notify.prayer': "🕌 It's time for {0} prayer ({1}). Save your work and go pray!",
  'notify.before': '⏰ {1} starts in {0} ({2}). Get ready.',
  'notify.beforeTarget': '{0}',
  'notify.ok': 'OK',
  'notify.okPray': "I'm going to pray 🙏",
  'notify.snooze': 'Remind me in 5 minutes',

  'loc.pickTitle': 'Choose a location for prayer times',
  'loc.manual': '$(edit) Enter coordinates manually…',
  'loc.coordsTitle': 'Coordinates (latitude, longitude)',
  'loc.coordsInvalid': 'Format: latitude, longitude (e.g. -6.2088, 106.8456)',
  'loc.nameTitle': 'Location name (optional)',
  'loc.defaultName': 'My location',
  'loc.saved': 'Prayer times location set to {0}.',

  'wv.towards': 'Next',
  'wv.at': 'at {0}',
  'wv.tomorrow': 'tomorrow',
  'wv.justEntered': "🕌 It's {0} time",
  'wv.today': "Today's Schedule",
  'wv.notPrayer': 'not a prayer time',
  'wv.now': 'now',
  'wv.setLocation': 'Set Location',
  'wv.testReminder': 'Test Reminder',
  'wv.settings': 'Settings',
  'wv.ramadanKickerBefore': 'Counting down to Ramadan',
  'wv.ramadanKickerDuring': 'Ramadan Mubarak',
  'wv.ramadanTitle': 'Ramadan {0} AH',
  'wv.days': 'days',
  'wv.hours': 'hours',
  'wv.minutes': 'min',
  'wv.seconds': 'sec',
  'wv.dayOf': 'day of {0}',
  'wv.iftarIn': 'Iftar in',
  'wv.imsakIn': 'Imsak in',
  'wv.ramadanStart': '1 Ramadan: {0}',
  'wv.eid': 'Eid al-Fitr: {0}',
  'wv.ramadanFoot': 'Umm al-Qura estimate · official dates follow moon sighting',
};

const DICTS: Record<Lang, Record<MsgKey, string>> = { id, en };

/** BCP 47 locale used for date formatting. */
export const LOCALES: Record<Lang, string> = { id: 'id-ID', en: 'en-GB' };

/** `auto` follows the IDE display language; anything other than Indonesian falls back to English. */
export function resolveLang(setting: string | undefined, uiLanguage: string): Lang {
  if (setting === 'id' || setting === 'en') return setting;
  return uiLanguage.toLowerCase().startsWith('id') ? 'id' : 'en';
}

export function format(template: string, args: ReadonlyArray<string | number>): string {
  return template.replace(/\{(\d+)\}/g, (m, i: string) => (args[Number(i)] !== undefined ? String(args[Number(i)]) : m));
}

export function t(lang: Lang, key: MsgKey, ...args: Array<string | number>): string {
  return format(DICTS[lang][key], args);
}

/** Full dictionary for one language — sent to the webview. */
export function dictionary(lang: Lang): Record<MsgKey, string> {
  return DICTS[lang];
}
