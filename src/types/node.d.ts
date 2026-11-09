// Minimal declarations for the Node APIs this extension uses.
// Deliberately avoids @types/node to keep devDependencies to a minimum.

declare function setInterval(callback: () => void, ms: number): unknown;
declare function clearInterval(handle: unknown): void;
declare function setTimeout(callback: () => void, ms: number): unknown;

declare const console: {
  log(...args: unknown[]): void;
  error(...args: unknown[]): void;
};

declare module 'fs' {
  export function mkdirSync(path: string, options?: { recursive?: boolean }): void;
  export function openSync(path: string, flags: string): number;
  export function closeSync(fd: number): void;
  export function readdirSync(path: string): string[];
  export function statSync(path: string): { mtimeMs: number };
  export function unlinkSync(path: string): void;
}

declare module 'path' {
  export function join(...paths: string[]): string;
}

declare module 'node:test' {
  export function test(name: string, fn: () => void | Promise<void>): void;
}

declare module 'node:assert' {
  export function ok(value: unknown, message?: string): void;
  export function strictEqual<T>(actual: unknown, expected: T, message?: string): void;
  export function deepStrictEqual<T>(actual: unknown, expected: T, message?: string): void;
}
