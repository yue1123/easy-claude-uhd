# claude-hud Config Tool — Plan 01: Foundation & Preview Engine

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the project skeleton and build the preview rendering engine that turns a `HudConfig` + fixed mock context into a styled HTML statusline. End state: opening the page shows a faithful preview of `DEFAULT_CONFIG` — no editing yet.

**Architecture:** Vue 3 + Vite + TypeScript scaffold (already exists), Pinia for state, Vitest for tests. Hand-copy the `HudConfig` type and `DEFAULT_CONFIG` from upstream `claude-hud/src/config.ts` into `src/lib/hud-schema.ts`. Each of the 11 `HudElement` types gets a renderer in `src/preview/lines/`. A top-level `render-line.ts` dispatches based on `config.elementOrder` and `mergeGroups`. Output is Vue VNodes wrapped in styled `<span>` elements — no ANSI escape codes.

**Tech Stack:** Vue 3.5, Vite 8, TypeScript 6, Pinia 3, Vitest 3, @vue/test-utils 2, jsdom.

**Out of scope for this plan:** Editing forms, import/export, presets, URL sharing, diagnostics, i18n. Those land in subsequent plans (02 / 03 / 04).

**Reference for hand-copying:** upstream source at `~/.claude/plugins/marketplaces/claude-hud/src/config.ts` and `~/.claude/plugins/marketplaces/claude-hud/src/types.ts`.

---

## File Structure (this plan)

```
.gitignore                                  # updated (.superpowers/ already added)
package.json                                # add: pinia, vitest, @vue/test-utils, jsdom
vitest.config.ts                            # new

src/
├── App.vue                                 # MODIFIED — replace template default with shell + preview
├── main.ts                                 # MODIFIED — install Pinia
├── style.css                               # NEW — terminal-vibe CSS tokens + base styles
├── lib/
│   ├── hud-schema.ts                       # NEW — HudConfig type + DEFAULT_CONFIG (hand-copy)
│   └── mock-context.ts                     # NEW — fixed RenderContext fixture
├── preview/
│   ├── HudPreview.vue                      # NEW — sticky preview container
│   ├── color-map.ts                        # NEW — HudColorValue → CSS color
│   ├── types.ts                            # NEW — RenderSpan / RenderLine types
│   ├── render-line.ts                      # NEW — orchestrator (reads config.elementOrder)
│   └── lines/
│       ├── renderProject.ts                # NEW — project + addedDirs
│       ├── renderContext.ts                # NEW — context bar
│       ├── renderUsage.ts                  # NEW — 5h / 7d
│       ├── renderPromptCache.ts            # NEW
│       ├── renderMemory.ts                 # NEW
│       ├── renderEnvironment.ts            # NEW
│       ├── renderActivity.ts               # NEW — tools / agents / todos
│       └── renderSessionTime.ts            # NEW

tests/
└── unit/
    ├── hud-schema.test.ts                  # NEW
    ├── mock-context.test.ts                # NEW
    ├── color-map.test.ts                   # NEW
    └── preview/
        ├── renderProject.test.ts           # NEW
        ├── renderContext.test.ts           # NEW
        ├── renderUsage.test.ts             # NEW
        ├── renderPromptCache.test.ts       # NEW
        ├── renderMemory.test.ts            # NEW
        ├── renderEnvironment.test.ts       # NEW
        ├── renderActivity.test.ts          # NEW
        ├── renderSessionTime.test.ts       # NEW
        └── render-line.test.ts             # NEW
```

---

## Task 1: Initialize git repository

**Files:**
- Modify: `/Users/dh/Desktop/code/claude-uhd-cc/.gitignore` (already has `.superpowers/`)

- [ ] **Step 1: Init git**

```bash
cd /Users/dh/Desktop/code/claude-uhd-cc
git init -b main
```

Expected: `Initialized empty Git repository in /Users/dh/Desktop/code/claude-uhd-cc/.git/`

- [ ] **Step 2: Verify .gitignore contains .superpowers**

```bash
grep -n ".superpowers" /Users/dh/Desktop/code/claude-uhd-cc/.gitignore
```

Expected: a line containing `.superpowers/`

- [ ] **Step 3: Baseline commit**

```bash
git add -A
git commit -m "chore: initial Vue 3 scaffold + brainstorm artifacts"
```

Expected: commit succeeds with file count printed.

---

## Task 2: Install runtime + test dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install runtime deps (pinia)**

```bash
cd /Users/dh/Desktop/code/claude-uhd-cc
pnpm add pinia
```

Expected: `pinia` appears under `dependencies`.

- [ ] **Step 2: Install test deps**

```bash
pnpm add -D vitest @vue/test-utils jsdom @vitest/coverage-v8
```

Expected: four packages added under `devDependencies`.

- [ ] **Step 3: Add test scripts to package.json**

Open `package.json`, replace the `scripts` block so it includes test commands. After edit:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "run-p type-check \"build-only {@}\" --",
    "preview": "vite preview",
    "build-only": "vite build",
    "type-check": "vue-tsc --build",
    "lint": "run-s lint:*",
    "lint:oxlint": "oxlint . --fix",
    "lint:eslint": "eslint . --fix --cache",
    "format": "oxfmt src/",
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage"
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add pinia + vitest + @vue/test-utils"
```

---

## Task 3: Configure Vitest

**Files:**
- Create: `vitest.config.ts`
- Create: `tests/setup.ts`

- [ ] **Step 1: Create vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
  },
})
```

- [ ] **Step 2: Create tests/setup.ts**

```typescript
import { config } from '@vue/test-utils'

config.global.stubs = {}
```

- [ ] **Step 3: Verify vitest runs (no tests yet)**

```bash
pnpm test:run
```

Expected: vitest starts, reports `No test files found`, exits with non-zero code. That's OK — we'll fix it with the first real test.

- [ ] **Step 4: Add a trivial sanity test**

Create `tests/setup.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'

describe('vitest setup', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2)
  })
})
```

- [ ] **Step 5: Run and verify it passes**

```bash
pnpm test:run
```

Expected: `1 passed`. After confirming, delete `tests/setup.test.ts`:

```bash
rm tests/setup.test.ts
```

- [ ] **Step 6: Commit**

```bash
git add vitest.config.ts tests/setup.ts
git commit -m "chore: configure vitest with jsdom + @vue/test-utils"
```

---

## Task 4: Clean up Vue scaffold defaults

**Files:**
- Delete: `src/components/HelloWorld.vue` (if present), `src/components/TheWelcome.vue`, `src/components/WelcomeItem.vue`, `src/components/icons/` (if present), `src/views/`, `src/router/`, `src/assets/` template defaults
- Modify: `src/App.vue`, `src/main.ts`

- [ ] **Step 1: List scaffold files to inspect what was generated**

```bash
ls /Users/dh/Desktop/code/claude-uhd-cc/src/
ls /Users/dh/Desktop/code/claude-uhd-cc/src/components/ 2>/dev/null || true
ls /Users/dh/Desktop/code/claude-uhd-cc/src/assets/ 2>/dev/null || true
```

Expected: see whatever Vue scaffold generated. Note any folders that exist.

- [ ] **Step 2: Remove scaffold demo content**

```bash
cd /Users/dh/Desktop/code/claude-uhd-cc
rm -rf src/components/HelloWorld.vue src/components/TheWelcome.vue src/components/WelcomeItem.vue src/components/icons src/views src/router src/stores 2>/dev/null
rm -f src/assets/base.css src/assets/logo.svg src/assets/main.css 2>/dev/null
```

(Some paths may not exist — `rm -f`/`rm -rf` silently ignore missing files.)

- [ ] **Step 3: Replace src/main.ts to install Pinia**

```typescript
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import './style.css'

const app = createApp(App)
app.use(createPinia())
app.mount('#app')
```

- [ ] **Step 4: Replace src/App.vue with empty shell**

```vue
<script setup lang="ts">
</script>

<template>
  <div id="app-shell">
    <header class="topbar">
      <span class="logo">▆ claude-hud.cfg</span>
    </header>
    <main class="preview-stage">
      <p class="placeholder">Preview goes here</p>
    </main>
  </div>
</template>
```

- [ ] **Step 5: Verify dev server starts**

```bash
pnpm dev
```

Expected: Vite prints `Local: http://localhost:5173/`. Open it in a browser, see the topbar + "Preview goes here". Stop the server with Ctrl+C.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: strip Vue scaffold defaults; install Pinia; minimal App.vue shell"
```

---

## Task 5: Terminal-vibe CSS tokens

**Files:**
- Create: `src/style.css`

- [ ] **Step 1: Write src/style.css**

```css
:root {
  --bg-base:       #0a0e1a;
  --bg-elevated:   #11162a;
  --bg-deep:       #050811;
  --border-dim:    #1f2937;
  --border-dash:   #2d3548;

  --fg-base:       #cbd5e1;
  --fg-dim:        #6b7280;
  --fg-bright:     #e2e8f0;
  --accent:        #38bdf8;
  --accent-warm:   #fcd34d;
  --accent-bad:    #f87171;
  --accent-magenta:#f0abfc;

  --color-named-dim:           #6b7280;
  --color-named-red:           #f87171;
  --color-named-green:         #86efac;
  --color-named-yellow:        #fcd34d;
  --color-named-magenta:       #f0abfc;
  --color-named-cyan:          #67e8f9;
  --color-named-brightBlue:    #7dd3fc;
  --color-named-brightMagenta: #d8b4fe;

  --font-mono: ui-monospace, "JetBrains Mono", "Fira Code", "SF Mono", Menlo, monospace;
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
}

