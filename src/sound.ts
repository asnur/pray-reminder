// Audio playback through the operating system's own command-line players,
// so the adhan plays even when the dashboard webview is hidden. No npm packages.

import { spawn, type ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

export interface PlayerCommand {
  cmd: string;
  args: string[];
  env?: Record<string, string>;
}

// The file path and volume are passed through environment variables, never
// interpolated into the script, so a path can't inject PowerShell code.
const WINDOWS_SCRIPT = [
  "$ErrorActionPreference = 'Stop'",
  'Add-Type -AssemblyName PresentationCore',
  '$p = New-Object System.Windows.Media.MediaPlayer',
  '$p.Volume = [double]$env:PRAY_VOLUME',
  '$p.Open([Uri]$env:PRAY_SOUND)',
  '$p.Play()',
  '$i = 0',
  'while (-not $p.NaturalDuration.HasTimeSpan -and $i -lt 50) { Start-Sleep -Milliseconds 100; $i++ }',
  'if ($p.NaturalDuration.HasTimeSpan) { Start-Sleep -Milliseconds ([int]$p.NaturalDuration.TimeSpan.TotalMilliseconds) }',
].join('; ');

/** Players to try, in order, for this platform. `volume` is 0–100. */
export function playerCommands(file: string, volume: number, platform: string): PlayerCommand[] {
  const v = Math.max(0, Math.min(100, volume)) / 100;
  if (platform === 'darwin') return [{ cmd: 'afplay', args: ['-v', v.toFixed(2), file] }];
  if (platform === 'win32') {
    return [
      {
        cmd: 'powershell.exe',
        args: ['-NoProfile', '-NonInteractive', '-Command', WINDOWS_SCRIPT],
        env: { PRAY_SOUND: file, PRAY_VOLUME: v.toFixed(2) },
      },
    ];
  }
  const pct = String(Math.round(v * 100));
  const generic: PlayerCommand[] = [
    { cmd: 'ffplay', args: ['-nodisp', '-autoexit', '-loglevel', 'quiet', '-volume', pct, file] },
    { cmd: 'mpv', args: ['--no-video', '--really-quiet', `--volume=${pct}`, file] },
  ];
  const ext = path.extname(file).toLowerCase();
  if (ext === '.mp3') generic.push({ cmd: 'mpg123', args: ['-q', '-f', String(Math.round(v * 32768)), file] });
  // paplay/aplay can't decode mp3/m4a, so only offer them for PCM-style formats.
  if (['.wav', '.ogg', '.oga', '.flac'].includes(ext)) {
    generic.unshift({ cmd: 'paplay', args: [`--volume=${Math.round(v * 65536)}`, file] });
    generic.push({ cmd: 'aplay', args: ['-q', file] });
  }
  return generic;
}

/** Plays one sound at a time; starting a new one stops the previous. */
export class SoundPlayer {
  private proc: ChildProcess | undefined;

  constructor(
    private readonly onChange: (playing: boolean) => void,
    private readonly onNoPlayer: () => void
  ) {}

  get playing(): boolean {
    return this.proc !== undefined;
  }

  play(file: string, volume: number): void {
    this.stop();
    const commands = playerCommands(file, volume, process.platform);
    const attempt = (i: number) => {
      if (i >= commands.length) {
        this.onNoPlayer();
        return;
      }
      const c = commands[i];
      const proc = spawn(c.cmd, c.args, {
        stdio: 'ignore',
        windowsHide: true,
        env: c.env ? { ...process.env, ...c.env } : undefined,
      });
      this.proc = proc;
      this.onChange(true);
      proc.once('error', (err) => {
        if (this.proc !== proc) return;
        this.proc = undefined;
        // Player not installed — try the next one.
        if (err.code === 'ENOENT') attempt(i + 1);
        else this.onChange(false);
      });
      proc.once('exit', () => {
        if (this.proc !== proc) return;
        this.proc = undefined;
        this.onChange(false);
      });
    };
    attempt(0);
  }

  stop(): void {
    const proc = this.proc;
    this.proc = undefined;
    if (!proc) return;
    proc.kill();
    this.onChange(false);
  }
}

/** Expand a leading `~` to the home directory. */
export function expandHome(file: string): string {
  return file === '~' || file.startsWith('~/') ? path.join(os.homedir(), file.slice(1)) : file;
}

/**
 * A soft two-note chime, synthesized as 16-bit mono PCM WAV.
 * Generated in code so the extension ships no audio files.
 */
export function chimeWav(): Uint8Array {
  const rate = 22050;
  const length = Math.floor(rate * 2.4);
  const notes = [
    { freq: 880, start: 0 }, // A5
    { freq: 659.25, start: 0.45 }, // E5
  ];
  const bytes = new Uint8Array(44 + length * 2);
  const view = new DataView(bytes.buffer);
  const ascii = (offset: number, s: string) => [...s].forEach((ch, i) => view.setUint8(offset + i, ch.charCodeAt(0)));

  ascii(0, 'RIFF');
  view.setUint32(4, 36 + length * 2, true);
  ascii(8, 'WAVE');
  ascii(12, 'fmt ');
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  ascii(36, 'data');
  view.setUint32(40, length * 2, true);

  for (let i = 0; i < length; i++) {
    const t = i / rate;
    let sample = 0;
    for (const n of notes) {
      const dt = t - n.start;
      if (dt < 0) continue;
      const envelope = Math.exp(-dt * 3) * Math.min(1, dt / 0.005);
      const w = 2 * Math.PI * n.freq * dt;
      sample += envelope * (Math.sin(w) + 0.35 * Math.sin(2 * w) + 0.15 * Math.sin(3 * w));
    }
    view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, sample * 0.3)) * 32767, true);
  }
  return bytes;
}

/** Write the chime to `dir` once and return its path. */
export function ensureChime(dir: string): string {
  const file = path.join(dir, 'chime.wav');
  if (!fs.existsSync(file)) {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(file, chimeWav());
  }
  return file;
}
