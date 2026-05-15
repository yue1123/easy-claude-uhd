/**
 * Browser shim for upstream's `speed-tracker.ts`.
 *
 * Upstream computes output-token speed by maintaining a SHA256-keyed cache on
 * disk (via `node:fs` / `node:path` / `node:os` / `node:crypto`). The cache is
 * needed because each statusline render is a fresh process — speed must be
 * derived from the *previous* invocation's token count + timestamp.
 *
 * In the browser preview there is no filesystem and no prior process, so we
 * always return `null`. `render/lines/project.ts` treats `null` as "don't
 * render speed", which is the correct degradation: a single-frame preview
 * can't show a rate anyway.
 *
 * Keep the exported signature in sync with upstream's so type imports across
 * the renderer continue to resolve.
 */
import type { StdinData } from '@/upstream-shims/stdin'

export type SpeedTrackerDeps = {
  homeDir: () => string
  now: () => number
}

export function getOutputSpeed(
  _stdin: StdinData,
  _overrides: Partial<SpeedTrackerDeps> = {},
): number | null {
  return null
}