* { box-sizing: border-box; }

html, body, #app {
  margin: 0;
  padding: 0;
  height: 100%;
  background: var(--bg-base);
  color: var(--fg-base);
  font-family: var(--font-mono);
  font-size: 14px;
  line-height: 1.5;
}

#app-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.topbar {
  display: flex;
  align-items: center;
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px dashed var(--border-dash);
  gap: var(--space-3);
}

.logo {
  color: var(--accent);
  font-weight: 600;
}

.preview-stage {
  padding: var(--space-4);
}

.placeholder {
  color: var(--fg-dim);
  font-size: 12px;
}
```

- [ ] **Step 2: Verify dev server picks up the styles**

```bash
pnpm dev
```

Expected: dark background, monospace font, cyan logo. Stop with Ctrl+C.

- [ ] **Step 3: Commit**

```bash
git add src/style.css
git commit -m "feat: terminal-vibe CSS tokens"
```

---

## Task 6: HudConfig schema + DEFAULT_CONFIG (hand-copy)

**Files:**
- Create: `src/lib/hud-schema.ts`
- Test: `tests/unit/hud-schema.test.ts`

This is a hand-transcription of the relevant types from upstream `~/.claude/plugins/marketplaces/claude-hud/src/config.ts`. Keep field names byte-identical so JSON round-trips work.

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/hud-schema.test.ts
import { describe, it, expect } from 'vitest'
import { DEFAULT_CONFIG, DEFAULT_ELEMENT_ORDER, KNOWN_HUD_ELEMENTS } from '@/lib/hud-schema'

describe('hud-schema', () => {
  it('DEFAULT_CONFIG has expected top-level keys', () => {
    expect(Object.keys(DEFAULT_CONFIG).sort()).toEqual([
      'colors',
      'display',
      'elementOrder',
      'forceMaxWidth',
      'gitStatus',
      'language',
      'lineLayout',
      'maxWidth',
      'pathLevels',
      'showSeparators',
    ])
  })

  it('DEFAULT_ELEMENT_ORDER contains all 11 known elements', () => {
    expect(DEFAULT_ELEMENT_ORDER).toHaveLength(11)
    expect(new Set(DEFAULT_ELEMENT_ORDER)).toEqual(KNOWN_HUD_ELEMENTS)
  })

  it('DEFAULT_CONFIG.language is "en"', () => {
    expect(DEFAULT_CONFIG.language).toBe('en')
  })

  it('DEFAULT_CONFIG.lineLayout is "expanded"', () => {
    expect(DEFAULT_CONFIG.lineLayout).toBe('expanded')
  })

  it('DEFAULT_CONFIG.display.contextWarningThreshold is 70', () => {
    expect(DEFAULT_CONFIG.display.contextWarningThreshold).toBe(70)
  })

  it('DEFAULT_CONFIG.display.contextCriticalThreshold is 85', () => {
    expect(DEFAULT_CONFIG.display.contextCriticalThreshold).toBe(85)
  })

  it('DEFAULT_CONFIG.colors.barFilled is "█"', () => {
    expect(DEFAULT_CONFIG.colors.barFilled).toBe('█')
  })
})
```

- [ ] **Step 2: Run, verify it fails**

```bash
pnpm test:run -- hud-schema
```

Expected: FAIL with `Cannot find module '@/lib/hud-schema'`.

- [ ] **Step 3: Create src/lib/hud-schema.ts**

```typescript
export type Language = 'en' | 'zh'
export type LineLayoutType = 'compact' | 'expanded'
export type AutocompactBufferMode = 'enabled' | 'disabled'
export type ContextValueMode = 'percent' | 'tokens' | 'remaining' | 'both'
export type UsageValueMode = 'percent' | 'remaining'
export type GitBranchOverflowMode = 'truncate' | 'wrap'
export type ModelFormatMode = 'full' | 'compact' | 'short'
export type TimeFormatMode = 'relative' | 'absolute' | 'both'
export type AddedDirsLayout = 'inline' | 'line'

export type HudElement =
  | 'project'
  | 'addedDirs'
  | 'context'
  | 'usage'
  | 'promptCache'
  | 'memory'
  | 'environment'
  | 'tools'
  | 'agents'
  | 'todos'
  | 'sessionTime'

export type HudColorName =
  | 'dim'
  | 'red'
  | 'green'
  | 'yellow'
  | 'magenta'
  | 'cyan'
  | 'brightBlue'
  | 'brightMagenta'

export type HudColorValue = HudColorName | number | string

export interface HudColorOverrides {
  context: HudColorValue
  usage: HudColorValue
  warning: HudColorValue
  usageWarning: HudColorValue
  critical: HudColorValue
  model: HudColorValue
  project: HudColorValue
  git: HudColorValue
  gitBranch: HudColorValue
  label: HudColorValue
  custom: HudColorValue
  barFilled: string
  barEmpty: string
}

export interface HudGitStatusConfig {
  enabled: boolean
  showDirty: boolean
  showAheadBehind: boolean
  showFileStats: boolean
  branchOverflow: GitBranchOverflowMode
  pushWarningThreshold: number
  pushCriticalThreshold: number
}

export interface HudDisplayConfig {
  showModel: boolean
  showProject: boolean
  showAddedDirs: boolean
  addedDirsLayout: AddedDirsLayout
  showContextBar: boolean
  contextValue: ContextValueMode
  showConfigCounts: boolean
  showCost: boolean
  showDuration: boolean
  showSpeed: boolean
  showTokenBreakdown: boolean
  showUsage: boolean
  usageValue: UsageValueMode
  usageBarEnabled: boolean
  showResetLabel: boolean
  usageCompact: boolean
  showTools: boolean
  showAgents: boolean
  showTodos: boolean
  showSessionName: boolean
  showClaudeCodeVersion: boolean
  showEffortLevel: boolean
  showMemoryUsage: boolean
  showPromptCache: boolean
  promptCacheTtlSeconds: number
  showSessionTokens: boolean
  showOutputStyle: boolean
  showSessionStartDate: boolean
  showLastResponseAt: boolean
  mergeGroups: HudElement[][]
  autocompactBuffer: AutocompactBufferMode
  contextWarningThreshold: number
  contextCriticalThreshold: number
  usageThreshold: number
  sevenDayThreshold: number
  environmentThreshold: number
  externalUsagePath: string
  externalUsageFreshnessMs: number
  modelFormat: ModelFormatMode
  modelOverride: string
  customLine: string
  timeFormat: TimeFormatMode
}

export interface HudConfig {
  language: Language
  lineLayout: LineLayoutType
  showSeparators: boolean
  pathLevels: 1 | 2 | 3
  maxWidth: number | null
  forceMaxWidth: boolean
  elementOrder: HudElement[]
  gitStatus: HudGitStatusConfig
  display: HudDisplayConfig
  colors: HudColorOverrides
}

export const DEFAULT_ELEMENT_ORDER: HudElement[] = [
  'project',
  'addedDirs',
  'context',
  'usage',
  'promptCache',
  'memory',
  'environment',
  'tools',
  'agents',
  'todos',
  'sessionTime',
]

export const KNOWN_HUD_ELEMENTS: ReadonlySet<HudElement> = new Set(DEFAULT_ELEMENT_ORDER)

export const DEFAULT_MERGE_GROUPS: HudElement[][] = [
  ['context', 'usage'],
]

export const DEFAULT_CONFIG: HudConfig = {
  language: 'en',
  lineLayout: 'expanded',
  showSeparators: false,
  pathLevels: 1,
  maxWidth: null,
  forceMaxWidth: false,
  elementOrder: [...DEFAULT_ELEMENT_ORDER],
  gitStatus: {
    enabled: true,
    showDirty: true,
    showAheadBehind: false,
    showFileStats: false,
    branchOverflow: 'truncate',
    pushWarningThreshold: 0,
    pushCriticalThreshold: 0,
  },
  display: {
    showModel: true,
    showProject: true,
    showAddedDirs: true,
    addedDirsLayout: 'inline',
    showContextBar: true,
    contextValue: 'percent',
    showConfigCounts: false,
    showCost: false,
    showDuration: false,
    showSpeed: false,
    showTokenBreakdown: true,
    showUsage: true,
    usageValue: 'percent',
    usageBarEnabled: true,
    showResetLabel: true,
    usageCompact: false,
    showTools: false,
    showAgents: false,
    showTodos: false,
    showSessionName: false,
    showClaudeCodeVersion: false,
    showEffortLevel: false,
    showMemoryUsage: false,
    showPromptCache: false,
    promptCacheTtlSeconds: 300,
    showSessionTokens: false,
    showOutputStyle: false,
    showSessionStartDate: false,
    showLastResponseAt: false,
    mergeGroups: DEFAULT_MERGE_GROUPS.map(g => [...g]),
    autocompactBuffer: 'enabled',
    contextWarningThreshold: 70,
    contextCriticalThreshold: 85,
    usageThreshold: 0,
    sevenDayThreshold: 80,
    environmentThreshold: 0,
    externalUsagePath: '',
    externalUsageFreshnessMs: 300000,
    modelFormat: 'full',
    modelOverride: '',
    customLine: '',
    timeFormat: 'relative',
  },
  colors: {
    context: 'green',
    usage: 'brightBlue',
    warning: 'yellow',
    usageWarning: 'brightMagenta',
    critical: 'red',
    model: 'cyan',
    project: 'yellow',
    git: 'magenta',
    gitBranch: 'cyan',
    label: 'dim',
    custom: 208,
    barFilled: '█',
    barEmpty: '░',
  },
}
```

