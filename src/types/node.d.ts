// Minimal declarations for the Node APIs this extension uses.
// Deliberately avoids @types/node to keep devDependencies to a minimum.

declare function setInterval(callback: () => void, ms: number): unknown;
declare function clearInterval(handle: unknown): void;
declare function setTimeout(callback: () => void, ms: number): unknown;

declare const console: {
  log(...args: unknown[]): void;
  error(...args: unknown[]): void;
};

declare const process: {
  platform: string;
  env: Record<string, string | undefined>;
};

declare module 'child_process' {
  export interface ChildProcess {
    kill(): boolean;
    once(event: 'error', listener: (err: Error & { code?: string }) => void): this;
    once(event: 'exit', listener: (code: number | null, signal: string | null) => void): this;
  }
  export function spawn(
    command: string,
    args: readonly string[],
    options?: { stdio?: 'ignore'; env?: Record<string, string | undefined>; windowsHide?: boolean }
  ): ChildProcess;
}

declare module 'os' {
  export function homedir(): string;
}

declare module 'fs' {
  export function existsSync(path: string): boolean;
  export function writeFileSync(path: string, data: Uint8Array): void;
  export function mkdirSync(path: string, options?: { recursive?: boolean }): void;
  export function openSync(path: string, flags: string): number;
  export function closeSync(fd: number): void;
  export function readdirSync(path: string): string[];
  export function statSync(path: string): { mtimeMs: number };
  export function unlinkSync(path: string): void;
}

declare module 'path' {
  export function join(...paths: string[]): string;
  export function extname(path: string): string;
  export function basename(path: string): string;
}

declare module 'node:test' {
  export function test(name: string, fn: () => void | Promise<void>): void;
}

declare module 'node:assert' {
  export function ok(value: unknown, message?: string): void;
  export function strictEqual<T>(actual: unknown, expected: T, message?: string): void;
  export function deepStrictEqual<T>(actual: unknown, expected: T, message?: string): void;
}
