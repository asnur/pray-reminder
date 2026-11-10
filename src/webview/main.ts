// Dashboard script that runs inside the webview (browser), not in the extension host.

import type { DashboardData, FromWebview, Lang, PrayerEntry, PrayerKey, ToWebview, WebviewCommand } from '../shared/types';

declare function acquireVsCodeApi(): { postMessage(msg: FromWebview): void };

const vscode = acquireVsCodeApi();
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

const ICONS: Record<PrayerKey, string> = {
  imsak: '<path d="M15 4a7 7 0 1 0 5 11.9A8 8 0 0 1 15 4z"/><path d="M19 3v3M17.5 4.5h3"/>',
  fajr: '<path d="M3 18h18M6 18a6 6 0 0 1 12 0"/><path d="M12 6v3M5.6 10.6l1.4 1.4M18.4 10.6 17 12"/>',
  sunrise: '<path d="M3 20h18M7 20a5 5 0 0 1 10 0"/><path d="M12 4v6M9.5 6.5 12 4l2.5 2.5"/>',
  dhuhr: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
  asr: '<circle cx="9" cy="10" r="3.5"/><path d="M9 3v1.5M3 10h1.5M4.8 5.8l1 1M13.2 5.8l-1 1"/><path d="M10 20h8a3.5 3.5 0 0 0 0-7 5 5 0 0 0-9.3 1.5A2.8 2.8 0 0 0 10 20z"/>',
  maghrib: '<path d="M3 17h18M7 17a5 5 0 0 1 10 0"/><path d="M12 10V4M9.5 7.5 12 10l2.5-2.5M5 21h14"/>',
  isha: '<path d="M14 3a8 8 0 1 0 7 12A7 7 0 0 1 14 3z"/><path d="M6 5.5l.6 1.4 1.4.6-1.4.6L6 9.5l-.6-1.4L4 7.5l1.4-.6z"/>',
};

const CRESCENT = `
<svg class="ramadan-art" viewBox="0 0 120 80" aria-hidden="true">
  <path class="moon" d="M78 10a30 30 0 1 0 22 50A34 34 0 0 1 78 10z"/>
  <circle class="star" cx="30" cy="18" r="1.6"/><circle class="star" cx="16" cy="40" r="1.1"/>
  <circle class="star" cx="44" cy="52" r="1.3"/><circle class="star" cx="58" cy="12" r="1"/>
  <path class="star" d="M104 14l1.4 3.2 3.4.4-2.6 2.2.8 3.3-3-1.8-3 1.8.8-3.3-2.6-2.2 3.4-.4z"/>
</svg>`;

let data: DashboardData | null = null;
let renderedDay = '';
let lastRefreshAsk = 0;

/** Look up a translation from the dictionary sent by the extension; {0}, {1}… are replaced by args. */
function t(key: string, ...args: Array<string | number>): string {
  const template = data?.strings[key] ?? key;
  return template.replace(/\{(\d+)\}/g, (m, i: string) => (args[Number(i)] !== undefined ? String(args[Number(i)]) : m));
}