- [ ] **Step 4: Run tests, verify all pass**

```bash
pnpm test:run -- hud-schema
```

Expected: `7 passed`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/hud-schema.ts tests/unit/hud-schema.test.ts
git commit -m "feat(lib): HudConfig schema + DEFAULT_CONFIG (hand-copy of upstream)"
```

---

## Task 7: Mock RenderContext

**Files:**
- Create: `src/lib/mock-context.ts`
- Test: `tests/unit/mock-context.test.ts`

The mock provides fixed values for everything the renderers need beyond `HudConfig`: model name, project path, token usage, git state, todos, tools, etc.

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/mock-context.test.ts
import { describe, it, expect } from 'vitest'
import { MOCK_CONTEXT } from '@/lib/mock-context'

describe('mock-context', () => {
  it('exposes a model display name', () => {
    expect(MOCK_CONTEXT.model.displayName).toBe('Opus 4.7')
  })

  it('project path ends with claude-uhd-cc', () => {
    expect(MOCK_CONTEXT.project.cwd.endsWith('claude-uhd-cc')).toBe(true)
  })

  it('context usage is 58%', () => {
    expect(MOCK_CONTEXT.context.usedPercentage).toBe(58)
  })

  it('5h usage is 22, 7d usage is 5', () => {
    expect(MOCK_CONTEXT.usage.fiveHour).toBe(22)
    expect(MOCK_CONTEXT.usage.sevenDay).toBe(5)
  })

  it('git is clean and 3 ahead on main', () => {
    expect(MOCK_CONTEXT.git.branch).toBe('main')
    expect(MOCK_CONTEXT.git.dirty).toBe(false)
    expect(MOCK_CONTEXT.git.ahead).toBe(3)
    expect(MOCK_CONTEXT.git.behind).toBe(0)
  })

  it('todos: 2 of 5 done', () => {
    expect(MOCK_CONTEXT.todos.filter(t => t.status === 'completed')).toHaveLength(2)
    expect(MOCK_CONTEXT.todos).toHaveLength(5)
  })

  it('memory usage is 31%', () => {
    expect(MOCK_CONTEXT.memory.usedPercent).toBe(31)
  })

  it('environment threshold counters', () => {
    expect(MOCK_CONTEXT.environment.claudeMdCount).toBe(4)
    expect(MOCK_CONTEXT.environment.mcpCount).toBe(2)
    expect(MOCK_CONTEXT.environment.hooksCount).toBe(1)
  })
})
```

- [ ] **Step 2: Run, verify it fails**

```bash
pnpm test:run -- mock-context
```

Expected: FAIL with `Cannot find module '@/lib/mock-context'`.

- [ ] **Step 3: Create src/lib/mock-context.ts**

```typescript
export interface MockTodo {
  content: string
  status: 'pending' | 'in_progress' | 'completed'
}

export interface MockToolRecent {
  name: string
  target?: string
}

export interface MockAgent {
  type: string
  status: 'running' | 'completed'
}

export interface MockContext {
  model: {
    displayName: string
    id: string
  }
  project: {
    cwd: string
    addedDirs: string[]
    sessionName: string
  }
  context: {
    usedPercentage: number
    inputTokens: number
    outputTokens: number
    cacheCreationTokens: number
    cacheReadTokens: number
    contextWindow: number
  }
  usage: {
    fiveHour: number
    sevenDay: number
    fiveHourResetAtMinutes: number
    sevenDayResetAtMinutes: number
  }
  cost: {
    totalUsd: number
    durationMs: number
    linesAdded: number
    linesRemoved: number
  }
  git: {
    branch: string
    dirty: boolean
    ahead: number
    behind: number
    untrackedFiles: number
    modifiedFiles: number
    pushPendingCount: number
  }
  todos: MockTodo[]
  tools: MockToolRecent[]
  agents: MockAgent[]
  memory: {
    usedPercent: number
    usedGb: number
    totalGb: number
  }
  environment: {
    claudeMdCount: number
    rulesCount: number
    mcpCount: number
    hooksCount: number
  }
  session: {
    durationLabel: string
    lastResponseAgoLabel: string
    startedAtLabel: string
  }
  effort: {
    level: 'low' | 'medium' | 'high' | 'max'
    symbol: string
  }
  outputStyle: string
  claudeCodeVersion: string
  promptCache: {
    activeUntilMs: number
    ttlSeconds: number
  }
}

export const MOCK_CONTEXT: MockContext = {
  model: {
    displayName: 'Opus 4.7',
    id: 'claude-opus-4-7',
  },
  project: {
    cwd: '/Users/dh/Desktop/code/claude-uhd-cc',
    addedDirs: [],
    sessionName: 'plan-foundation',
  },
  context: {
    usedPercentage: 58,
    inputTokens: 142_000,
    outputTokens: 18_500,
    cacheCreationTokens: 8_200,
    cacheReadTokens: 96_000,
    contextWindow: 1_000_000,
  },
  usage: {
    fiveHour: 22,
    sevenDay: 5,
    fiveHourResetAtMinutes: 144,
    sevenDayResetAtMinutes: 3_840,
  },
  cost: {
    totalUsd: 0.42,
    durationMs: 873_000,
    linesAdded: 412,
    linesRemoved: 88,
  },
  git: {
    branch: 'main',
    dirty: false,
    ahead: 3,
    behind: 0,
    untrackedFiles: 0,
    modifiedFiles: 0,
    pushPendingCount: 3,
  },
  todos: [
    { content: 'Write the spec',          status: 'completed' },
    { content: 'Build preview engine',    status: 'completed' },
    { content: 'Implement editor tabs',   status: 'in_progress' },
    { content: 'Hook up URL sharing',     status: 'pending' },
    { content: 'Deploy to GitHub Pages',  status: 'pending' },
  ],
  tools: [
    { name: 'Read', target: 'src/App.vue' },
    { name: 'Edit', target: 'src/style.css' },
    { name: 'Bash' },
  ],
  agents: [
    { type: 'explore', status: 'running' },
  ],
  memory: {
    usedPercent: 31,
    usedGb: 9.9,
    totalGb: 32,
  },
  environment: {
    claudeMdCount: 4,
    rulesCount: 2,
    mcpCount: 2,
    hooksCount: 1,
  },
  session: {
    durationLabel: '14m 33s',
    lastResponseAgoLabel: '12s',
    startedAtLabel: '14:46',
  },
  effort: {
    level: 'high',
    symbol: '◆',
  },
  outputStyle: 'default',
  claudeCodeVersion: '2.1.119',
  promptCache: {
    activeUntilMs: 240_000,
    ttlSeconds: 300,
  },
}
```

- [ ] **Step 4: Run tests, verify all pass**

```bash
pnpm test:run -- mock-context
```

Expected: `8 passed`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/mock-context.ts tests/unit/mock-context.test.ts
git commit -m "feat(lib): MOCK_CONTEXT fixed preview scenario"
```

---

## Task 8: Color mapper

**Files:**
- Create: `src/preview/color-map.ts`
- Test: `tests/unit/color-map.test.ts`

Maps `HudColorValue` (named name, 256-color index, or hex string) to a CSS color string usable in inline styles.

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/color-map.test.ts
import { describe, it, expect } from 'vitest'
import { hudColorToCss } from '@/preview/color-map'

describe('color-map', () => {
  it('named: green → CSS variable reference', () => {
    expect(hudColorToCss('green')).toBe('var(--color-named-green)')
  })

  it('named: brightBlue', () => {
    expect(hudColorToCss('brightBlue')).toBe('var(--color-named-brightBlue)')
  })

  it('hex passes through', () => {
    expect(hudColorToCss('#ff8800')).toBe('#ff8800')
  })

  it('256-color index 208 maps to known hex', () => {
    expect(hudColorToCss(208)).toBe('#ff8700')
  })

  it('256-color index 16 (deep black) maps to #000000', () => {
    expect(hudColorToCss(16)).toBe('#000000')
  })

  it('256-color index 231 (off-white) maps to #ffffff', () => {
    expect(hudColorToCss(231)).toBe('#ffffff')
  })

  it('unknown named falls back to fg-base var', () => {
    expect(hudColorToCss('notAColor' as any)).toBe('var(--fg-base)')
  })

  it('out-of-range index falls back', () => {
    expect(hudColorToCss(999 as any)).toBe('var(--fg-base)')
  })
})
```

- [ ] **Step 2: Run, verify it fails**

```bash
pnpm test:run -- color-map
```

Expected: FAIL with module-not-found.

- [ ] **Step 3: Create src/preview/color-map.ts**

```typescript
import type { HudColorValue, HudColorName } from '@/lib/hud-schema'

const NAMED: ReadonlySet<HudColorName> = new Set([
  'dim',
  'red',
  'green',
  'yellow',
  'magenta',
  'cyan',
  'brightBlue',
  'brightMagenta',
])

const HEX_PATTERN = /^#[0-9a-fA-F]{6}$/

const STD_COLORS_16 = [
  '#000000', '#800000', '#008000', '#808000',
  '#000080', '#800080', '#008080', '#c0c0c0',
  '#808080', '#ff0000', '#00ff00', '#ffff00',
  '#0000ff', '#ff00ff', '#00ffff', '#ffffff',
]

const STEPS_6 = [0x00, 0x5f, 0x87, 0xaf, 0xd7, 0xff]

function index256ToHex(i: number): string | null {
  if (!Number.isInteger(i) || i < 0 || i > 255) return null
  if (i < 16) return STD_COLORS_16[i]
  if (i >= 16 && i <= 231) {
    const n = i - 16
    const r = STEPS_6[Math.floor(n / 36)]
    const g = STEPS_6[Math.floor((n % 36) / 6)]
    const b = STEPS_6[n % 6]
    return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')
  }
  // 232..255 grayscale
  const v = 8 + (i - 232) * 10
  const h = v.toString(16).padStart(2, '0')
  return `#${h}${h}${h}`
}

