import { fileURLToPath, URL } from 'node:url'

/**
 * Shared alias map for vite.config.ts AND vitest.config.ts.
 * Add new aliases here so both dev/build and test agree on resolution.
 */
const u = (p: string) => fileURLToPath(new URL(p, import.meta.url))

export const sharedAliases = [
  { find: '@', replacement: u('./src') },
  { find: '@upstream', replacement: u('./vendor/claude-hud/src') },
  // Node built-ins → browser stubs. These are what actually neutralize
  // upstream's Node-only paths: process.env reads short-circuit to undefined,
  // existsSync returns false, etc. Upstream code is bundled as-is and
  // executes through these stubs at runtime — no need for per-module shims
  // for stdin / speed-tracker / memory / terminal (we tried that route and
  // discovered the regex aliases never matched upstream's relative imports).
  { find: 'node:fs', replacement: u('./src/upstream-shims/node/fs.ts') },
  { find: 'node:path', replacement: u('./src/upstream-shims/node/path.ts') },
  { find: 'node:os', replacement: u('./src/upstream-shims/node/os.ts') },
  { find: 'node:url', replacement: u('./src/upstream-shims/node/url.ts') },
  { find: 'node:crypto', replacement: u('./src/upstream-shims/node/crypto.ts') },
  { find: 'node:child_process', replacement: u('./src/upstream-shims/node/child_process.ts') },
  { find: 'node:util', replacement: u('./src/upstream-shims/node/util.ts') },
  { find: 'node:readline', replacement: u('./src/upstream-shims/node/readline.ts') },
]
