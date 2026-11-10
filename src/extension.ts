import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { DashboardProvider } from './dashboard';
import { LOCALES, resolveLang, t, type Lang } from './i18n';
import { isReminder, snapshot, toDashboardData, type Config, type Prayer, type Snapshot } from './schedule';
import { ensureChime, expandHome, SoundPlayer } from './sound';

const TICK_MS = 20e3;
const GRACE_MS = 10 * 60e3; // the "it's time" notification is still sent up to 10 minutes late
const SNOOZE_MS = 5 * 60e3;

const CITIES: ReadonlyArray<[string, number, number]> = [
  ['Jakarta', -6.2088, 106.8456],
  ['Bogor', -6.5971, 106.806],
  ['Depok', -6.4025, 106.7942],
  ['Tangerang', -6.1783, 106.6319],
  ['Bekasi', -6.2383, 106.9756],
  ['Bandung', -6.9175, 107.6191],
  ['Semarang', -6.9667, 110.4167],
  ['Yogyakarta', -7.7956, 110.3695],
  ['Surabaya', -7.2575, 112.7521],
  ['Malang', -7.9666, 112.6326],
  ['Denpasar', -8.6705, 115.2126],
  ['Mataram', -8.5833, 116.1167],
  ['Kupang', -10.1772, 123.607],
  ['Banda Aceh', 5.5483, 95.3238],
  ['Medan', 3.5952, 98.6722],
  ['Padang', -0.9471, 100.4172],
  ['Pekanbaru', 0.5071, 101.4478],
  ['Palembang', -2.9761, 104.7754],
  ['Pontianak', -0.0263, 109.3425],
  ['Banjarmasin', -3.3186, 114.5944],
  ['Balikpapan', -1.2379, 116.8529],
  ['Makassar', -5.1477, 119.4327],
  ['Manado', 1.4748, 124.8421],
  ['Ambon', -3.6954, 128.1814],
  ['Jayapura', -2.5337, 140.7181],
  ['Kuala Lumpur', 3.139, 101.6869],
  ['Singapore', 1.3521, 103.8198],
];

let prayerItem: vscode.StatusBarItem;
let ramadanItem: vscode.StatusBarItem;
let soundItem: vscode.StatusBarItem;
let dashboard: DashboardProvider;
let player: SoundPlayer;
let storageDir: string;
let lockDir: string;
const notified = new Set<string>();
const warnedMissing = new Set<string>();

function getConfig(): Config {
  const c = vscode.workspace.getConfiguration('pray');
  return {
    lang: resolveLang(c.get('language', 'auto'), vscode.env.language),
    latitude: c.get('latitude', -6.2088),
    longitude: c.get('longitude', 106.8456),
    locationName: c.get('locationName', 'Jakarta'),
    method: c.get('method', 'Kemenag'),
    asr: c.get('asrMadhab', 'Shafii'),
    ihtiyat: c.get('ihtiyat', 2),
    imsakMinutes: c.get('imsakMinutes', 10),
    remindBefore: c.get('remindBeforeMinutes', 10),
    modal: c.get('modalNotification', false),
    hijriOffset: c.get('hijriOffset', 0),
    showRamadan: c.get('showRamadanCountdown', true),
    sound: {
      enabled: c.get('sound.enabled', true),
      file: c.get('sound.file', ''),
      fajrFile: c.get('sound.fajrFile', ''),
      volume: c.get('sound.volume', 80),
      beforeReminder: c.get('sound.beforeReminder', true),
    },
  };
}