export function hudColorToCss(value: HudColorValue): string {
  if (typeof value === 'string' && NAMED.has(value as HudColorName)) {
    return `var(--color-named-${value})`
  }
  if (typeof value === 'string' && HEX_PATTERN.test(value)) {
    return value
  }
  if (typeof value === 'number') {
    const hex = index256ToHex(value)
    if (hex) return hex
  }
  return 'var(--fg-base)'
}
```

- [ ] **Step 4: Run tests, verify all pass**

```bash
pnpm test:run -- color-map
```

Expected: `8 passed`.

- [ ] **Step 5: Commit**

```bash
git add src/preview/color-map.ts tests/unit/color-map.test.ts
git commit -m "feat(preview): hudColorToCss — named / 256-index / hex → CSS color"
```

---

## Task 9: Preview render types

**Files:**
- Create: `src/preview/types.ts`

A `RenderSpan` is a styled chunk of text. A `RenderLine` is an array of spans. Lines never contain ANSI; styling is via `color` (already a CSS color string from `hudColorToCss`) and optional `className` for special cases.

- [ ] **Step 1: Create src/preview/types.ts**

```typescript
export interface RenderSpan {
  text: string
  color?: string
  bold?: boolean
  dim?: boolean
}

export type RenderLine = RenderSpan[]
```

- [ ] **Step 2: Commit**

```bash
git add src/preview/types.ts
git commit -m "feat(preview): RenderSpan / RenderLine types"
```

---

## Task 10: renderProject (project + addedDirs)

**Files:**
- Create: `src/preview/lines/renderProject.ts`
- Test: `tests/unit/preview/renderProject.test.ts`

Renders the project line: model badge + project name (path-truncated by `pathLevels`) + addedDirs (inline or new line per `addedDirsLayout`).

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/preview/renderProject.test.ts
import { describe, it, expect } from 'vitest'
import { renderProject } from '@/preview/lines/renderProject'
import { DEFAULT_CONFIG } from '@/lib/hud-schema'
import { MOCK_CONTEXT } from '@/lib/mock-context'

describe('renderProject', () => {
  it('returns one line under default config', () => {
    const lines = renderProject(DEFAULT_CONFIG, MOCK_CONTEXT)
    expect(lines).toHaveLength(1)
  })

  it('first line includes model badge and project name', () => {
    const [line] = renderProject(DEFAULT_CONFIG, MOCK_CONTEXT)
    const text = line.map(s => s.text).join('')
    expect(text).toContain('Opus 4.7')
    expect(text).toContain('claude-uhd-cc')
  })

  it('respects showProject = false (omits project name)', () => {
    const cfg = { ...DEFAULT_CONFIG, display: { ...DEFAULT_CONFIG.display, showProject: false } }
    const [line] = renderProject(cfg, MOCK_CONTEXT)
    const text = line.map(s => s.text).join('')
    expect(text).toContain('Opus 4.7')
    expect(text).not.toContain('claude-uhd-cc')
  })

  it('respects showModel = false (omits model badge)', () => {
    const cfg = { ...DEFAULT_CONFIG, display: { ...DEFAULT_CONFIG.display, showModel: false } }
    const [line] = renderProject(cfg, MOCK_CONTEXT)
    const text = line.map(s => s.text).join('')
    expect(text).not.toContain('Opus 4.7')
    expect(text).toContain('claude-uhd-cc')
  })

  it('pathLevels=2 shows two path segments', () => {
    const ctx = { ...MOCK_CONTEXT, project: { ...MOCK_CONTEXT.project, cwd: '/Users/dh/Desktop/code/claude-uhd-cc' } }
    const cfg = { ...DEFAULT_CONFIG, pathLevels: 2 as const }
    const [line] = renderProject(cfg, ctx)
    const text = line.map(s => s.text).join('')
    expect(text).toContain('code/claude-uhd-cc')
  })

  it('addedDirsLayout="line" produces a second line', () => {
    const ctx = { ...MOCK_CONTEXT, project: { ...MOCK_CONTEXT.project, addedDirs: ['/tmp/extra'] } }
    const cfg = {
      ...DEFAULT_CONFIG,
      display: { ...DEFAULT_CONFIG.display, addedDirsLayout: 'line' as const },
    }
    const lines = renderProject(cfg, ctx)
    expect(lines).toHaveLength(2)
    expect(lines[1].map(s => s.text).join('')).toContain('/tmp/extra')
  })
})
```

- [ ] **Step 2: Run, verify it fails**

```bash
pnpm test:run -- renderProject
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create src/preview/lines/renderProject.ts**

```typescript
import type { HudConfig, ModelFormatMode } from '@/lib/hud-schema'
import type { MockContext } from '@/lib/mock-context'
import type { RenderLine } from '@/preview/types'
import { hudColorToCss } from '@/preview/color-map'

function formatModel(displayName: string, mode: ModelFormatMode, override: string): string {
  if (override.trim()) return override.trim()
  if (mode === 'full') return displayName
  // strip (1M context) etc.
  const withoutCtx = displayName.replace(/\s*\([^)]*context[^)]*\)\s*$/i, '').trim()
  if (mode === 'compact') return withoutCtx
  // short: also strip "Claude " prefix
  return withoutCtx.replace(/^Claude\s+/i, '')
}

function truncatePath(cwd: string, levels: 1 | 2 | 3): string {
  const segments = cwd.split('/').filter(Boolean)
  const kept = segments.slice(-levels)
  return kept.join('/')
}

export function renderProject(config: HudConfig, ctx: MockContext): RenderLine[] {
  const { display, colors, pathLevels } = config
  const lines: RenderLine[] = []
  const first: RenderLine = []

  if (display.showModel) {
    const label = formatModel(ctx.model.displayName, display.modelFormat, display.modelOverride)
    first.push({ text: '[', color: hudColorToCss(colors.model) })
    first.push({ text: label, color: hudColorToCss(colors.model) })
    first.push({ text: ']', color: hudColorToCss(colors.model) })
  }

  if (display.showProject) {
    if (first.length > 0) first.push({ text: ' ' })
    const path = truncatePath(ctx.project.cwd, pathLevels)
    first.push({ text: path, color: hudColorToCss(colors.project) })
  }

  if (first.length > 0) lines.push(first)

  if (display.showAddedDirs && ctx.project.addedDirs.length > 0) {
    if (display.addedDirsLayout === 'inline') {
      const target = lines[0] ?? []
      target.push({ text: ' (' + ctx.project.addedDirs.join(', ') + ')', dim: true })
      if (lines.length === 0) lines.push(target)
    } else {
      lines.push([{ text: '+ ' + ctx.project.addedDirs.join(', '), dim: true }])
    }
  }

  return lines
}
```

- [ ] **Step 4: Run tests, verify all pass**

```bash
pnpm test:run -- renderProject
```

Expected: `6 passed`.

- [ ] **Step 5: Commit**

```bash
git add src/preview/lines/renderProject.ts tests/unit/preview/renderProject.test.ts
git commit -m "feat(preview): renderProject — model badge + path + addedDirs"
```

---

## Task 11: renderContext (context bar + tokens)

**Files:**
- Create: `src/preview/lines/renderContext.ts`
- Test: `tests/unit/preview/renderContext.test.ts`

Renders the context-usage line: optional bar + value (percent / tokens / remaining / both) using threshold-driven colors.

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/preview/renderContext.test.ts
import { describe, it, expect } from 'vitest'
import { renderContext } from '@/preview/lines/renderContext'
import { DEFAULT_CONFIG } from '@/lib/hud-schema'
import { MOCK_CONTEXT } from '@/lib/mock-context'

describe('renderContext', () => {
  it('returns one line under default', () => {
    const lines = renderContext(DEFAULT_CONFIG, MOCK_CONTEXT)
    expect(lines).toHaveLength(1)
    expect(lines[0].length).toBeGreaterThan(0)
  })

  it('default contains a label "ctx"', () => {
    const [line] = renderContext(DEFAULT_CONFIG, MOCK_CONTEXT)
    expect(line.map(s => s.text).join('')).toContain('ctx')
  })

  it('contextValue=percent shows "58%"', () => {
    const [line] = renderContext(DEFAULT_CONFIG, MOCK_CONTEXT)
    expect(line.map(s => s.text).join('')).toContain('58%')
  })

  it('contextValue=tokens shows token count', () => {
    const cfg = { ...DEFAULT_CONFIG, display: { ...DEFAULT_CONFIG.display, contextValue: 'tokens' as const } }
    const [line] = renderContext(cfg, MOCK_CONTEXT)
    expect(line.map(s => s.text).join('')).toMatch(/\d/)
  })

  it('contextValue=remaining shows remaining %', () => {
    const cfg = { ...DEFAULT_CONFIG, display: { ...DEFAULT_CONFIG.display, contextValue: 'remaining' as const } }
    const [line] = renderContext(cfg, MOCK_CONTEXT)
    expect(line.map(s => s.text).join('')).toContain('42%')
  })

  it('showContextBar=false omits the bar character', () => {
    const cfg = { ...DEFAULT_CONFIG, display: { ...DEFAULT_CONFIG.display, showContextBar: false } }
    const [line] = renderContext(cfg, MOCK_CONTEXT)
    const text = line.map(s => s.text).join('')
    expect(text).not.toContain('█')
    expect(text).not.toContain('░')
  })

  it('warning color when usage > warningThreshold but < criticalThreshold', () => {
    const ctx = { ...MOCK_CONTEXT, context: { ...MOCK_CONTEXT.context, usedPercentage: 75 } }
    const [line] = renderContext(DEFAULT_CONFIG, ctx)
    const valSpan = line.find(s => s.text.includes('75%'))
    expect(valSpan?.color).toBe('var(--color-named-yellow)')
  })

  it('critical color when usage > criticalThreshold', () => {
    const ctx = { ...MOCK_CONTEXT, context: { ...MOCK_CONTEXT.context, usedPercentage: 92 } }
    const [line] = renderContext(DEFAULT_CONFIG, ctx)
    const valSpan = line.find(s => s.text.includes('92%'))
    expect(valSpan?.color).toBe('var(--color-named-red)')
  })
})
```

