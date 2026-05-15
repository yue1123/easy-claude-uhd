/**
 * Browser shim for upstream's `memory.ts`.
 *
 * Upstream reads host memory via `os.totalmem()` / `os.freemem()`, with
 * platform-specific overrides that exec `/usr/bin/vm_stat` on macOS and read
 * `/proc/meminfo` on Linux. None of these work in the browser.
 *
 * `getMemoryUsage` always returns `null` here — `render/lines/memory.ts`
 * treats `null` as "don't render this line", which is the right degradation
 * for a preview that can't introspect the user's machine.
 *
 * `formatBytes` is pure and is preserved verbatim — other modules may import
 * it for formatting values that *aren't* host memory.
 *
 * `MemoryInfo` is inlined locally (same pattern as `StdinData` in
 * `./stdin.ts`) to avoid pulling upstream's `types.ts` into the program — see
 * the comment in `./stdin.ts` for the full rationale.
 */

export interface MemoryInfo {
  totalBytes: number
  usedBytes: number
  freeBytes: number
  usedPercent: number
}

export async function getMemoryUsage(): Promise<MemoryInfo | null> {
  return null
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B'
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let value = bytes
  let unitIndex = 0

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }

  const fractionDigits = value >= 10 || unitIndex === 0 ? 0 : 1
  return `${value.toFixed(fractionDigits)} ${units[unitIndex]}`
}