const pad = (n: number) => String(n).padStart(2, '0');
const fmtTime = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const fmtDate = (d: Date, lang: Lang) =>
  d.toLocaleDateString(LOCALES[lang], { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

function fmtDuration(ms: number, lang: Lang): string {
  const mins = Math.ceil(ms / 60e3);
  if (mins < 1) return t(lang, 'dur.lessThanMinute');
  const h = Math.floor(mins / 60);
  return h ? t(lang, 'dur.hm', h, mins % 60) : t(lang, 'dur.m', mins);
}

// --- Notifications --------------------------------------------------------

/**
 * Make sure each event is notified only once even with several IDE windows
 * open: every window tries to create a lock file atomically (flag 'wx').
 */
function claim(key: string): boolean {
  if (notified.has(key)) return false;
  notified.add(key);
  try {
    fs.mkdirSync(lockDir, { recursive: true });
    fs.closeSync(fs.openSync(path.join(lockDir, key), 'wx'));
    return true;
  } catch (err) {
    return (err as { code?: string }).code !== 'EEXIST';
  }
}

function cleanupLocks(): void {
  try {
    const cutoff = Date.now() - 2 * 86400e3;
    for (const name of fs.readdirSync(lockDir)) {
      const file = path.join(lockDir, name);
      if (fs.statSync(file).mtimeMs < cutoff) fs.unlinkSync(file);
    }
  } catch {
    // folder doesn't exist yet — nothing to clean up
  }
}

function atTimeMessage(p: Prayer, inRamadan: boolean, lang: Lang): string {
  const at = fmtTime(p.time);
  if (p.key === 'imsak') return t(lang, 'notify.imsak', at);
  if (p.key === 'maghrib' && inRamadan) return t(lang, 'notify.iftar', at);
  if (p.key === 'dhuhr' && p.time.getDay() === 5) return t(lang, 'notify.jumuah', at);
  return t(lang, 'notify.prayer', p.label, at);
}

/** The configured adhan file if it exists, otherwise the built-in chime. */
function soundFile(file: string, lang: Lang): string {
  if (file) {
    const full = expandHome(file);
    if (fs.existsSync(full)) return full;
    if (!warnedMissing.has(full)) {
      warnedMissing.add(full);
      vscode.window.showWarningMessage(t(lang, 'sound.missing', full));
    }
  }
  return ensureChime(storageDir);
}

/** Adhan for prayer times; the chime for Imsak, snoozes and early reminders (`p` = null). */
function playFor(p: Prayer | null, cfg: Config): void {
  if (!cfg.sound.enabled) return;
  const adhan = p && p.key !== 'imsak' ? (p.key === 'fajr' && cfg.sound.fajrFile) || cfg.sound.file : '';
  player.play(soundFile(adhan, cfg.lang), cfg.sound.volume);
}

async function notifyAt(p: Prayer, inRamadan: boolean, cfg: Config, snoozed = false): Promise<void> {
  playFor(snoozed ? null : p, cfg);
  const ok = t(cfg.lang, p.key === 'imsak' ? 'notify.ok' : 'notify.okPray');
  const snooze = t(cfg.lang, 'notify.snooze');
  const stop = t(cfg.lang, 'notify.stopSound');
  const actions = player.playing ? [ok, snooze, stop] : [ok, snooze];
  const choice = await vscode.window.showWarningMessage(atTimeMessage(p, inRamadan, cfg.lang), { modal: cfg.modal }, ...actions);
  if (choice === stop || choice === snooze) player.stop();
  if (choice === snooze) setTimeout(() => void notifyAt(p, inRamadan, cfg, true), SNOOZE_MS);
}

function notifyBefore(p: Prayer, msLeft: number, cfg: Config): void {
  const { lang } = cfg;
  if (cfg.sound.beforeReminder) playFor(null, cfg);
  const what = p.key === 'imsak' ? p.label : t(lang, 'notify.beforeTarget', p.label);
  vscode.window.showInformationMessage(t(lang, 'notify.before', fmtDuration(msLeft, lang), what, fmtTime(p.time)));
}

function checkReminders(s: Snapshot): void {
  for (const p of [...s.today, ...s.tomorrow]) {
    if (!isReminder(p.key, s.inRamadan)) continue;
    const msLeft = p.time.getTime() - s.now.getTime();
    const id = `${p.key}-${p.time.getTime()}`;
    if (s.cfg.remindBefore > 0 && msLeft > 60e3 && msLeft <= s.cfg.remindBefore * 60e3) {
      if (claim(`${id}-pre`)) notifyBefore(p, msLeft, s.cfg);
    } else if (msLeft <= 0 && msLeft > -GRACE_MS) {
      if (claim(`${id}-at`)) void notifyAt(p, s.inRamadan, s.cfg);
    }
  }
}

// --- Status bar -----------------------------------------------------------

function scheduleTooltip(s: Snapshot): vscode.MarkdownString {
  const { lang } = s.cfg;
  const md = new vscode.MarkdownString();
  md.appendMarkdown(`**${t(lang, 'status.tooltipTitle', s.cfg.locationName)}**\n\n${fmtDate(s.now, lang)}\n\n`);
  md.appendMarkdown('| | |\n|---|---|\n');
  for (const p of s.today) {
    if (p.key === 'imsak' && !s.inRamadan) continue;
    const mark = s.next && p.time.getTime() === s.next.time.getTime() ? ' ⬅' : '';
    md.appendMarkdown(`| ${p.label} | **${fmtTime(p.time)}**${mark} |\n`);
  }
  md.appendMarkdown(`\n_${t(lang, 'status.tooltipFoot', s.cfg.method)}_`);
  return md;
}

function updateStatusBar(s: Snapshot): void {
  const { lang } = s.cfg;
  prayerItem.name = t(lang, 'status.nextName');
  ramadanItem.name = t(lang, 'status.ramadanName');

  if (s.next) {
    const msLeft = s.next.time.getTime() - s.now.getTime();
    prayerItem.text = `$(bell) ${s.next.label} ${fmtTime(s.next.time)} · ${fmtDuration(msLeft, lang)}`;
    const soon = s.cfg.remindBefore > 0 && msLeft <= s.cfg.remindBefore * 60e3;
    prayerItem.backgroundColor = soon ? new vscode.ThemeColor('statusBarItem.warningBackground') : undefined;
  } else {
    prayerItem.text = `$(bell) ${t(lang, 'status.fallback')}`;
    prayerItem.backgroundColor = undefined;
  }
  prayerItem.tooltip = scheduleTooltip(s);
  prayerItem.show();

  const r = s.ramadan;
  if (!s.cfg.showRamadan || !r) {
    ramadanItem.hide();
    return;
  }
  ramadanItem.text = r.inRamadan
    ? t(lang, 'status.ramadanDay', r.day ?? 1, r.daysToEid ?? 0)
    : t(lang, 'status.ramadanIn', r.daysLeft ?? 0);
  ramadanItem.tooltip = r.inRamadan
    ? t(lang, 'status.ramadanTipDuring', r.year, fmtDate(r.end, lang))
    : t(lang, 'status.ramadanTipBefore', r.year, fmtDate(r.start, lang));
  ramadanItem.show();
}

function tick(): void {
  try {
    const s = snapshot(getConfig());
    checkReminders(s);
    updateStatusBar(s);
  } catch (err) {
    console.error('[pray-reminder]', err);
  }
}

// --- Commands -------------------------------------------------------------

function openDashboard(): Thenable<unknown> {
  return vscode.commands.executeCommand(`${DashboardProvider.viewId}.focus`);
}

function parseCoords(v: string): [number, number] | null {
  const m = /^\s*(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)\s*$/.exec(v);
  if (!m) return null;
  const lat = Number(m[1]);
  const lng = Number(m[2]);
  return Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? [lat, lng] : null;
}

async function setLocation(): Promise<void> {
  const { lang } = getConfig();
  type Item = vscode.QuickPickItem & { coords?: [number, number] };
  const manual: Item = { label: t(lang, 'loc.manual') };
  const pick = await vscode.window.showQuickPick<Item>(
    [...CITIES.map(([name, lat, lng]): Item => ({ label: name, description: `${lat}, ${lng}`, coords: [lat, lng] })), manual],
    { title: t(lang, 'loc.pickTitle'), matchOnDescription: true }
  );
  if (!pick) return;

  let name = pick.label;
  let coords = pick.coords;
  if (pick === manual) {
    const input = await vscode.window.showInputBox({
      title: t(lang, 'loc.coordsTitle'),
      placeHolder: '-6.2088, 106.8456',
      validateInput: (v) => (parseCoords(v) ? null : t(lang, 'loc.coordsInvalid')),
    });
    if (!input) return;
    coords = parseCoords(input) ?? undefined;
    const fallback = t(lang, 'loc.defaultName');
    name = (await vscode.window.showInputBox({ title: t(lang, 'loc.nameTitle'), value: fallback })) || fallback;
  }
  if (!coords) return;

  const c = vscode.workspace.getConfiguration('pray');
  const G = vscode.ConfigurationTarget.Global;
  await c.update('latitude', coords[0], G);
  await c.update('longitude', coords[1], G);
  await c.update('locationName', name, G);
  vscode.window.showInformationMessage(t(lang, 'loc.saved', name));
}

async function chooseSound(): Promise<void> {
  const { lang } = getConfig();
  type Item = vscode.QuickPickItem & { target: 'file' | 'fajrFile' | 'reset' };
  const pick = await vscode.window.showQuickPick<Item>(
    [
      { label: `$(unmute) ${t(lang, 'sound.pickAll')}`, target: 'file' },
      { label: `$(star-empty) ${t(lang, 'sound.pickFajr')}`, target: 'fajrFile' },
      { label: `$(discard) ${t(lang, 'sound.pickReset')}`, target: 'reset' },
    ],
    { title: t(lang, 'sound.pickWhich') }
  );
  if (!pick) return;

  const c = vscode.workspace.getConfiguration('pray');
  const G = vscode.ConfigurationTarget.Global;
  if (pick.target === 'reset') {
    await c.update('sound.file', undefined, G);
    await c.update('sound.fajrFile', undefined, G);
    vscode.window.showInformationMessage(t(lang, 'sound.reset'));
    return;
  }

  const uris = await vscode.window.showOpenDialog({
    title: t(lang, pick.target === 'file' ? 'sound.pickTitle' : 'sound.pickFajrTitle'),
    canSelectMany: false,
    filters: { Audio: ['mp3', 'm4a', 'aac', 'wav', 'ogg', 'flac', 'aiff'] },
  });
  const file = uris?.[0]?.fsPath;
  if (!file) return;
  await c.update(`sound.${pick.target}`, file, G);
  await c.update('sound.enabled', true, G);
  vscode.window.showInformationMessage(t(lang, 'sound.saved', path.basename(file)));
  player.play(file, getConfig().sound.volume); // preview — stop it from the status bar
}

async function toggleSound(): Promise<void> {
  const { lang, sound } = getConfig();
  await vscode.workspace.getConfiguration('pray').update('sound.enabled', !sound.enabled, vscode.ConfigurationTarget.Global);
  if (sound.enabled) player.stop();
  vscode.window.showInformationMessage(t(lang, sound.enabled ? 'sound.toggled.off' : 'sound.toggled.on'));
}

function setLanguage(lang: Lang): Thenable<void> {
  return vscode.workspace.getConfiguration('pray').update('language', lang, vscode.ConfigurationTarget.Global);
}

function testReminder(): void {
  const s = snapshot(getConfig());
  const p = s.next ?? s.today.find((x) => x.key === 'fajr');
  if (!p) return;
  // Show both notifications but play only the adhan, not the chime on top of it.
  notifyBefore(p, Math.max(p.time.getTime() - s.now.getTime(), 60e3), { ...s.cfg, sound: { ...s.cfg.sound, beforeReminder: false } });
  void notifyAt(p, s.inRamadan, s.cfg);
}

// --- Lifecycle ------------------------------------------------------------

export function activate(context: vscode.ExtensionContext): void {
  storageDir = context.globalStorageUri.fsPath;
  lockDir = path.join(storageDir, 'notified');
  cleanupLocks();

  soundItem = vscode.window.createStatusBarItem('pray.sound', vscode.StatusBarAlignment.Right, 101);
  soundItem.command = 'pray.stopSound';
  soundItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
  player = new SoundPlayer(
    (playing) => {
      const { lang } = getConfig();
      soundItem.name = t(lang, 'sound.stopName');
      soundItem.text = t(lang, 'sound.stop');
      if (playing) soundItem.show();
      else soundItem.hide();
    },
    () => vscode.window.showWarningMessage(t(getConfig().lang, 'sound.noPlayer'))
  );

  dashboard = new DashboardProvider(context.extensionUri, () => toDashboardData(snapshot(getConfig())), setLanguage);

  prayerItem = vscode.window.createStatusBarItem('pray.next', vscode.StatusBarAlignment.Right, 100);
  prayerItem.command = 'pray.showSchedule';
  ramadanItem = vscode.window.createStatusBarItem('pray.ramadan', vscode.StatusBarAlignment.Right, 99);
  ramadanItem.command = 'pray.showRamadan';

  const timer = setInterval(tick, TICK_MS);
  context.subscriptions.push(
    prayerItem,
    ramadanItem,
    soundItem,
    { dispose: () => clearInterval(timer) },
    { dispose: () => player.stop() },
    vscode.window.registerWebviewViewProvider(DashboardProvider.viewId, dashboard),
    vscode.commands.registerCommand('pray.showSchedule', openDashboard),
    vscode.commands.registerCommand('pray.showRamadan', openDashboard),
    vscode.commands.registerCommand('pray.setLocation', setLocation),
    vscode.commands.registerCommand('pray.testReminder', testReminder),
    vscode.commands.registerCommand('pray.chooseSound', chooseSound),
    vscode.commands.registerCommand('pray.toggleSound', toggleSound),
    vscode.commands.registerCommand('pray.stopSound', () => player.stop()),
    vscode.commands.registerCommand('pray.switchLanguage', () => setLanguage(getConfig().lang === 'id' ? 'en' : 'id')),
    vscode.commands.registerCommand('pray.openSettings', () =>
      vscode.commands.executeCommand('workbench.action.openSettings', '@ext:asnur.pray-reminder')
    ),
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (!e.affectsConfiguration('pray')) return;
      tick();
      dashboard.refresh();
    })
  );
  tick();
}

export function deactivate(): void {}