- [ ] **Step 2: Run, verify it fails**

```bash
pnpm test:run -- renderContext
```

Expected: FAIL.

- [ ] **Step 3: Create src/preview/lines/renderContext.ts**

```typescript
import type { HudConfig } from '@/lib/hud-schema'
import type { MockContext } from '@/lib/mock-context'
import type { RenderLine, RenderSpan } from '@/preview/types'
import { hudColorToCss } from '@/preview/color-map'

const BAR_WIDTH = 10

function makeBar(usedPct: number, filled: string, empty: string): string {
  const filledCount = Math.round((Math.max(0, Math.min(100, usedPct)) / 100) * BAR_WIDTH)
  return filled.repeat(filledCount) + empty.repeat(BAR_WIDTH - filledCount)
}

function pickContextColor(usedPct: number, cfg: HudConfig): string {
  const { contextWarningThreshold, contextCriticalThreshold } = cfg.display
  if (usedPct >= contextCriticalThreshold) return hudColorToCss(cfg.colors.critical)
  if (usedPct >= contextWarningThreshold) return hudColorToCss(cfg.colors.warning)
  return hudColorToCss(cfg.colors.context)
}

function formatValue(cfg: HudConfig, ctx: MockContext): string {
  const used = ctx.context.usedPercentage
  switch (cfg.display.contextValue) {
    case 'percent':
      return `${used}%`
    case 'tokens': {
      const total = ctx.context.inputTokens + ctx.context.outputTokens
      return `${total.toLocaleString()} tok`
    }
    case 'remaining':
      return `${100 - used}%`
    case 'both':
      return `${used}% / ${(100 - used)}% rem`
  }
}

export function renderContext(cfg: HudConfig, ctx: MockContext): RenderLine[] {
  const color = pickContextColor(ctx.context.usedPercentage, cfg)
  const labelColor = hudColorToCss(cfg.colors.label)
  const spans: RenderSpan[] = []

  spans.push({ text: 'ctx ', color: labelColor })

  if (cfg.display.showContextBar) {
    const bar = makeBar(ctx.context.usedPercentage, cfg.colors.barFilled, cfg.colors.barEmpty)
    spans.push({ text: bar, color })
    spans.push({ text: ' ' })
  }

  spans.push({ text: formatValue(cfg, ctx), color })

  if (cfg.display.showTokenBreakdown && cfg.display.contextValue !== 'tokens') {
    const t = ctx.context
    spans.push({ text: ` (in ${t.inputTokens.toLocaleString()}/out ${t.outputTokens.toLocaleString()})`, dim: true })
  }

  return [spans]
}
```

- [ ] **Step 4: Run tests, verify all pass**

```bash
pnpm test:run -- renderContext
```

Expected: `8 passed`.

- [ ] **Step 5: Commit**

```bash
git add src/preview/lines/renderContext.ts tests/unit/preview/renderContext.test.ts
git commit -m "feat(preview): renderContext — bar + value + threshold-driven colors"
```

---

## Task 12: renderUsage (5h + 7d)

**Files:**
- Create: `src/preview/lines/renderUsage.ts`
- Test: `tests/unit/preview/renderUsage.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/preview/renderUsage.test.ts
import { describe, it, expect } from 'vitest'
import { renderUsage } from '@/preview/lines/renderUsage'
import { DEFAULT_CONFIG } from '@/lib/hud-schema'
import { MOCK_CONTEXT } from '@/lib/mock-context'

describe('renderUsage', () => {
  it('returns one line with 5h and 7d labels by default', () => {
    const [line] = renderUsage(DEFAULT_CONFIG, MOCK_CONTEXT)
    const text = line.map(s => s.text).join('')
    expect(text).toContain('5h')
    expect(text).toContain('7d')
  })

  it('shows 22% for 5h, 5% for 7d', () => {
    const [line] = renderUsage(DEFAULT_CONFIG, MOCK_CONTEXT)
    const text = line.map(s => s.text).join('')
    expect(text).toContain('22%')
    expect(text).toContain('5%')
  })

  it('usageBarEnabled=false omits bars', () => {
    const cfg = { ...DEFAULT_CONFIG, display: { ...DEFAULT_CONFIG.display, usageBarEnabled: false } }
    const [line] = renderUsage(cfg, MOCK_CONTEXT)
    const text = line.map(s => s.text).join('')
    expect(text).not.toContain('█')
  })

  it('showUsage=false returns no lines', () => {
    const cfg = { ...DEFAULT_CONFIG, display: { ...DEFAULT_CONFIG.display, showUsage: false } }
    expect(renderUsage(cfg, MOCK_CONTEXT)).toHaveLength(0)
  })

  it('usageValue=remaining shows "78%" for 5h', () => {
    const cfg = { ...DEFAULT_CONFIG, display: { ...DEFAULT_CONFIG.display, usageValue: 'remaining' as const } }
    const [line] = renderUsage(cfg, MOCK_CONTEXT)
    const text = line.map(s => s.text).join('')
    expect(text).toContain('78%')
  })

  it('over usageThreshold warns with magenta color', () => {
    const ctx = { ...MOCK_CONTEXT, usage: { ...MOCK_CONTEXT.usage, fiveHour: 88 } }
    const cfg = { ...DEFAULT_CONFIG, display: { ...DEFAULT_CONFIG.display, usageThreshold: 80 } }
    const [line] = renderUsage(cfg, ctx)
    const valSpan = line.find(s => s.text.includes('88%'))
    expect(valSpan?.color).toBe('var(--color-named-brightMagenta)')
  })
})
```

- [ ] **Step 2: Run, verify it fails**

```bash
pnpm test:run -- renderUsage
```

- [ ] **Step 3: Create src/preview/lines/renderUsage.ts**

```typescript
import type { HudConfig } from '@/lib/hud-schema'
import type { MockContext } from '@/lib/mock-context'
import type { RenderLine, RenderSpan } from '@/preview/types'
import { hudColorToCss } from '@/preview/color-map'

const BAR_WIDTH = 10

function makeBar(usedPct: number, filled: string, empty: string): string {
  const filledCount = Math.round((Math.max(0, Math.min(100, usedPct)) / 100) * BAR_WIDTH)
  return filled.repeat(filledCount) + empty.repeat(BAR_WIDTH - filledCount)
}

function pickUsageColor(usedPct: number, threshold: number, cfg: HudConfig): string {
  if (threshold > 0 && usedPct >= threshold) return hudColorToCss(cfg.colors.usageWarning)
  return hudColorToCss(cfg.colors.usage)
}

function formatVal(used: number, mode: 'percent' | 'remaining'): string {
  return mode === 'remaining' ? `${100 - used}%` : `${used}%`
}

function pushSegment(
  spans: RenderSpan[],
  label: string,
  used: number,
  threshold: number,
  cfg: HudConfig,
  labelColor: string,
) {
  spans.push({ text: label + ' ', color: labelColor })
  if (cfg.display.usageBarEnabled) {
    const bar = makeBar(used, cfg.colors.barFilled, cfg.colors.barEmpty)
    spans.push({ text: bar, color: pickUsageColor(used, threshold, cfg) })
    spans.push({ text: ' ' })
  }
  spans.push({ text: formatVal(used, cfg.display.usageValue), color: pickUsageColor(used, threshold, cfg) })
}

export function renderUsage(cfg: HudConfig, ctx: MockContext): RenderLine[] {
  if (!cfg.display.showUsage) return []
  const labelColor = hudColorToCss(cfg.colors.label)
  const spans: RenderSpan[] = []

  pushSegment(spans, '5h', ctx.usage.fiveHour, cfg.display.usageThreshold, cfg, labelColor)
  spans.push({ text: '  ' })
  pushSegment(spans, '7d', ctx.usage.sevenDay, cfg.display.sevenDayThreshold, cfg, labelColor)

  if (cfg.display.showResetLabel) {
    spans.push({
      text: ` (reset in ${ctx.usage.fiveHourResetAtMinutes}m / ${Math.round(ctx.usage.sevenDayResetAtMinutes / 60)}h)`,
      dim: true,
    })
  }

  return [spans]
}
```

- [ ] **Step 4: Run tests, verify all pass**

```bash
pnpm test:run -- renderUsage
```

Expected: `6 passed`.

- [ ] **Step 5: Commit**

```bash
git add src/preview/lines/renderUsage.ts tests/unit/preview/renderUsage.test.ts
git commit -m "feat(preview): renderUsage — 5h/7d with bars + thresholds"
```

---

## Task 13: renderPromptCache

