import { test } from 'node:test';
import * as assert from 'node:assert';
import { resolveLang, t } from '../i18n';
import { getPrayerTimes, type PrayerOptions, type PrayerTimes } from '../prayTimes';
import { formatHijri, getRamadanInfo } from '../ramadan';
import { snapshot, toDashboardData, type Config } from '../schedule';

const JAKARTA: PrayerOptions = { latitude: -6.2088, longitude: 106.8456, method: 'Kemenag', asr: 'Shafii', ihtiyat: 2 };

const config = (lang: Config['lang']): Config => ({
  ...JAKARTA,
  lang,
  method: 'Kemenag',
  locationName: 'Jakarta',
  remindBefore: 10,
  modal: false,
  hijriOffset: 0,
  showRamadan: true,
});

// Time in WIB (UTC+7), regardless of the time zone of the machine running the tests.
const wib = (d: Date | null) => {
  if (!d) return 'null';
  const shifted = new Date(d.getTime() + 7 * 3600e3);
  return `${String(shifted.getUTCHours()).padStart(2, '0')}:${String(shifted.getUTCMinutes()).padStart(2, '0')}`;
};
const minutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

test('Jakarta times match api.aladhan.com Kemenag method (within 2 minutes)', () => {
  // Reference: api.aladhan.com method=20 (Kemenag), without ihtiyat.
  const cases: Array<[Date, Record<keyof PrayerTimes, string>]> = [
    [new Date(2026, 1, 18, 12), { imsak: '04:29', fajr: '04:39', sunrise: '05:58', dhuhr: '12:07', asr: '15:17', maghrib: '18:15', isha: '19:26' }],
    [new Date(2026, 5, 20, 12), { imsak: '04:28', fajr: '04:38', sunrise: '06:01', dhuhr: '11:54', asr: '15:16', maghrib: '17:47', isha: '19:02' }],
    [new Date(2026, 10, 9, 12), { imsak: '03:54', fajr: '04:04', sunrise: '05:25', dhuhr: '11:36', asr: '14:57', maghrib: '17:48', isha: '19:00' }],
  ];
  for (const [date, expected] of cases) {
    const times = getPrayerTimes(date, { ...JAKARTA, ihtiyat: 0 });
    for (const [key, hhmm] of Object.entries(expected) as Array<[keyof PrayerTimes, string]>) {
      const diff = Math.abs(minutes(wib(times[key])) - minutes(hhmm));
      assert.ok(diff <= 2, `${date.toDateString()} ${key}: got ${wib(times[key])}, expected ${hhmm}`);
    }
  }
});

test('prayer times are in chronological order', () => {
  const times = getPrayerTimes(new Date(2026, 10, 9, 12), JAKARTA);
  const order = (['imsak', 'fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'] as const).map((k) => times[k]!.getTime());
  assert.deepStrictEqual([...order].sort((a, b) => a - b), order);
});

test('countdown to Ramadan 1448 AH', () => {
  const r = getRamadanInfo(new Date(2026, 10, 9, 10))!;
  assert.strictEqual(r.inRamadan, false);
  assert.strictEqual(r.year, 1448);
  assert.strictEqual(r.start.toDateString(), new Date(2027, 1, 8).toDateString());
  assert.strictEqual(r.daysLeft, 91);
  assert.strictEqual(r.length, 29);
});

test('during Ramadan: day N and hijri offset', () => {
  const r = getRamadanInfo(new Date(2027, 1, 10, 10))!;
  assert.strictEqual(r.inRamadan, true);
  assert.strictEqual(r.day, 3);

  const shifted = getRamadanInfo(new Date(2027, 1, 8, 10), 1)!;
  assert.strictEqual(shifted.inRamadan, false);
  assert.strictEqual(shifted.daysLeft, 1);
});

test('hijri date in Indonesian and English', () => {
  assert.strictEqual(formatHijri(new Date(2026, 10, 9, 10), 0, 'id-ID'), '29 Jumadilawal 1448 H');
  assert.strictEqual(formatHijri(new Date(2027, 1, 12, 10), 0, 'en-GB'), '5 Ramadan 1448 AH');
});

test("snapshot: Imsak only counts during Ramadan, Friday Dhuhr becomes Jumu'ah", () => {
  const beforeFajr = new Date(2026, 10, 13, 3, 0); // Friday before dawn, not Ramadan
  const s = snapshot(config('id'), beforeFajr);
  assert.strictEqual(s.next?.key, 'fajr');
  assert.strictEqual(s.today.find((p) => p.key === 'dhuhr')?.label, 'Jumat');

  const en = snapshot(config('en'), beforeFajr);
  assert.strictEqual(en.today.find((p) => p.key === 'dhuhr')?.label, "Jumu'ah");
  assert.strictEqual(en.today.find((p) => p.key === 'fajr')?.label, 'Fajr');

  const ramadanNight = snapshot(config('id'), new Date(2027, 1, 10, 3, 0));
  assert.strictEqual(ramadanNight.next?.key, 'imsak');
});

test('i18n: language resolution, placeholders, dashboard payload', () => {
  assert.strictEqual(resolveLang('auto', 'id'), 'id');
  assert.strictEqual(resolveLang('auto', 'en-us'), 'en');
  assert.strictEqual(resolveLang('auto', 'ja'), 'en');
  assert.strictEqual(resolveLang('id', 'en'), 'id');
  assert.strictEqual(t('id', 'status.ramadanIn', 91), '🌙 Ramadhan 91 hari lagi');
  assert.strictEqual(t('en', 'status.ramadanIn', 91), '🌙 Ramadan in 91 days');

  const data = toDashboardData(snapshot(config('en'), new Date(2026, 10, 9, 10)));
  assert.strictEqual(data.locale, 'en-GB');
  assert.strictEqual(data.strings['wv.today'], "Today's Schedule");
  assert.strictEqual(data.hijriLabel, '29 Jumada I 1448 AH');
});