const pad = (n: number) => String(n).padStart(2, '0');
const hhmm = (ms: number) => {
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const longDate = (ms: number) =>
  new Date(ms).toLocaleDateString(data?.locale ?? 'id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

function split(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}
const clock = (ms: number) => {
  const t = split(ms);
  return `${pad(t.d * 24 + t.h)}:${pad(t.m)}:${pad(t.s)}`;
};

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

function icon(key: PrayerKey): string {
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[key]}</svg>`;
}

const isReminder = (p: PrayerEntry, inRamadan: boolean) => p.key !== 'sunrise' && (p.key !== 'imsak' || inRamadan);
const same = (a?: PrayerEntry, b?: PrayerEntry) => !!a && !!b && a.time === b.time && a.key === b.key;

function askRefresh(): void {
  if (Date.now() - lastRefreshAsk < 30e3) return;
  lastRefreshAsk = Date.now();
  vscode.postMessage({ type: 'refresh' });
}

// --- Render (once per data update) ------------------------------------------

function applyStaticText(d: DashboardData): void {
  document.documentElement.lang = d.lang;
  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach((node) => (node.textContent = t(node.dataset.i18n!)));
  document.querySelectorAll<HTMLElement>('[data-i18n-title]').forEach((node) => {
    node.title = t(node.dataset.i18nTitle!);
    node.setAttribute('aria-label', node.title);
  });
  document.querySelectorAll<HTMLButtonElement>('button[data-lang]').forEach((btn) => {
    const active = btn.dataset.lang === d.lang;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-pressed', String(active));
  });
  const sound = $('sound-btn');
  sound.textContent = d.soundEnabled ? '🔊' : '🔇';
  sound.title = t(d.soundEnabled ? 'sound.on' : 'sound.off');
  sound.setAttribute('aria-label', sound.title);
}

function render(d: DashboardData): void {
  renderedDay = new Date().toDateString();
  applyStaticText(d);
  $('loc').textContent = d.location;
  $('method').textContent = d.method;
  $('date').textContent = longDate(Date.now());
  $('hijri').textContent = d.hijriLabel ?? '';

  const list = $('list');
  list.replaceChildren(
    ...d.today
      .filter((p) => p.key !== 'imsak' || d.inRamadan)
      .map((p) => {
        const li = el('li', `row k-${p.key}`);
        li.dataset.key = p.key;
        li.dataset.time = String(p.time);
        const ic = el('span', 'ic');
        ic.innerHTML = icon(p.key);
        const name = el('span', 'name', p.label);
        if (p.key === 'sunrise') name.append(el('em', 'tag', t('wv.notPrayer')));
        li.append(ic, name, el('span', 'state'), el('span', 'time', hhmm(p.time)));
        return li;
      })
  );

  renderRamadan(d);
  tick();
}

function renderRamadan(d: DashboardData): void {
  const box = $('ramadan');
  const r = d.ramadan;
  box.hidden = !r;
  if (!r) return;

  box.innerHTML = CRESCENT;
  const head = el('div', 'r-head');
  head.append(
    el('span', 'r-kicker', t(r.inRamadan ? 'wv.ramadanKickerDuring' : 'wv.ramadanKickerBefore')),
    el('h2', '', t('wv.ramadanTitle', r.year))
  );
  box.append(head);

  if (r.inRamadan) {
    const day = el('div', 'r-day');
    day.append(el('span', 'r-day-num', String(r.day)), el('span', 'r-day-of', t('wv.dayOf', r.length)));
    const bar = el('div', 'bar gold');
    const fill = el('span');
    fill.style.width = `${((r.day ?? 1) / r.length) * 100}%`;
    bar.append(fill);
    const fast = el('div', 'r-fast');
    fast.append(el('span', 'r-fast-label', ''), el('span', 'r-fast-clock', ''));
    box.append(day, bar, fast, el('p', 'r-note', t('wv.eid', longDate(r.end))));
  } else {
    const tiles = el('div', 'tiles');
    for (const [unit, key] of [['d', 'wv.days'], ['h', 'wv.hours'], ['m', 'wv.minutes'], ['s', 'wv.seconds']]) {
      const tile = el('div', 'tile');
      tile.append(el('span', 'tile-num', '--'), el('span', 'tile-unit', t(key)));
      tile.dataset.unit = unit;
      tiles.append(tile);
    }
    box.append(tiles, el('p', 'r-note', t('wv.ramadanStart', longDate(r.start))));
  }
  box.append(el('p', 'r-foot', t('wv.ramadanFoot')));
}

// --- Tick (every second) -----------------------------------------------------

function tick(): void {
  if (!data) return;
  const d = data;
  const now = Date.now();
  if (new Date().toDateString() !== renderedDay) askRefresh();

  const ishaLabel = d.today.find((p) => p.key === 'isha')?.label ?? 'Isha';
  const yesterday: PrayerEntry[] = d.yesterdayIsha ? [{ key: 'isha', label: ishaLabel, time: d.yesterdayIsha }] : [];
  const events = [...yesterday, ...d.today, ...d.tomorrow].filter((p) => isReminder(p, d.inRamadan));
  const i = events.findIndex((p) => p.time > now);
  if (i < 0) return askRefresh();
  const next = events[i];
  const prev = events[i - 1];

  // Hero
  const hero = $('hero');
  hero.dataset.phase = next.key;
  $('next-name').textContent = next.label;
  $('countdown').textContent = clock(next.time - now);
  const isTomorrow = !d.today.some((p) => same(p, next));
  $('next-at').textContent = t('wv.at', hhmm(next.time)) + (isTomorrow ? ` · ${t('wv.tomorrow')}` : '');
  $('prev-name').textContent = prev ? `${prev.label} ${hhmm(prev.time)}` : '';
  $('next-short').textContent = `${next.label} ${hhmm(next.time)}`;
  const span = prev ? next.time - prev.time : 1;
  $('hero-bar').style.width = prev ? `${Math.min(100, ((now - prev.time) / span) * 100)}%` : '0%';

  const badge = $('hero-badge');
  const justEntered = prev && now - prev.time < 15 * 60e3 && prev.key !== 'imsak';
  badge.hidden = !justEntered;
  if (justEntered) badge.textContent = t('wv.justEntered', prev.label);

  // Schedule list
  for (const li of Array.from($('list').children) as HTMLElement[]) {
    const time = Number(li.dataset.time);
    const key = li.dataset.key as PrayerKey;
    const entry = { key, time } as PrayerEntry;
    const state = same(entry, next) ? 'next' : same(entry, prev) ? 'current' : time <= now ? 'past' : 'upcoming';
    li.dataset.state = state;
    const label = li.querySelector('.state') as HTMLElement;
    label.textContent = state === 'next' ? clock(time - now) : state === 'current' ? t('wv.now') : '';
  }

  tickRamadan(d, now);
}

function tickRamadan(d: DashboardData, now: number): void {
  const r = d.ramadan;
  if (!r) return;
  if (!r.inRamadan) {
    const parts = split(r.start - now);
    for (const tile of Array.from(document.querySelectorAll<HTMLElement>('.tile'))) {
      const v = parts[tile.dataset.unit as keyof typeof parts];
      (tile.firstElementChild as HTMLElement).textContent = tile.dataset.unit === 'd' ? String(v) : pad(v);
    }
    return;
  }
  const fast = [...d.today, ...d.tomorrow].find((p) => (p.key === 'imsak' || p.key === 'maghrib') && p.time > now);
  const label = document.querySelector<HTMLElement>('.r-fast-label');
  const value = document.querySelector<HTMLElement>('.r-fast-clock');
  if (fast && label && value) {
    label.textContent = t(fast.key === 'maghrib' ? 'wv.iftarIn' : 'wv.imsakIn');
    value.textContent = clock(fast.time - now);
  }
}

// --- Wiring ------------------------------------------------------------------

window.addEventListener('message', (e: MessageEvent<ToWebview>) => {
  if (e.data?.type !== 'data') return;
  data = e.data.data;
  render(data);
});

document.querySelectorAll<HTMLButtonElement>('button[data-command]').forEach((btn) =>
  btn.addEventListener('click', () => vscode.postMessage({ type: 'command', command: btn.dataset.command as WebviewCommand }))
);

document.querySelectorAll<HTMLButtonElement>('button[data-lang]').forEach((btn) =>
  btn.addEventListener('click', () => {
    const lang = btn.dataset.lang as Lang;
    if (lang !== data?.lang) vscode.postMessage({ type: 'setLanguage', lang });
  })
);

setInterval(tick, 1000);
vscode.postMessage({ type: 'ready' });