**Files:**
- Create: `src/preview/lines/renderPromptCache.ts`
- Test: `tests/unit/preview/renderPromptCache.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/preview/renderPromptCache.test.ts
import { describe, it, expect } from 'vitest'
import { renderPromptCache } from '@/preview/lines/renderPromptCache'
import { DEFAULT_CONFIG } from '@/lib/hud-schema'
import { MOCK_CONTEXT } from '@/lib/mock-context'

describe('renderPromptCache', () => {
  it('returns nothing when showPromptCache is false (default)', () => {
    expect(renderPromptCache(DEFAULT_CONFIG, MOCK_CONTEXT)).toHaveLength(0)
  })

  it('returns a line when showPromptCache is true', () => {
    const cfg = { ...DEFAULT_CONFIG, display: { ...DEFAULT_CONFIG.display, showPromptCache: true } }
    const lines = renderPromptCache(cfg, MOCK_CONTEXT)
    expect(lines).toHaveLength(1)
    const text = lines[0].map(s => s.text).join('')
    expect(text).toContain('cache')
  })

  it('shows the active-until duration when active', () => {
    const cfg = { ...DEFAULT_CONFIG, display: { ...DEFAULT_CONFIG.display, showPromptCache: true } }
    const lines = renderPromptCache(cfg, MOCK_CONTEXT)
    const text = lines[0].map(s => s.text).join('')
    expect(text).toMatch(/\d+s|\d+m/)
  })
})
```

- [ ] **Step 2: Run, verify it fails**

```bash
pnpm test:run -- renderPromptCache
```

- [ ] **Step 3: Create src/preview/lines/renderPromptCache.ts**

```typescript
import type { HudConfig } from '@/lib/hud-schema'
import type { MockContext } from '@/lib/mock-context'
import type { RenderLine } from '@/preview/types'
import { hudColorToCss } from '@/preview/color-map'

function formatRemaining(ms: number): string {
  if (ms <= 0) return 'expired'
  const totalS = Math.round(ms / 1000)
  if (totalS < 60) return `${totalS}s`
  const m = Math.floor(totalS / 60)
  const s = totalS % 60
  return s === 0 ? `${m}m` : `${m}m ${s}s`
}

export function renderPromptCache(cfg: HudConfig, ctx: MockContext): RenderLine[] {
  if (!cfg.display.showPromptCache) return []
  const labelColor = hudColorToCss(cfg.colors.label)
  const valueColor = hudColorToCss(cfg.colors.context)
  return [[
    { text: 'cache ', color: labelColor },
    { text: formatRemaining(ctx.promptCache.activeUntilMs), color: valueColor },
    { text: ` (ttl ${cfg.display.promptCacheTtlSeconds}s)`, dim: true },
  ]]
}
```

- [ ] **Step 4: Run tests, verify all pass**

```bash
pnpm test:run -- renderPromptCache
```

Expected: `3 passed`.

- [ ] **Step 5: Commit**

```bash
git add src/preview/lines/renderPromptCache.ts tests/unit/preview/renderPromptCache.test.ts
git commit -m "feat(preview): renderPromptCache — TTL + active-until"
```

---

## Task 14: renderMemory

**Files:**
- Create: `src/preview/lines/renderMemory.ts`
- Test: `tests/unit/preview/renderMemory.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/preview/renderMemory.test.ts
import { describe, it, expect } from 'vitest'
import { renderMemory } from '@/preview/lines/renderMemory'
import { DEFAULT_CONFIG } from '@/lib/hud-schema'
import { MOCK_CONTEXT } from '@/lib/mock-context'

describe('renderMemory', () => {
  it('returns nothing when showMemoryUsage=false (default)', () => {
    expect(renderMemory(DEFAULT_CONFIG, MOCK_CONTEXT)).toHaveLength(0)
  })

  it('returns a line when showMemoryUsage=true', () => {
    const cfg = { ...DEFAULT_CONFIG, display: { ...DEFAULT_CONFIG.display, showMemoryUsage: true } }
    const [line] = renderMemory(cfg, MOCK_CONTEXT)
    const text = line.map(s => s.text).join('')
    expect(text).toContain('mem')
    expect(text).toContain('31%')
    expect(text).toContain('9.9/32 GB')
  })
})
```

- [ ] **Step 2: Run, verify it fails**

```bash
pnpm test:run -- renderMemory
```

- [ ] **Step 3: Create src/preview/lines/renderMemory.ts**

```typescript
import type { HudConfig } from '@/lib/hud-schema'
import type { MockContext } from '@/lib/mock-context'
import type { RenderLine } from '@/preview/types'
import { hudColorToCss } from '@/preview/color-map'

export function renderMemory(cfg: HudConfig, ctx: MockContext): RenderLine[] {
  if (!cfg.display.showMemoryUsage) return []
  const labelColor = hudColorToCss(cfg.colors.label)
  const valueColor = hudColorToCss(cfg.colors.usage)
  return [[
    { text: 'mem ', color: labelColor },
    { text: `${ctx.memory.usedPercent}%`, color: valueColor },
    { text: ` (${ctx.memory.usedGb}/${ctx.memory.totalGb} GB)`, dim: true },
  ]]
}
```

- [ ] **Step 4: Run tests, verify all pass**

```bash
pnpm test:run -- renderMemory
```

Expected: `2 passed`.

- [ ] **Step 5: Commit**

```bash
git add src/preview/lines/renderMemory.ts tests/unit/preview/renderMemory.test.ts
git commit -m "feat(preview): renderMemory — usage% + GB"
```

---

## Task 15: renderEnvironment

**Files:**
- Create: `src/preview/lines/renderEnvironment.ts`
- Test: `tests/unit/preview/renderEnvironment.test.ts`

Shows counts of CLAUDE.md files, rules, MCPs, hooks. Only rendered if `showConfigCounts` is true.

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/preview/renderEnvironment.test.ts
import { describe, it, expect } from 'vitest'
import { renderEnvironment } from '@/preview/lines/renderEnvironment'
import { DEFAULT_CONFIG } from '@/lib/hud-schema'
import { MOCK_CONTEXT } from '@/lib/mock-context'

describe('renderEnvironment', () => {
  it('returns nothing when showConfigCounts=false (default)', () => {
    expect(renderEnvironment(DEFAULT_CONFIG, MOCK_CONTEXT)).toHaveLength(0)
  })

  it('shows the four counts when showConfigCounts=true', () => {
    const cfg = { ...DEFAULT_CONFIG, display: { ...DEFAULT_CONFIG.display, showConfigCounts: true } }
    const [line] = renderEnvironment(cfg, MOCK_CONTEXT)
    const text = line.map(s => s.text).join('')
    expect(text).toContain('CLAUDE.md×4')
    expect(text).toContain('rules×2')
    expect(text).toContain('mcp×2')
    expect(text).toContain('hooks×1')
  })
})
```

- [ ] **Step 2: Run, verify it fails**

```bash
pnpm test:run -- renderEnvironment
```

- [ ] **Step 3: Create src/preview/lines/renderEnvironment.ts**

```typescript
import type { HudConfig } from '@/lib/hud-schema'
import type { MockContext } from '@/lib/mock-context'
import type { RenderLine } from '@/preview/types'
import { hudColorToCss } from '@/preview/color-map'

export function renderEnvironment(cfg: HudConfig, ctx: MockContext): RenderLine[] {
  if (!cfg.display.showConfigCounts) return []
  const labelColor = hudColorToCss(cfg.colors.label)
  const valueColor = hudColorToCss(cfg.colors.custom)
  const env = ctx.environment
  return [[
    { text: 'env ', color: labelColor },
    { text: `CLAUDE.md×${env.claudeMdCount}`, color: valueColor },
    { text: ' · ' },
    { text: `rules×${env.rulesCount}`, color: valueColor },
    { text: ' · ' },
    { text: `mcp×${env.mcpCount}`, color: valueColor },
    { text: ' · ' },
    { text: `hooks×${env.hooksCount}`, color: valueColor },
  ]]
}
```

- [ ] **Step 4: Run tests, verify all pass**

```bash
pnpm test:run -- renderEnvironment
```

Expected: `2 passed`.

- [ ] **Step 5: Commit**

```bash
git add src/preview/lines/renderEnvironment.ts tests/unit/preview/renderEnvironment.test.ts
git commit -m "feat(preview): renderEnvironment — CLAUDE.md/rules/mcp/hooks counts"
```

---

## Task 16: renderActivity (tools / agents / todos)

**Files:**
- Create: `src/preview/lines/renderActivity.ts`
- Test: `tests/unit/preview/renderActivity.test.ts`

Exports three separate renderers — `renderTools`, `renderAgents`, `renderTodos` — all in one module since they share helpers and styling.

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/preview/renderActivity.test.ts
import { describe, it, expect } from 'vitest'
import { renderTools, renderAgents, renderTodos } from '@/preview/lines/renderActivity'
import { DEFAULT_CONFIG } from '@/lib/hud-schema'
import { MOCK_CONTEXT } from '@/lib/mock-context'

describe('renderActivity', () => {
  it('renderTools is empty when showTools=false (default)', () => {
    expect(renderTools(DEFAULT_CONFIG, MOCK_CONTEXT)).toHaveLength(0)
  })

  it('renderTools lists the mocked tool names when enabled', () => {
    const cfg = { ...DEFAULT_CONFIG, display: { ...DEFAULT_CONFIG.display, showTools: true } }
    const [line] = renderTools(cfg, MOCK_CONTEXT)
    const text = line.map(s => s.text).join('')
    expect(text).toContain('Read')
    expect(text).toContain('Edit')
    expect(text).toContain('Bash')
  })

  it('renderAgents lists running agent type when enabled', () => {
    const cfg = { ...DEFAULT_CONFIG, display: { ...DEFAULT_CONFIG.display, showAgents: true } }
    const [line] = renderAgents(cfg, MOCK_CONTEXT)
    const text = line.map(s => s.text).join('')
    expect(text).toContain('explore')
  })

  it('renderTodos shows 2/5 when enabled', () => {
    const cfg = { ...DEFAULT_CONFIG, display: { ...DEFAULT_CONFIG.display, showTodos: true } }
    const [line] = renderTodos(cfg, MOCK_CONTEXT)
    const text = line.map(s => s.text).join('')
    expect(text).toContain('2/5')
  })
})
```

