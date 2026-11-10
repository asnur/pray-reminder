# Pray Reminder — Prayer Times & Ramadan Countdown

**English** · [Bahasa Indonesia](README.id.md)

A VS Code / Antigravity IDE extension that reminds you to pray while you code. It is available in Indonesian and English.

- **Sidebar dashboard** (mosque icon in the activity bar):
  - a live countdown to the next prayer, on a sky gradient that changes with the time of day;
  - today's schedule, marking the current and next prayer;
  - a Ramadan countdown card (days, hours, minutes, seconds). During Ramadan the card shows day N, fasting progress, an iftar/imsak countdown and the Eid date.
  - an **ID | EN** toggle to switch languages instantly.
- **Status bar**: the next prayer and time remaining (`🔔 Asr 14:59 · 1h 20m`), plus `🌙 Ramadan in 91 days`.
- **Reminders**: a notification X minutes before each prayer (default 10) and another when it starts, with a "Remind me in 5 minutes" button. On Fridays, Dhuhr is shown as Jumu'ah.
- **Adhan sound**: plays your own adhan file when a prayer time starts (optionally a separate one for Fajr), or a soft built-in chime. Stop it from the notification, the status bar or `Pray: Stop Adhan`.
- **Multi-window safe**: each notification appears only once, even with several IDE windows open.

## Adhan sound

1. Get an adhan audio file you like (mp3, m4a, wav…). No recording is bundled because of copyright.
2. Run `Pray: Choose Adhan Sound`, then pick **All prayers** or **Fajr only**. The file plays once as a preview.
3. Use the 🔊/🔇 button in the dashboard to mute or unmute.

| Event | Sound |
|---|---|
| Prayer time starts | your adhan (`pray.sound.file`, or `pray.sound.fajrFile` for Fajr) |
| Early reminder, Imsak, snooze | soft built-in chime (generated in code, no audio file is shipped) |

Playback uses the OS's own player: `afplay` on macOS, PowerShell/`MediaPlayer` on Windows, and `ffplay`, `mpv`, `mpg123` or `paplay` on Linux. Files are passed as arguments and never through a shell.

## Security

- **No runtime dependencies.** The `.vsix` contains only JavaScript compiled from this repository.
- **Only 2 devDependencies**, used for the build and pinned to exact versions: `typescript` and `@types/vscode`. Both are official Microsoft packages with no transitive dependencies. `.npmrc` disables install scripts (`ignore-scripts=true`).
- **Works offline.** Prayer times are calculated locally, and the Hijri calendar uses the built-in `Intl` API. The webview has a strict Content Security Policy and loads no external resources.

## Build & install into Antigravity IDE

```sh
npm ci                 # installs typescript + @types/vscode (no install scripts)
npm run package        # builds TypeScript and creates pray-reminder-<version>.vsix
"/Applications/Antigravity IDE.app/Contents/Resources/app/bin/antigravity-ide" --install-extension pray-reminder-0.4.0.vsix --force
```

Then run **Developer: Reload Window**. For VS Code, use `code --install-extension …` instead.

## Language

| Where | How the language is chosen |
|---|---|
| Status bar, notifications, dashboard | `pray.language` setting: `auto` (follows the IDE), `id` or `en`. Switch with the **ID / EN** toggle in the dashboard or with `Pray: Switch Language`. |
| Command titles & Settings page | Follows the IDE display language (`package.nls.json` / `package.nls.id.json`). |

## Commands (Cmd+Shift+P)

| Command | Description |
|---|---|
| `Pray: Show Prayer Times` | Open the sidebar dashboard |
| `Pray: Ramadan Countdown` | Open the sidebar dashboard |
| `Pray: Set Location` | Pick a city or enter coordinates |
| `Pray: Switch Language` | Toggle Indonesian / English |
| `Pray: Choose Adhan Sound` | Pick an adhan file (all prayers / Fajr only) or reset to the chime |
| `Pray: Toggle Reminder Sound` | Mute / unmute |
| `Pray: Stop Adhan` | Stop the sound that is playing |
| `Pray: Test Reminder Notification` | Preview the notifications |
| `Pray: Settings` | Open this extension's settings |

## Settings

| Setting | Default | Description |
|---|---|---|
| `pray.language` | `auto` | `auto`, `id` or `en` |
| `pray.latitude` / `pray.longitude` | Jakarta | Location coordinates |
| `pray.method` | `Kemenag` | Fajr 20°, Isha 18° (also JAKIM, MUIS, MWL, ISNA, Egypt, Makkah, Karachi) |
| `pray.ihtiyat` | `2` | Safety margin in minutes, as used by Kemenag |
| `pray.remindBeforeMinutes` | `10` | 0 disables the early reminder |
| `pray.modalNotification` | `false` | `true` shows a dialog you must click, so it can't be missed |
| `pray.hijriOffset` | `0` | Set to `1` if your country starts Ramadan a day after Umm al-Qura |
| `pray.sound.enabled` | `true` | Play sounds with notifications |
| `pray.sound.file` | empty | Adhan file for every prayer (empty = chime) |
| `pray.sound.fajrFile` | empty | Separate adhan for Fajr (optional) |
| `pray.sound.volume` | `80` | 0–100 |
| `pray.sound.beforeReminder` | `true` | Chime for the early reminder |

Times are shown in the system time zone. Calculated times may differ from official schedules by ±1–2 minutes. Ramadan dates are estimates; official dates follow moon sighting or your local authority.

## Project structure

```
src/
  extension.ts      activation, status bar, notifications, commands
  dashboard.ts      WebviewViewProvider for the sidebar
  schedule.ts       builds the daily schedule (no vscode dependency, testable)
  prayTimes.ts      astronomical prayer time calculation
  ramadan.ts        Ramadan period & Hijri date
  i18n.ts           Indonesian & English translations
  sound.ts          adhan playback via OS players & synthesized chime
  shared/types.d.ts types shared by the extension and the webview
  webview/main.ts   dashboard script (runs in the webview)
  test/             tests using node:test
media/              dashboard CSS & sidebar icon
package.nls*.json   manifest translations
```

## Development

- `npm test` builds the project and runs the tests.
- Press F5 to launch an Extension Development Host (runs `npm: build` first).