- [ ] **Step 2: Run, verify it fails**

```bash
pnpm test:run -- renderActivity
```

- [ ] **Step 3: Create src/preview/lines/renderActivity.ts**

```typescript
import type { HudConfig } from '@/lib/hud-schema'
import type { MockContext } from '@/lib/mock-context'
import type { RenderLine } from '@/preview/types'
import { hudColorToCss } from '@/preview/color-map'

export function renderTools(cfg: HudConfig, ctx: MockContext): RenderLine[] {
  if (!cfg.display.showTools || ctx.tools.length === 0) return []
  const labelColor = hudColorToCss(cfg.colors.label)
  const valueColor = hudColorToCss(cfg.colors.custom)
  const names = ctx.tools.map(t => t.target ? `${t.name}·${t.target}` : t.name).join(' ')
  return [[
    { text: '🛠 ', color: labelColor },
    { text: names, color: valueColor },
  ]]
}

export function renderAgents(cfg: HudConfig, ctx: MockContext): RenderLine[] {
  if (!cfg.display.showAgents || ctx.agents.length === 0) return []
  const labelColor = hudColorToCss(cfg.colors.label)
  const valueColor = hudColorToCss(cfg.colors.custom)
  const labels = ctx.agents.map(a => `${a.type}${a.status === 'running' ? '(running)' : ''}`).join(' · ')
  return [[
    { text: '🤖 ', color: labelColor },
    { text: labels, color: valueColor },
  ]]
}

export function renderTodos(cfg: HudConfig, ctx: MockContext): RenderLine[] {
  if (!cfg.display.showTodos || ctx.todos.length === 0) return []
  const labelColor = hudColorToCss(cfg.colors.label)
  const valueColor = hudColorToCss(cfg.colors.custom)
  const done = ctx.todos.filter(t => t.status === 'completed').length
  const inProgress = ctx.todos.find(t => t.status === 'in_progress')
  const headline = inProgress ? ` · ${inProgress.content}` : ''
  return [[
    { text: '✓ ', color: labelColor },
    { text: `${done}/${ctx.todos.length}`, color: valueColor },
    { text: headline, dim: true },
  ]]
}
```

- [ ] **Step 4: Run tests, verify all pass**

```bash
pnpm test:run -- renderActivity
```

Expected: `4 passed`.

- [ ] **Step 5: Commit**

```bash
git add src/preview/lines/renderActivity.ts tests/unit/preview/renderActivity.test.ts
git commit -m "feat(preview): renderActivity — tools / agents / todos"
```

---

## Task 17: renderSessionTime

**Files:**
- Create: `src/preview/lines/renderSessionTime.ts`
- Test: `tests/unit/preview/renderSessionTime.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/preview/renderSessionTime.test.ts
import { describe, it, expect } from 'vitest'
import { renderSessionTime } from '@/preview/lines/renderSessionTime'
import { DEFAULT_CONFIG } from '@/lib/hud-schema'
import { MOCK_CONTEXT } from '@/lib/mock-context'

describe('renderSessionTime', () => {
  it('returns nothing when neither duration nor last-response is enabled (default)', () => {
    expect(renderSessionTime(DEFAULT_CONFIG, MOCK_CONTEXT)).toHaveLength(0)
  })

  it('shows duration when showDuration=true', () => {
    const cfg = { ...DEFAULT_CONFIG, display: { ...DEFAULT_CONFIG.display, showDuration: true } }
    const [line] = renderSessionTime(cfg, MOCK_CONTEXT)
    const text = line.map(s => s.text).join('')
    expect(text).toContain('14m 33s')
  })

  it('shows last response when showLastResponseAt=true', () => {
    const cfg = { ...DEFAULT_CONFIG, display: { ...DEFAULT_CONFIG.display, showLastResponseAt: true } }
    const [line] = renderSessionTime(cfg, MOCK_CONTEXT)
    const text = line.map(s => s.text).join('')
    expect(text).toContain('12s')
  })

  it('shows session start when showSessionStartDate=true', () => {
    const cfg = { ...DEFAULT_CONFIG, display: { ...DEFAULT_CONFIG.display, showSessionStartDate: true } }
    const [line] = renderSessionTime(cfg, MOCK_CONTEXT)
    const text = line.map(s => s.text).join('')
    expect(text).toContain('14:46')
  })
})
```

- [ ] **Step 2: Run, verify it fails**

```bash
pnpm test:run -- renderSessionTime
```

- [ ] **Step 3: Create src/preview/lines/renderSessionTime.ts**

```typescript
import type { HudConfig } from '@/lib/hud-schema'
import type { MockContext } from '@/lib/mock-context'
import type { RenderLine, RenderSpan } from '@/preview/types'
import { hudColorToCss } from '@/preview/color-map'

export function renderSessionTime(cfg: HudConfig, ctx: MockContext): RenderLine[] {
  const { showDuration, showLastResponseAt, showSessionStartDate } = cfg.display
  if (!showDuration && !showLastResponseAt && !showSessionStartDate) return []

  const labelColor = hudColorToCss(cfg.colors.label)
  const valueColor = hudColorToCss(cfg.colors.context)
  const parts: RenderSpan[] = []

  if (showDuration) {
    parts.push({ text: 'session ', color: labelColor })
    parts.push({ text: ctx.session.durationLabel, color: valueColor })
  }
  if (showLastResponseAt) {
    if (parts.length > 0) parts.push({ text: ' · ' })
    parts.push({ text: 'last ', color: labelColor })
    parts.push({ text: ctx.session.lastResponseAgoLabel + ' ago', color: valueColor })
  }
  if (showSessionStartDate) {
    if (parts.length > 0) parts.push({ text: ' · ' })
    parts.push({ text: 'started ', color: labelColor })
    parts.push({ text: ctx.session.startedAtLabel, color: valueColor })
  }

  return [parts]
}
```

- [ ] **Step 4: Run tests, verify all pass**

```bash
pnpm test:run -- renderSessionTime
```

Expected: `4 passed`.

- [ ] **Step 5: Commit**

```bash
git add src/preview/lines/renderSessionTime.ts tests/unit/preview/renderSessionTime.test.ts
git commit -m "feat(preview): renderSessionTime — duration / last response / start"
```

---

## Task 18: render-line orchestrator

**Files:**
- Create: `src/preview/render-line.ts`
- Test: `tests/unit/preview/render-line.test.ts`

Iterates `config.elementOrder`, dispatches to per-element renderers, and merges adjacent elements that share a `mergeGroups` entry into a single line separated by ` │ `.

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/preview/render-line.test.ts
import { describe, it, expect } from 'vitest'
import { renderAll } from '@/preview/render-line'
import { DEFAULT_CONFIG } from '@/lib/hud-schema'
import { MOCK_CONTEXT } from '@/lib/mock-context'

describe('render-line orchestrator', () => {
  it('renders at least project + context lines by default', () => {
    const lines = renderAll(DEFAULT_CONFIG, MOCK_CONTEXT)
    const text = lines.map(l => l.map(s => s.text).join('')).join('\n')
    expect(text).toContain('Opus 4.7')
    expect(text).toContain('claude-uhd-cc')
    expect(text).toContain('ctx')
  })

  it('merges context + usage onto one line under default mergeGroups', () => {
    const lines = renderAll(DEFAULT_CONFIG, MOCK_CONTEXT)
    const merged = lines.find(l => {
      const t = l.map(s => s.text).join('')
      return t.includes('ctx') && t.includes('5h')
    })
    expect(merged).toBeDefined()
  })

  it('elementOrder=[] returns empty (no element lines)', () => {
    const cfg = { ...DEFAULT_CONFIG, elementOrder: [] }
    expect(renderAll(cfg, MOCK_CONTEXT)).toEqual([])
  })

  it('elementOrder=[project] returns only the project line', () => {
    const cfg = { ...DEFAULT_CONFIG, elementOrder: ['project'] as const, display: { ...DEFAULT_CONFIG.display, mergeGroups: [] } }
    const lines = renderAll(cfg, MOCK_CONTEXT)
    expect(lines).toHaveLength(1)
    expect(lines[0].map(s => s.text).join('')).toContain('claude-uhd-cc')
  })
})
```

- [ ] **Step 2: Run, verify it fails**

```bash
pnpm test:run -- render-line
```

- [ ] **Step 3: Create src/preview/render-line.ts**

```typescript
import type { HudConfig, HudElement } from '@/lib/hud-schema'
import type { MockContext } from '@/lib/mock-context'
import type { RenderLine, RenderSpan } from '@/preview/types'

import { renderProject } from '@/preview/lines/renderProject'
import { renderContext } from '@/preview/lines/renderContext'
import { renderUsage } from '@/preview/lines/renderUsage'
import { renderPromptCache } from '@/preview/lines/renderPromptCache'
import { renderMemory } from '@/preview/lines/renderMemory'
import { renderEnvironment } from '@/preview/lines/renderEnvironment'
import { renderTools, renderAgents, renderTodos } from '@/preview/lines/renderActivity'
import { renderSessionTime } from '@/preview/lines/renderSessionTime'

type Renderer = (cfg: HudConfig, ctx: MockContext) => RenderLine[]

const RENDERERS: Record<HudElement, Renderer> = {
  project: renderProject,
  addedDirs: () => [],   // handled inside renderProject
  context: renderContext,
  usage: renderUsage,
  promptCache: renderPromptCache,
  memory: renderMemory,
  environment: renderEnvironment,
  tools: renderTools,
  agents: renderAgents,
  todos: renderTodos,
  sessionTime: renderSessionTime,
}

function buildMergeLookup(groups: HudElement[][]): Map<HudElement, Set<HudElement>> {
  const lookup = new Map<HudElement, Set<HudElement>>()
  for (const group of groups) {
    const set = new Set(group)
    for (const el of group) {
      if (!lookup.has(el)) lookup.set(el, set)
    }
  }
  return lookup
}

const SEPARATOR: RenderSpan = { text: ' │ ', dim: true }

export function renderAll(cfg: HudConfig, ctx: MockContext): RenderLine[] {
  const order = cfg.elementOrder
  const mergeLookup = buildMergeLookup(cfg.display.mergeGroups)
  const seen = new Set<HudElement>()
  const out: RenderLine[] = []

  for (let i = 0; i < order.length; i++) {
    const el = order[i]
    if (seen.has(el)) continue

    const group = mergeLookup.get(el)
    if (group) {
      const sequence: HudElement[] = []
      for (let j = i; j < order.length; j++) {
        const next = order[j]
        if (!group.has(next) || seen.has(next)) break
        sequence.push(next)
      }
      const rendered = sequence
        .map(e => ({ el: e, lines: RENDERERS[e](cfg, ctx) }))
        .filter(r => r.lines.length > 0)
      sequence.forEach(e => seen.add(e))
      i += sequence.length - 1

      if (rendered.length > 1) {
        const combined: RenderLine = []
        rendered.forEach((r, idx) => {
          if (idx > 0) combined.push(SEPARATOR)
          combined.push(...r.lines[0])
          for (let k = 1; k < r.lines.length; k++) out.push(r.lines[k])
        })
        out.push(combined)
        continue
      }
      if (rendered.length === 1) {
        for (const line of rendered[0].lines) out.push(line)
      }
      continue
    }

    seen.add(el)
    const lines = RENDERERS[el](cfg, ctx)
    for (const line of lines) out.push(line)
  }

  return out
}
```

- [ ] **Step 4: Run tests, verify all pass**

```bash
pnpm test:run -- render-line
```

Expected: `4 passed`.

- [ ] **Step 5: Run the full test suite**

```bash
pnpm test:run
```

Expected: all tests across modules pass.

- [ ] **Step 6: Commit**

```bash
git add src/preview/render-line.ts tests/unit/preview/render-line.test.ts
git commit -m "feat(preview): render-line orchestrator + mergeGroups handling"
```

---

## Task 19: HudPreview.vue component

**Files:**
- Create: `src/preview/HudPreview.vue`
- Test: `tests/components/HudPreview.test.ts`

Vue component that takes a `HudConfig` prop, runs `renderAll`, and outputs styled spans.

- [ ] **Step 1: Write the failing test**

```typescript
// tests/components/HudPreview.test.ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import HudPreview from '@/preview/HudPreview.vue'
import { DEFAULT_CONFIG } from '@/lib/hud-schema'

describe('HudPreview', () => {
  it('renders project + context content with DEFAULT_CONFIG', () => {
    const w = mount(HudPreview, { props: { config: DEFAULT_CONFIG } })
    expect(w.text()).toContain('Opus 4.7')
    expect(w.text()).toContain('claude-uhd-cc')
    expect(w.text()).toContain('ctx')
  })

  it('renders nothing when elementOrder is empty', () => {
    const cfg = { ...DEFAULT_CONFIG, elementOrder: [] }
    const w = mount(HudPreview, { props: { config: cfg } })
    expect(w.find('.preview-line').exists()).toBe(false)
  })
})
```

Create `tests/components/` directory (vitest will pick it up via the `tests/**/*.test.ts` include).

- [ ] **Step 2: Run, verify it fails**

```bash
pnpm test:run -- HudPreview
```

Expected: FAIL (module not found).

- [ ] **Step 3: Create src/preview/HudPreview.vue**

```vue
<script setup lang="ts">
import { computed } from 'vue'
import type { HudConfig } from '@/lib/hud-schema'
import { MOCK_CONTEXT } from '@/lib/mock-context'
import { renderAll } from '@/preview/render-line'

const props = defineProps<{ config: HudConfig }>()

const lines = computed(() => renderAll(props.config, MOCK_CONTEXT))
</script>

<template>
  <div class="hud-preview">
    <div v-for="(line, i) in lines" :key="i" class="preview-line">
      <span
        v-for="(span, j) in line"
        :key="j"
        class="preview-span"
        :class="{ 'span-dim': span.dim, 'span-bold': span.bold }"
        :style="span.color ? { color: span.color } : undefined"
      >{{ span.text }}</span>
    </div>
  </div>
</template>

<style scoped>
.hud-preview {
  background: var(--bg-deep);
  border: 1px dashed var(--border-dash);
  border-radius: 2px;
  padding: var(--space-3) var(--space-4);
  font-family: var(--font-mono);
  font-size: 13px;
  line-height: 1.7;
  white-space: pre;
  overflow-x: auto;
}
.preview-line { white-space: pre; }
.preview-span { white-space: pre; }
.span-dim { color: var(--fg-dim); }
.span-bold { font-weight: 700; }
</style>
```

- [ ] **Step 4: Run tests, verify all pass**

```bash
pnpm test:run -- HudPreview
```

Expected: `2 passed`.

- [ ] **Step 5: Commit**

```bash
git add src/preview/HudPreview.vue tests/components/HudPreview.test.ts
git commit -m "feat(preview): HudPreview.vue — Vue component wrapping renderAll"
```

---

## Task 20: Wire HudPreview into App.vue

**Files:**
- Modify: `src/App.vue`

- [ ] **Step 1: Replace src/App.vue**

```vue
<script setup lang="ts">
import { ref } from 'vue'
import HudPreview from '@/preview/HudPreview.vue'
import { DEFAULT_CONFIG } from '@/lib/hud-schema'

const config = ref(DEFAULT_CONFIG)
</script>

<template>
  <div id="app-shell">
    <header class="topbar">
      <span class="logo">▆ claude-hud.cfg</span>
      <span class="topbar-spacer" />
      <span class="topbar-hint">v0.1 — preview only</span>
    </header>

    <section class="preview-stage">
      <div class="stage-label">PREVIEW (live)</div>
      <HudPreview :config="config" />
    </section>

    <main class="editor-stage">
      <p class="placeholder">Editor coming in Plan 02</p>
    </main>
  </div>
</template>

<style scoped>
.topbar-spacer { flex: 1; }
.topbar-hint { color: var(--fg-dim); font-size: 11px; }
.preview-stage {
  position: sticky;
  top: 0;
  background: var(--bg-base);
  padding: var(--space-3) var(--space-4) var(--space-4);
  border-bottom: 1px dashed var(--border-dash);
  z-index: 10;
}
.stage-label {
  color: var(--fg-dim);
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-bottom: var(--space-2);
}
.editor-stage {
  padding: var(--space-4);
}
</style>
```

- [ ] **Step 2: Launch dev server and verify visually**

```bash
pnpm dev
```

Expected: Page renders. Sticky preview at top shows:
- `[Opus 4.7] claude-uhd-cc`
- `ctx <bar> 58% (in 142,000/out 18,500) │ 5h <bar> 22% │ 7d <bar> 5% (reset in 144m / 64h)`

Stop with Ctrl+C.

- [ ] **Step 3: Run type-check**

```bash
pnpm type-check
```

Expected: no errors.

- [ ] **Step 4: Run the full test suite**

```bash
pnpm test:run
```

Expected: all suites pass.

- [ ] **Step 5: Commit**

```bash
git add src/App.vue
git commit -m "feat(app): wire HudPreview into App shell — sticky top preview"
```

---

## Final checks before declaring Plan 01 done

- [ ] **Step 1: Run type-check, lint, tests, build**

```bash
pnpm type-check && pnpm lint && pnpm test:run && pnpm build
```

Expected: all four succeed. `pnpm build` writes `dist/`.

- [ ] **Step 2: Visual sanity check vs upstream claude-hud**

If claude-hud is installed and you have a running Claude Code session, eyeball the real statusline. Our preview should match its structure (model badge, project path, ctx bar, 5h/7d bars). Minor whitespace differences are OK; layout/labels should match.

- [ ] **Step 3: Tag the milestone (optional)**

```bash
git tag v0.1-preview-only
```

---

## Self-review notes

- All 11 `HudElement` types covered: `project`, `addedDirs` (inside renderProject), `context`, `usage`, `promptCache`, `memory`, `environment`, `tools`, `agents`, `todos`, `sessionTime`.
- Test coverage spans every renderer + the orchestrator.
- No editing yet — that's Plan 02.
- Schema is hand-copied from upstream; drift detection (contract test) lands in Plan 04 alongside CI.

**End state of Plan 01:** Page loads, sticky preview shows the default `claude-hud` statusline rendered from `DEFAULT_CONFIG`. Editor area is empty. All tests pass, build succeeds.
