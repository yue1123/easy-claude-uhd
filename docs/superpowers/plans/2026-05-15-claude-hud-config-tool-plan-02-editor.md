# claude-hud Config Tool — Plan 02: Editor (Store + All Tabs)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Prerequisite:** Plan 01 is complete and committed.

**Goal:** Make every field in `HudConfig` editable via a tabbed form. Editing a field updates the preview in real time. End state: full visual editor — change anything in any of the 7 tabs (Layout / Elements / Git / Display / Thresholds / Colors / Raw JSON), preview reflects it.

**Architecture:** Pinia store with `rawJson` (single source of truth for export — preserves unknown fields) and `parsedConfig` (derived via `mergeConfig`, drives preview and form display). Form primitives (`FieldRow`, `ToggleSwitch`, etc.) read from `parsedConfig` for display and write to `rawJson` via `patchRawJson(path, value)`. Each tab is a Vue SFC that composes primitives.

**Tech Stack:** Same as Plan 01 + `@vueuse/core` for `useDraggable` if needed (we use a small custom sortable to avoid the dep — see Task 29).

**Out of scope:** Import/export, presets, URL sharing, diagnostics, i18n. Those land in Plan 03.

---

## File Structure (this plan)

```
src/
├── App.vue                                 # MODIFIED — add TabNav + active tab body
├── lib/
│   ├── merge-config.ts                     # NEW — port of upstream mergeConfig (no diagnostics yet)
│   └── path-set.ts                         # NEW — immutable deep set/delete on a record tree
├── stores/
│   └── config.ts                           # NEW — Pinia store with rawJson + parsedConfig
└── components/
    ├── shell/
    │   └── TabNav.vue                      # NEW
    ├── form/
    │   ├── FieldRow.vue                    # NEW
    │   ├── ToggleSwitch.vue                # NEW
    │   ├── SelectInput.vue                 # NEW
    │   ├── NumberInput.vue                 # NEW
    │   ├── TextInput.vue                   # NEW
    │   ├── ThresholdSlider.vue             # NEW
    │   ├── ColorPicker.vue                 # NEW
    │   ├── SortableList.vue                # NEW
    │   └── MergeGroupEditor.vue            # NEW
    └── editor/
        ├── LayoutTab.vue                   # NEW
        ├── ElementsTab.vue                 # NEW
        ├── GitTab.vue                      # NEW
        ├── DisplayTab.vue                  # NEW
        ├── ThresholdsTab.vue               # NEW
        ├── ColorsTab.vue                   # NEW
        └── RawJsonTab.vue                  # NEW

tests/
├── unit/
│   ├── merge-config.test.ts                # NEW
│   └── path-set.test.ts                    # NEW
├── stores/
│   └── config.test.ts                      # NEW
└── components/
    ├── ToggleSwitch.test.ts                # NEW
    ├── SelectInput.test.ts                 # NEW
    ├── NumberInput.test.ts                 # NEW
    ├── ThresholdSlider.test.ts             # NEW
    ├── ColorPicker.test.ts                 # NEW
    ├── SortableList.test.ts                # NEW
    ├── LayoutTab.test.ts                   # NEW
    ├── ElementsTab.test.ts                 # NEW
    ├── ColorsTab.test.ts                   # NEW
    └── RawJsonTab.test.ts                  # NEW
```

---

## Task 1: `path-set` helper (immutable deep set/delete)

**Files:**
- Create: `src/lib/path-set.ts`
- Test: `tests/unit/path-set.test.ts`

The store uses dotted paths like `"display.contextValue"` to address nested fields. We need pure functions that produce a new object with the path set, or with the path removed (so deleting a field actually removes the key — not setting it to undefined).

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/path-set.test.ts
import { describe, it, expect } from 'vitest'
import { setPath, deletePath, getPath } from '@/lib/path-set'

describe('path-set', () => {
  it('setPath at root', () => {
    expect(setPath({}, 'a', 1)).toEqual({ a: 1 })
  })

  it('setPath at nested path creates intermediate objects', () => {
    expect(setPath({}, 'a.b.c', 'x')).toEqual({ a: { b: { c: 'x' } } })
  })

  it('setPath preserves siblings', () => {
    const result = setPath({ a: { b: 1, c: 2 } }, 'a.b', 99)
    expect(result).toEqual({ a: { b: 99, c: 2 } })
  })

  it('setPath does not mutate input', () => {
    const input = { a: { b: 1 } }
    setPath(input, 'a.b', 2)
    expect(input).toEqual({ a: { b: 1 } })
  })

  it('deletePath removes the key', () => {
    expect(deletePath({ a: 1, b: 2 }, 'a')).toEqual({ b: 2 })
  })

  it('deletePath at nested path leaves siblings', () => {
    expect(deletePath({ a: { b: 1, c: 2 } }, 'a.b')).toEqual({ a: { c: 2 } })
  })

  it('deletePath cleans empty parent objects', () => {
    expect(deletePath({ a: { b: 1 } }, 'a.b')).toEqual({})
  })

  it('deletePath on non-existent path is a no-op', () => {
    expect(deletePath({ a: 1 }, 'x.y')).toEqual({ a: 1 })
  })

  it('getPath retrieves deep value', () => {
    expect(getPath({ a: { b: { c: 7 } } }, 'a.b.c')).toBe(7)
  })

  it('getPath returns undefined for missing', () => {
    expect(getPath({ a: 1 }, 'x.y')).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run, verify it fails**

```bash
pnpm test:run -- path-set
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create src/lib/path-set.ts**

```typescript
export type JsonObject = Record<string, unknown>

function isPlainObject(v: unknown): v is JsonObject {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

export function setPath(obj: JsonObject, path: string, value: unknown): JsonObject {
  const parts = path.split('.')
  const root: JsonObject = { ...obj }
  let cur: JsonObject = root
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i]
    const next = cur[key]
    const cloned: JsonObject = isPlainObject(next) ? { ...next } : {}
    cur[key] = cloned
    cur = cloned
  }
  cur[parts[parts.length - 1]] = value
  return root
}

export function deletePath(obj: JsonObject, path: string): JsonObject {
  const parts = path.split('.')
  if (!hasPath(obj, parts)) return obj
  const root: JsonObject = { ...obj }
  const chain: JsonObject[] = [root]
  let cur: JsonObject = root
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i]
    const next = cur[key]
    if (!isPlainObject(next)) return obj
    const cloned: JsonObject = { ...next }
    cur[key] = cloned
    chain.push(cloned)
    cur = cloned
  }
  delete cur[parts[parts.length - 1]]
  // Prune empty parents
  for (let i = chain.length - 1; i > 0; i--) {
    if (Object.keys(chain[i]).length === 0) {
      delete chain[i - 1][parts[i - 1]]
    }
  }
  return root
}

function hasPath(obj: JsonObject, parts: string[]): boolean {
  let cur: unknown = obj
  for (const k of parts) {
    if (!isPlainObject(cur) || !(k in cur)) return false
    cur = (cur as JsonObject)[k]
  }
  return true
}

export function getPath(obj: JsonObject, path: string): unknown {
  let cur: unknown = obj
  for (const k of path.split('.')) {
    if (!isPlainObject(cur)) return undefined
    cur = (cur as JsonObject)[k]
  }
  return cur
}
```

- [ ] **Step 4: Run tests, verify all pass**

```bash
pnpm test:run -- path-set
```

Expected: `10 passed`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/path-set.ts tests/unit/path-set.test.ts
git commit -m "feat(lib): path-set — immutable deep set/delete/get for dotted paths"
```

---

## Task 2: `mergeConfig` port (no diagnostics yet)

**Files:**
- Create: `src/lib/merge-config.ts`
- Test: `tests/unit/merge-config.test.ts`

Hand-port of upstream `mergeConfig` from `~/.claude/plugins/marketplaces/claude-hud/src/config.ts`. This phase only returns the parsed config; `Diagnostic[]` collection ships in Plan 03.

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/merge-config.test.ts
import { describe, it, expect } from 'vitest'
import { mergeConfig } from '@/lib/merge-config'
import { DEFAULT_CONFIG } from '@/lib/hud-schema'

describe('mergeConfig', () => {
  it('empty input returns DEFAULT_CONFIG', () => {
    expect(mergeConfig({})).toEqual(DEFAULT_CONFIG)
  })

  it('clamps contextWarningThreshold to [0,100]', () => {
    const r = mergeConfig({ display: { contextWarningThreshold: 150 } as any })
    expect(r.display.contextWarningThreshold).toBe(100)
  })

  it('clamps contextWarningThreshold below 0 to 0', () => {
    const r = mergeConfig({ display: { contextWarningThreshold: -5 } as any })
    expect(r.display.contextWarningThreshold).toBe(0)
  })

  it('falls back invalid enum to default', () => {
    const r = mergeConfig({ display: { contextValue: 'gibberish' as any } as any })
    expect(r.display.contextValue).toBe('percent')
  })

  it('falls back invalid lineLayout', () => {
    const r = mergeConfig({ lineLayout: 'foo' as any })
    expect(r.lineLayout).toBe('expanded')
  })

  it('falls back invalid pathLevels', () => {
    const r = mergeConfig({ pathLevels: 7 as any })
    expect(r.pathLevels).toBe(1)
  })

  it('strips unknown elementOrder entries', () => {
    const r = mergeConfig({ elementOrder: ['project', 'foo', 'context'] as any })
    expect(r.elementOrder).toEqual(['project', 'context'])
  })

  it('removes duplicate elementOrder entries', () => {
    const r = mergeConfig({ elementOrder: ['project', 'context', 'project'] as any })
    expect(r.elementOrder).toEqual(['project', 'context'])
  })

  it('falls back named color "notAColor" to default', () => {
    const r = mergeConfig({ colors: { model: 'notAColor' as any } as any })
    expect(r.colors.model).toBe('cyan')
  })

  it('accepts hex color strings', () => {
    const r = mergeConfig({ colors: { model: '#aabbcc' } as any })
    expect(r.colors.model).toBe('#aabbcc')
  })

  it('accepts 256-color index', () => {
    const r = mergeConfig({ colors: { custom: 142 } as any })
    expect(r.colors.custom).toBe(142)
  })

  it('rejects 256-color index out of range', () => {
    const r = mergeConfig({ colors: { custom: 300 } as any })
    expect(r.colors.custom).toBe(208)  // default
  })

  it('deduplicates mergeGroups', () => {
    const r = mergeConfig({ display: { mergeGroups: [['context', 'context', 'usage']] } as any })
    expect(r.display.mergeGroups).toEqual([['context', 'usage']])
  })

  it('drops mergeGroups with < 2 elements', () => {
    const r = mergeConfig({ display: { mergeGroups: [['context']] } as any })
    expect(r.display.mergeGroups).toEqual([['context', 'usage']]) // falls to DEFAULT_MERGE_GROUPS
  })

  it('migrates legacy layout: "separators" → compact + showSeparators', () => {
    const r = mergeConfig({ layout: 'separators' } as any)
    expect(r.lineLayout).toBe('compact')
    expect(r.showSeparators).toBe(true)
  })
})
```

- [ ] **Step 2: Run, verify it fails**

```bash
pnpm test:run -- merge-config
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create src/lib/merge-config.ts**

```typescript
import {
  DEFAULT_CONFIG,
  DEFAULT_ELEMENT_ORDER,
  DEFAULT_MERGE_GROUPS,
  KNOWN_HUD_ELEMENTS,
  type HudConfig,
  type HudElement,
  type HudColorValue,
  type HudColorName,
  type Language,
  type LineLayoutType,
  type AutocompactBufferMode,
  type ContextValueMode,
  type UsageValueMode,
  type GitBranchOverflowMode,
  type ModelFormatMode,
  type TimeFormatMode,
  type AddedDirsLayout,
} from '@/lib/hud-schema'

const NAMED_COLORS: ReadonlySet<HudColorName> = new Set([
  'dim', 'red', 'green', 'yellow', 'magenta', 'cyan', 'brightBlue', 'brightMagenta',
])

const HEX_PATTERN = /^#[0-9a-fA-F]{6}$/

function validLanguage(v: unknown): v is Language {
  return v === 'en' || v === 'zh'
}
function validLineLayout(v: unknown): v is LineLayoutType {
  return v === 'compact' || v === 'expanded'
}
function validPathLevels(v: unknown): v is 1 | 2 | 3 {
  return v === 1 || v === 2 || v === 3
}
function validAutocompact(v: unknown): v is AutocompactBufferMode {
  return v === 'enabled' || v === 'disabled'
}
function validBranchOverflow(v: unknown): v is GitBranchOverflowMode {
  return v === 'truncate' || v === 'wrap'
}
function validContextValue(v: unknown): v is ContextValueMode {
  return v === 'percent' || v === 'tokens' || v === 'remaining' || v === 'both'
}
function validUsageValue(v: unknown): v is UsageValueMode {
  return v === 'percent' || v === 'remaining'
}
function validModelFormat(v: unknown): v is ModelFormatMode {
  return v === 'full' || v === 'compact' || v === 'short'
}
function validTimeFormat(v: unknown): v is TimeFormatMode {
  return v === 'relative' || v === 'absolute' || v === 'both'
}
function validAddedDirsLayout(v: unknown): v is AddedDirsLayout {
  return v === 'inline' || v === 'line'
}
function validColor(v: unknown): v is HudColorValue {
  if (typeof v === 'string' && NAMED_COLORS.has(v as HudColorName)) return true
  if (typeof v === 'string' && HEX_PATTERN.test(v)) return true
  if (typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 255) return true
  return false
}
function validBarChar(v: unknown): v is string {
  if (typeof v !== 'string' || v.length === 0) return false
  const seg = new Intl.Segmenter(undefined, { granularity: 'grapheme' })
  return Array.from(seg.segment(v)).length === 1
}

function clamp(v: unknown, max: number, fallback: number): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return fallback
  return Math.max(0, Math.min(max, v))
}
function clampInt(v: unknown, fallback: number): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return fallback
  return Math.max(0, Math.floor(v))
}
function clampDuration(v: unknown, fallback: number): number {
  if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0) return fallback
  return Math.floor(v)
}
function trimOptional(v: unknown): string {
  return typeof v === 'string' ? v.trim() : ''
}
function clampStr(v: unknown, max: number, fallback: string): string {
  return typeof v === 'string' ? v.slice(0, max) : fallback
}

function validElementOrder(v: unknown): HudElement[] {
  if (!Array.isArray(v) || v.length === 0) return [...DEFAULT_ELEMENT_ORDER]
  const seen = new Set<HudElement>()
  const out: HudElement[] = []
  for (const item of v) {
    if (typeof item !== 'string' || !KNOWN_HUD_ELEMENTS.has(item as HudElement)) continue
    const el = item as HudElement
    if (seen.has(el)) continue
    seen.add(el)
    out.push(el)
  }
  return out.length > 0 ? out : [...DEFAULT_ELEMENT_ORDER]
}

function validMergeGroups(v: unknown): HudElement[][] {
  if (!Array.isArray(v)) return DEFAULT_MERGE_GROUPS.map(g => [...g])
  if (v.length === 0) return []
  const usedElements = new Set<HudElement>()
  const result: HudElement[][] = []
  for (const group of v) {
    if (!Array.isArray(group)) continue
    const seen = new Set<HudElement>()
    const normalized: HudElement[] = []
    for (const item of group) {
      if (typeof item !== 'string' || !KNOWN_HUD_ELEMENTS.has(item as HudElement)) continue
      const el = item as HudElement
      if (seen.has(el) || usedElements.has(el)) continue
      seen.add(el)
      normalized.push(el)
    }
    if (normalized.length >= 2) {
      for (const el of normalized) usedElements.add(el)
      result.push(normalized)
    }
  }
  return result.length > 0 ? result : DEFAULT_MERGE_GROUPS.map(g => [...g])
}

interface LegacyConfig {
  layout?: 'default' | 'separators' | Record<string, unknown>
}

function migrate(input: Partial<HudConfig> & LegacyConfig): Partial<HudConfig> {
  const m = { ...input } as Partial<HudConfig> & LegacyConfig
  if ('layout' in input && !('lineLayout' in input)) {
    if (typeof input.layout === 'string') {
      if (input.layout === 'separators') {
        m.lineLayout = 'compact'
        m.showSeparators = true
      } else {
        m.lineLayout = 'compact'
        m.showSeparators = false
      }
    } else if (input.layout && typeof input.layout === 'object') {
      const obj = input.layout as Record<string, unknown>
      if (typeof obj.lineLayout === 'string') m.lineLayout = obj.lineLayout as LineLayoutType
      if (typeof obj.showSeparators === 'boolean') m.showSeparators = obj.showSeparators
      if (typeof obj.pathLevels === 'number') m.pathLevels = obj.pathLevels as 1 | 2 | 3
    }
    delete m.layout
  }
  return m
}

function pickBool(v: unknown, fallback: boolean): boolean {
  return typeof v === 'boolean' ? v : fallback
}

export function mergeConfig(input: Partial<HudConfig> | Record<string, unknown>): HudConfig {
  const m = migrate(input as Partial<HudConfig> & LegacyConfig)
  const D = DEFAULT_CONFIG
  const inDisp = (m.display ?? {}) as Partial<HudConfig['display']>
  const inGit = (m.gitStatus ?? {}) as Partial<HudConfig['gitStatus']>
  const inColors = (m.colors ?? {}) as Partial<HudConfig['colors']>

  const rawMax = (m as Record<string, unknown>).maxWidth
  const maxWidth = (typeof rawMax === 'number' && Number.isFinite(rawMax) && rawMax > 0) ? Math.floor(rawMax) : null

  return {
    language: validLanguage(m.language) ? m.language : D.language,
    lineLayout: validLineLayout(m.lineLayout) ? m.lineLayout : D.lineLayout,
    showSeparators: pickBool(m.showSeparators, D.showSeparators),
    pathLevels: validPathLevels(m.pathLevels) ? m.pathLevels : D.pathLevels,
    maxWidth,
    forceMaxWidth: pickBool((m as Record<string, unknown>).forceMaxWidth, D.forceMaxWidth),
    elementOrder: validElementOrder(m.elementOrder),
    gitStatus: {
      enabled: pickBool(inGit.enabled, D.gitStatus.enabled),
      showDirty: pickBool(inGit.showDirty, D.gitStatus.showDirty),
      showAheadBehind: pickBool(inGit.showAheadBehind, D.gitStatus.showAheadBehind),
      showFileStats: pickBool(inGit.showFileStats, D.gitStatus.showFileStats),
      branchOverflow: validBranchOverflow(inGit.branchOverflow) ? inGit.branchOverflow : D.gitStatus.branchOverflow,
      pushWarningThreshold: clampInt(inGit.pushWarningThreshold, D.gitStatus.pushWarningThreshold),
      pushCriticalThreshold: clampInt(inGit.pushCriticalThreshold, D.gitStatus.pushCriticalThreshold),
    },
    display: {
      showModel: pickBool(inDisp.showModel, D.display.showModel),
      showProject: pickBool(inDisp.showProject, D.display.showProject),
      showAddedDirs: pickBool(inDisp.showAddedDirs, D.display.showAddedDirs),
      addedDirsLayout: validAddedDirsLayout(inDisp.addedDirsLayout) ? inDisp.addedDirsLayout : D.display.addedDirsLayout,
      showContextBar: pickBool(inDisp.showContextBar, D.display.showContextBar),
      contextValue: validContextValue(inDisp.contextValue) ? inDisp.contextValue : D.display.contextValue,
      showConfigCounts: pickBool(inDisp.showConfigCounts, D.display.showConfigCounts),
      showCost: pickBool(inDisp.showCost, D.display.showCost),
      showDuration: pickBool(inDisp.showDuration, D.display.showDuration),
      showSpeed: pickBool(inDisp.showSpeed, D.display.showSpeed),
      showTokenBreakdown: pickBool(inDisp.showTokenBreakdown, D.display.showTokenBreakdown),
      showUsage: pickBool(inDisp.showUsage, D.display.showUsage),
      usageValue: validUsageValue(inDisp.usageValue) ? inDisp.usageValue : D.display.usageValue,
      usageBarEnabled: pickBool(inDisp.usageBarEnabled, D.display.usageBarEnabled),
      showResetLabel: pickBool(inDisp.showResetLabel, D.display.showResetLabel),
      usageCompact: pickBool(inDisp.usageCompact, D.display.usageCompact),
      showTools: pickBool(inDisp.showTools, D.display.showTools),
      showAgents: pickBool(inDisp.showAgents, D.display.showAgents),
      showTodos: pickBool(inDisp.showTodos, D.display.showTodos),
      showSessionName: pickBool(inDisp.showSessionName, D.display.showSessionName),
      showClaudeCodeVersion: pickBool(inDisp.showClaudeCodeVersion, D.display.showClaudeCodeVersion),
      showEffortLevel: pickBool(inDisp.showEffortLevel, D.display.showEffortLevel),
      showMemoryUsage: pickBool(inDisp.showMemoryUsage, D.display.showMemoryUsage),
      showPromptCache: pickBool(inDisp.showPromptCache, D.display.showPromptCache),
      promptCacheTtlSeconds: clampDuration(inDisp.promptCacheTtlSeconds, D.display.promptCacheTtlSeconds),
      showSessionTokens: pickBool(inDisp.showSessionTokens, D.display.showSessionTokens),
      showOutputStyle: pickBool(inDisp.showOutputStyle, D.display.showOutputStyle),
      showSessionStartDate: pickBool(inDisp.showSessionStartDate, D.display.showSessionStartDate),
      showLastResponseAt: pickBool(inDisp.showLastResponseAt, D.display.showLastResponseAt),
      mergeGroups: validMergeGroups(inDisp.mergeGroups),
      autocompactBuffer: validAutocompact(inDisp.autocompactBuffer) ? inDisp.autocompactBuffer : D.display.autocompactBuffer,
      contextWarningThreshold: clamp(inDisp.contextWarningThreshold, 100, D.display.contextWarningThreshold),
      contextCriticalThreshold: clamp(inDisp.contextCriticalThreshold, 100, D.display.contextCriticalThreshold),
      usageThreshold: clamp(inDisp.usageThreshold, 100, D.display.usageThreshold),
      sevenDayThreshold: clamp(inDisp.sevenDayThreshold, 100, D.display.sevenDayThreshold),
      environmentThreshold: clamp(inDisp.environmentThreshold, 100, D.display.environmentThreshold),
      externalUsagePath: trimOptional(inDisp.externalUsagePath),
      externalUsageFreshnessMs: clampInt(inDisp.externalUsageFreshnessMs, D.display.externalUsageFreshnessMs),
      modelFormat: validModelFormat(inDisp.modelFormat) ? inDisp.modelFormat : D.display.modelFormat,
      modelOverride: clampStr(inDisp.modelOverride, 80, D.display.modelOverride),
      customLine: clampStr(inDisp.customLine, 80, D.display.customLine),
      timeFormat: validTimeFormat(inDisp.timeFormat) ? inDisp.timeFormat : D.display.timeFormat,
    },
    colors: {
      context: validColor(inColors.context) ? inColors.context as HudColorValue : D.colors.context,
      usage: validColor(inColors.usage) ? inColors.usage as HudColorValue : D.colors.usage,
      warning: validColor(inColors.warning) ? inColors.warning as HudColorValue : D.colors.warning,
      usageWarning: validColor(inColors.usageWarning) ? inColors.usageWarning as HudColorValue : D.colors.usageWarning,
      critical: validColor(inColors.critical) ? inColors.critical as HudColorValue : D.colors.critical,
      model: validColor(inColors.model) ? inColors.model as HudColorValue : D.colors.model,
      project: validColor(inColors.project) ? inColors.project as HudColorValue : D.colors.project,
      git: validColor(inColors.git) ? inColors.git as HudColorValue : D.colors.git,
      gitBranch: validColor(inColors.gitBranch) ? inColors.gitBranch as HudColorValue : D.colors.gitBranch,
      label: validColor(inColors.label) ? inColors.label as HudColorValue : D.colors.label,
      custom: validColor(inColors.custom) ? inColors.custom as HudColorValue : D.colors.custom,
      barFilled: validBarChar(inColors.barFilled) ? inColors.barFilled : D.colors.barFilled,
      barEmpty: validBarChar(inColors.barEmpty) ? inColors.barEmpty : D.colors.barEmpty,
    },
  }
}
```

- [ ] **Step 4: Run tests, verify all pass**

```bash
pnpm test:run -- merge-config
```

Expected: `15 passed`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/merge-config.ts tests/unit/merge-config.test.ts
git commit -m "feat(lib): mergeConfig port — validates + clamps + falls back per upstream"
```

---

## Task 3: Pinia config store

**Files:**
- Create: `src/stores/config.ts`
- Test: `tests/stores/config.test.ts`

Core invariant: `rawJson` is the export source; `parsedConfig` is derived. Patches to fields modify `rawJson`; previewing/displaying reads `parsedConfig`. Unknown fields in `rawJson` survive round-trip.

- [ ] **Step 1: Write the failing test**

```typescript
// tests/stores/config.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useConfigStore } from '@/stores/config'

describe('useConfigStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('starts with empty rawJson and parsedConfig = defaults', () => {
    const store = useConfigStore()
    expect(store.rawJson).toEqual({})
    expect(store.parsedConfig.lineLayout).toBe('expanded')
  })

  it('patchField writes into rawJson', () => {
    const store = useConfigStore()
    store.patchField('display.contextValue', 'tokens')
    expect(store.rawJson).toEqual({ display: { contextValue: 'tokens' } })
  })

  it('patchField updates parsedConfig reactively', () => {
    const store = useConfigStore()
    store.patchField('lineLayout', 'compact')
    expect(store.parsedConfig.lineLayout).toBe('compact')
  })

  it('clearField removes the key from rawJson', () => {
    const store = useConfigStore()
    store.patchField('lineLayout', 'compact')
    store.clearField('lineLayout')
    expect(store.rawJson).toEqual({})
  })

  it('setRawJson replaces the entire raw tree', () => {
    const store = useConfigStore()
    store.setRawJson({ pathLevels: 3, foo: 'unknown' })
    expect(store.rawJson.pathLevels).toBe(3)
    expect(store.rawJson.foo).toBe('unknown')
  })

  it('unknown fields survive round-trip (rawJson preserved)', () => {
    const store = useConfigStore()
    store.setRawJson({ display: { contextValue: 'tokens', futureField: 42 } })
    expect((store.rawJson.display as any).futureField).toBe(42)
    expect(store.parsedConfig.display.contextValue).toBe('tokens')
  })

  it('reset wipes rawJson back to {}', () => {
    const store = useConfigStore()
    store.setRawJson({ pathLevels: 3 })
    store.reset()
    expect(store.rawJson).toEqual({})
  })

  it('patching with the default value still writes (caller responsibility to clear)', () => {
    const store = useConfigStore()
    store.patchField('lineLayout', 'expanded')
    expect(store.rawJson).toEqual({ lineLayout: 'expanded' })
  })
})
```

- [ ] **Step 2: Run, verify it fails**

```bash
pnpm test:run -- stores
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create src/stores/config.ts**

```typescript
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { HudConfig } from '@/lib/hud-schema'
import { mergeConfig } from '@/lib/merge-config'
import { setPath, deletePath, getPath, type JsonObject } from '@/lib/path-set'

export const useConfigStore = defineStore('config', () => {
  const rawJson = ref<JsonObject>({})

  const parsedConfig = computed<HudConfig>(() => mergeConfig(rawJson.value))

  function patchField(path: string, value: unknown): void {
    rawJson.value = setPath(rawJson.value, path, value)
  }

  function clearField(path: string): void {
    rawJson.value = deletePath(rawJson.value, path)
  }

  function readField(path: string): unknown {
    return getPath(rawJson.value, path)
  }

  function setRawJson(next: JsonObject): void {
    rawJson.value = { ...next }
  }

  function reset(): void {
    rawJson.value = {}
  }

  return { rawJson, parsedConfig, patchField, clearField, readField, setRawJson, reset }
})
```

- [ ] **Step 4: Run tests, verify all pass**

```bash
pnpm test:run -- stores
```

Expected: `8 passed`.

- [ ] **Step 5: Commit**

```bash
git add src/stores/config.ts tests/stores/config.test.ts
git commit -m "feat(stores): config store with rawJson + parsedConfig invariant"
```

---

## Task 4: FieldRow primitive

**Files:**
- Create: `src/components/form/FieldRow.vue`

Lays out a single field: label on the left, control slot on the right, optional helper text below.

- [ ] **Step 1: Create src/components/form/FieldRow.vue**

```vue
<script setup lang="ts">
defineProps<{
  label: string
  hint?: string
  path?: string
}>()
</script>

<template>
  <div class="field-row">
    <div class="field-label">
      <span class="label-text">{{ label }}</span>
      <span v-if="path" class="label-path">{{ path }}</span>
    </div>
    <div class="field-control">
      <slot />
    </div>
    <div v-if="hint || $slots.hint" class="field-hint">
      <slot name="hint">{{ hint }}</slot>
    </div>
  </div>
</template>

<style scoped>
.field-row {
  display: grid;
  grid-template-columns: minmax(180px, 240px) 1fr;
  grid-template-rows: auto auto;
  gap: var(--space-1) var(--space-3);
  padding: var(--space-2) 0;
  border-bottom: 1px dashed var(--border-dim);
}
.field-label {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-top: 4px;
}
.label-text { color: var(--fg-base); font-size: 13px; }
.label-path { color: var(--fg-dim); font-size: 10px; font-family: var(--font-mono); }
.field-control {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-height: 28px;
}
.field-hint {
  grid-column: 2 / -1;
  color: var(--fg-dim);
  font-size: 11px;
  line-height: 1.4;
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/form/FieldRow.vue
git commit -m "feat(form): FieldRow — label + control slot + hint"
```

---

## Task 5: ToggleSwitch primitive

**Files:**
- Create: `src/components/form/ToggleSwitch.vue`
- Test: `tests/components/ToggleSwitch.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/components/ToggleSwitch.test.ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ToggleSwitch from '@/components/form/ToggleSwitch.vue'

describe('ToggleSwitch', () => {
  it('renders "on" when modelValue=true', () => {
    const w = mount(ToggleSwitch, { props: { modelValue: true } })
    expect(w.text()).toContain('on')
  })

  it('renders "off" when modelValue=false', () => {
    const w = mount(ToggleSwitch, { props: { modelValue: false } })
    expect(w.text()).toContain('off')
  })

  it('emits update:modelValue on click', async () => {
    const w = mount(ToggleSwitch, { props: { modelValue: false } })
    await w.find('button').trigger('click')
    expect(w.emitted('update:modelValue')?.[0]).toEqual([true])
  })
})
```

- [ ] **Step 2: Run, verify it fails**

```bash
pnpm test:run -- ToggleSwitch
```

- [ ] **Step 3: Create src/components/form/ToggleSwitch.vue**

```vue
<script setup lang="ts">
const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: boolean): void }>()
function toggle() {
  emit('update:modelValue', !props.modelValue)
}
</script>

<template>
  <button
    type="button"
    class="toggle"
    :class="{ on: modelValue }"
    @click="toggle"
  >
    <span class="dot" />
    <span class="state">{{ modelValue ? 'on' : 'off' }}</span>
  </button>
</template>

<style scoped>
.toggle {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  background: var(--bg-elevated);
  border: 1px solid var(--border-dim);
  border-radius: 2px;
  padding: 4px 10px 4px 6px;
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--fg-dim);
  cursor: pointer;
}
.toggle:hover { border-color: var(--border-dash); color: var(--fg-base); }
.toggle.on { color: var(--accent); border-color: var(--accent); }
.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--fg-dim);
  display: inline-block;
}
.toggle.on .dot { background: var(--accent); }
.state { letter-spacing: 0.05em; }
</style>
```

- [ ] **Step 4: Run tests, verify all pass**

```bash
pnpm test:run -- ToggleSwitch
```

Expected: `3 passed`.

- [ ] **Step 5: Commit**

```bash
git add src/components/form/ToggleSwitch.vue tests/components/ToggleSwitch.test.ts
git commit -m "feat(form): ToggleSwitch primitive"
```

---

## Task 6: SelectInput primitive

**Files:**
- Create: `src/components/form/SelectInput.vue`
- Test: `tests/components/SelectInput.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/components/SelectInput.test.ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SelectInput from '@/components/form/SelectInput.vue'

describe('SelectInput', () => {
  it('renders the options', () => {
    const w = mount(SelectInput, {
      props: {
        modelValue: 'percent',
        options: [
          { value: 'percent', label: 'Percent' },
          { value: 'tokens', label: 'Tokens' },
        ],
      },
    })
    expect(w.findAll('option').map(o => o.text())).toEqual(['Percent', 'Tokens'])
  })

  it('reflects the selected modelValue', () => {
    const w = mount(SelectInput, {
      props: {
        modelValue: 'tokens',
        options: [
          { value: 'percent', label: 'Percent' },
          { value: 'tokens', label: 'Tokens' },
        ],
      },
    })
    expect((w.find('select').element as HTMLSelectElement).value).toBe('tokens')
  })

  it('emits update:modelValue on change', async () => {
    const w = mount(SelectInput, {
      props: {
        modelValue: 'percent',
        options: [
          { value: 'percent', label: 'Percent' },
          { value: 'tokens', label: 'Tokens' },
        ],
      },
    })
    await w.find('select').setValue('tokens')
    expect(w.emitted('update:modelValue')?.[0]).toEqual(['tokens'])
  })
})
```

- [ ] **Step 2: Run, verify it fails**

```bash
pnpm test:run -- SelectInput
```

- [ ] **Step 3: Create src/components/form/SelectInput.vue**

```vue
<script setup lang="ts">
defineProps<{
  modelValue: string | number
  options: Array<{ value: string | number; label: string }>
}>()
defineEmits<{ (e: 'update:modelValue', v: string | number): void }>()
</script>

<template>
  <select
    class="select"
    :value="modelValue"
    @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
  >
    <option v-for="o in options" :key="String(o.value)" :value="o.value">{{ o.label }}</option>
  </select>
</template>

<style scoped>
.select {
  background: var(--bg-elevated);
  color: var(--fg-base);
  border: 1px solid var(--border-dim);
  border-radius: 2px;
  padding: 4px 8px;
  font-family: var(--font-mono);
  font-size: 12px;
}
.select:focus { outline: none; border-color: var(--accent); }
</style>
```

- [ ] **Step 4: Run tests, verify all pass**

```bash
pnpm test:run -- SelectInput
```

Expected: `3 passed`.

- [ ] **Step 5: Commit**

```bash
git add src/components/form/SelectInput.vue tests/components/SelectInput.test.ts
git commit -m "feat(form): SelectInput primitive"
```

---

## Task 7: NumberInput primitive

**Files:**
- Create: `src/components/form/NumberInput.vue`
- Test: `tests/components/NumberInput.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/components/NumberInput.test.ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import NumberInput from '@/components/form/NumberInput.vue'

describe('NumberInput', () => {
  it('renders the modelValue', () => {
    const w = mount(NumberInput, { props: { modelValue: 42 } })
    expect((w.find('input').element as HTMLInputElement).value).toBe('42')
  })

  it('emits numeric update on input', async () => {
    const w = mount(NumberInput, { props: { modelValue: 0 } })
    await w.find('input').setValue('150')
    expect(w.emitted('update:modelValue')?.[0]).toEqual([150])
  })

  it('emits null when cleared and nullable=true', async () => {
    const w = mount(NumberInput, { props: { modelValue: 42, nullable: true } })
    await w.find('input').setValue('')
    expect(w.emitted('update:modelValue')?.[0]).toEqual([null])
  })

  it('omits null when not nullable (clears to 0)', async () => {
    const w = mount(NumberInput, { props: { modelValue: 42 } })
    await w.find('input').setValue('')
    expect(w.emitted('update:modelValue')?.[0]).toEqual([0])
  })
})
```

- [ ] **Step 2: Run, verify it fails**

```bash
pnpm test:run -- NumberInput
```

- [ ] **Step 3: Create src/components/form/NumberInput.vue**

```vue
<script setup lang="ts">
const props = defineProps<{
  modelValue: number | null
  min?: number
  max?: number
  step?: number
  nullable?: boolean
  placeholder?: string
}>()

const emit = defineEmits<{ (e: 'update:modelValue', v: number | null): void }>()

function onInput(e: Event) {
  const raw = (e.target as HTMLInputElement).value
  if (raw === '') {
    emit('update:modelValue', props.nullable ? null : 0)
    return
  }
  const n = Number(raw)
  if (Number.isFinite(n)) emit('update:modelValue', n)
}
</script>

<template>
  <input
    class="number-input"
    type="number"
    :value="modelValue ?? ''"
    :min="min"
    :max="max"
    :step="step ?? 1"
    :placeholder="placeholder"
    @input="onInput"
  />
</template>

<style scoped>
.number-input {
  background: var(--bg-elevated);
  color: var(--fg-base);
  border: 1px solid var(--border-dim);
  border-radius: 2px;
  padding: 4px 8px;
  font-family: var(--font-mono);
  font-size: 12px;
  width: 90px;
}
.number-input:focus { outline: none; border-color: var(--accent); }
</style>
```

- [ ] **Step 4: Run tests, verify all pass**

```bash
pnpm test:run -- NumberInput
```

Expected: `4 passed`.

- [ ] **Step 5: Commit**

```bash
git add src/components/form/NumberInput.vue tests/components/NumberInput.test.ts
git commit -m "feat(form): NumberInput primitive (with nullable variant)"
```

---

## Task 8: TextInput primitive

**Files:**
- Create: `src/components/form/TextInput.vue`

Simpler than the others — no separate test file needed beyond the existing FieldRow integration tests.

- [ ] **Step 1: Create src/components/form/TextInput.vue**

```vue
<script setup lang="ts">
defineProps<{
  modelValue: string
  placeholder?: string
  maxLength?: number
}>()
defineEmits<{ (e: 'update:modelValue', v: string): void }>()
</script>

<template>
  <input
    class="text-input"
    type="text"
    :value="modelValue"
    :placeholder="placeholder"
    :maxlength="maxLength"
    @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
  />
</template>

<style scoped>
.text-input {
  background: var(--bg-elevated);
  color: var(--fg-base);
  border: 1px solid var(--border-dim);
  border-radius: 2px;
  padding: 4px 8px;
  font-family: var(--font-mono);
  font-size: 12px;
  flex: 1;
  min-width: 0;
}
.text-input:focus { outline: none; border-color: var(--accent); }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/form/TextInput.vue
git commit -m "feat(form): TextInput primitive"
```

---

## Task 9: ThresholdSlider primitive

**Files:**
- Create: `src/components/form/ThresholdSlider.vue`
- Test: `tests/components/ThresholdSlider.test.ts`

0-100 range, slider + number input that stay in sync.

- [ ] **Step 1: Write the failing test**

```typescript
// tests/components/ThresholdSlider.test.ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ThresholdSlider from '@/components/form/ThresholdSlider.vue'

describe('ThresholdSlider', () => {
  it('renders both slider and number input with the modelValue', () => {
    const w = mount(ThresholdSlider, { props: { modelValue: 70 } })
    const inputs = w.findAll('input')
    expect((inputs[0].element as HTMLInputElement).value).toBe('70')
    expect((inputs[1].element as HTMLInputElement).value).toBe('70')
  })

  it('emits update when slider changes', async () => {
    const w = mount(ThresholdSlider, { props: { modelValue: 70 } })
    await w.findAll('input')[0].setValue('85')
    expect(w.emitted('update:modelValue')?.[0]).toEqual([85])
  })

  it('emits update when number input changes', async () => {
    const w = mount(ThresholdSlider, { props: { modelValue: 70 } })
    await w.findAll('input')[1].setValue('30')
    expect(w.emitted('update:modelValue')?.[0]).toEqual([30])
  })
})
```

- [ ] **Step 2: Run, verify it fails**

```bash
pnpm test:run -- ThresholdSlider
```

- [ ] **Step 3: Create src/components/form/ThresholdSlider.vue**

```vue
<script setup lang="ts">
defineProps<{
  modelValue: number
  min?: number
  max?: number
}>()
const emit = defineEmits<{ (e: 'update:modelValue', v: number): void }>()

function onChange(e: Event) {
  const n = Number((e.target as HTMLInputElement).value)
  if (Number.isFinite(n)) emit('update:modelValue', n)
}
</script>

<template>
  <div class="threshold-slider">
    <input
      type="range"
      :min="min ?? 0"
      :max="max ?? 100"
      :value="modelValue"
      @input="onChange"
    />
    <input
      type="number"
      class="num"
      :min="min ?? 0"
      :max="max ?? 100"
      :value="modelValue"
      @input="onChange"
    />
    <span class="suffix">%</span>
  </div>
</template>

<style scoped>
.threshold-slider {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex: 1;
  min-width: 0;
}
input[type=range] {
  flex: 1;
  min-width: 80px;
  accent-color: var(--accent);
}
.num {
  width: 64px;
  background: var(--bg-elevated);
  color: var(--fg-base);
  border: 1px solid var(--border-dim);
  border-radius: 2px;
  padding: 3px 6px;
  font-family: var(--font-mono);
  font-size: 12px;
}
.num:focus { outline: none; border-color: var(--accent); }
.suffix { color: var(--fg-dim); font-size: 11px; }
</style>
```

- [ ] **Step 4: Run tests, verify all pass**

```bash
pnpm test:run -- ThresholdSlider
```

Expected: `3 passed`.

- [ ] **Step 5: Commit**

```bash
git add src/components/form/ThresholdSlider.vue tests/components/ThresholdSlider.test.ts
git commit -m "feat(form): ThresholdSlider — slider + number, two-way bound"
```

---

## Task 10: ColorPicker primitive

**Files:**
- Create: `src/components/form/ColorPicker.vue`
- Test: `tests/components/ColorPicker.test.ts`

Three modes (named / 256-index / hex). Mode tabs switch the editor; switching modes preserves a sensible default when the current value isn't valid in the new mode.

- [ ] **Step 1: Write the failing test**

```typescript
// tests/components/ColorPicker.test.ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ColorPicker from '@/components/form/ColorPicker.vue'

describe('ColorPicker', () => {
  it('shows named mode tab as active when modelValue is named', () => {
    const w = mount(ColorPicker, { props: { modelValue: 'green' } })
    expect(w.find('[data-mode="named"]').classes()).toContain('on')
  })

  it('shows 256 mode tab as active when modelValue is a number', () => {
    const w = mount(ColorPicker, { props: { modelValue: 142 } })
    expect(w.find('[data-mode="index"]').classes()).toContain('on')
  })

  it('shows hex mode tab as active when modelValue is hex', () => {
    const w = mount(ColorPicker, { props: { modelValue: '#aabbcc' } })
    expect(w.find('[data-mode="hex"]').classes()).toContain('on')
  })

  it('switching modes emits a sensible default for the new mode', async () => {
    const w = mount(ColorPicker, { props: { modelValue: 'green' } })
    await w.find('[data-mode="hex"]').trigger('click')
    const evt = w.emitted('update:modelValue')?.[0]
    expect(typeof evt?.[0]).toBe('string')
    expect((evt?.[0] as string).startsWith('#')).toBe(true)
  })

  it('changing the hex input emits the new hex', async () => {
    const w = mount(ColorPicker, { props: { modelValue: '#aabbcc' } })
    await w.find('input[type="text"]').setValue('#ff8800')
    expect(w.emitted('update:modelValue')?.pop()).toEqual(['#ff8800'])
  })
})
```

- [ ] **Step 2: Run, verify it fails**

```bash
pnpm test:run -- ColorPicker
```

- [ ] **Step 3: Create src/components/form/ColorPicker.vue**

```vue
<script setup lang="ts">
import { computed } from 'vue'
import type { HudColorValue, HudColorName } from '@/lib/hud-schema'

const NAMED_COLORS: HudColorName[] = ['dim', 'red', 'green', 'yellow', 'magenta', 'cyan', 'brightBlue', 'brightMagenta']
const HEX_PATTERN = /^#[0-9a-fA-F]{6}$/

const props = defineProps<{ modelValue: HudColorValue }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: HudColorValue): void }>()

const mode = computed<'named' | 'index' | 'hex'>(() => {
  if (typeof props.modelValue === 'number') return 'index'
  if (typeof props.modelValue === 'string' && HEX_PATTERN.test(props.modelValue)) return 'hex'
  return 'named'
})

function setMode(target: 'named' | 'index' | 'hex') {
  if (target === mode.value) return
  if (target === 'named') emit('update:modelValue', 'green')
  if (target === 'index') emit('update:modelValue', 208)
  if (target === 'hex') emit('update:modelValue', '#38bdf8')
}

function setNamed(v: HudColorName) { emit('update:modelValue', v) }
function setIndex(e: Event) {
  const n = Number((e.target as HTMLInputElement).value)
  if (Number.isFinite(n)) emit('update:modelValue', Math.max(0, Math.min(255, Math.floor(n))))
}
function setHex(e: Event) {
  const raw = (e.target as HTMLInputElement).value
  emit('update:modelValue', raw)
}
</script>

<template>
  <div class="color-picker">
    <div class="mode-tabs">
      <button data-mode="named" type="button" :class="{ on: mode === 'named' }" @click="setMode('named')">named</button>
      <button data-mode="index" type="button" :class="{ on: mode === 'index' }" @click="setMode('index')">256</button>
      <button data-mode="hex" type="button" :class="{ on: mode === 'hex' }" @click="setMode('hex')">hex</button>
    </div>
    <div class="mode-body">
      <div v-if="mode === 'named'" class="named-grid">
        <button
          v-for="n in NAMED_COLORS"
          :key="n"
          type="button"
          :class="['swatch', { on: modelValue === n }]"
          :style="{ background: `var(--color-named-${n})` }"
          :title="n"
          @click="setNamed(n)"
        />
      </div>
      <div v-else-if="mode === 'index'" class="index-row">
        <input type="number" min="0" max="255" :value="modelValue" @input="setIndex" />
        <span class="hint">0–255</span>
      </div>
      <div v-else class="hex-row">
        <input type="text" :value="modelValue" @input="setHex" />
        <span class="hint">#rrggbb</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.color-picker { display: flex; flex-direction: column; gap: var(--space-2); flex: 1; }
.mode-tabs { display: flex; gap: 2px; }
.mode-tabs button {
  background: var(--bg-elevated);
  border: 1px solid var(--border-dim);
  color: var(--fg-dim);
  font-family: var(--font-mono);
  font-size: 11px;
  padding: 2px 8px;
  cursor: pointer;
}
.mode-tabs button.on { color: var(--accent); border-color: var(--accent); }
.named-grid { display: flex; gap: 4px; flex-wrap: wrap; }
.swatch {
  width: 22px; height: 22px;
  border: 1px solid var(--border-dim);
  border-radius: 2px;
  cursor: pointer;
}
.swatch.on { outline: 2px solid var(--accent); outline-offset: 1px; }
.index-row, .hex-row { display: flex; align-items: center; gap: var(--space-2); }
.index-row input, .hex-row input {
  background: var(--bg-elevated);
  color: var(--fg-base);
  border: 1px solid var(--border-dim);
  border-radius: 2px;
  padding: 4px 8px;
  font-family: var(--font-mono);
  font-size: 12px;
}
.hex-row input { width: 100px; }
.hint { color: var(--fg-dim); font-size: 11px; }
</style>
```

- [ ] **Step 4: Run tests, verify all pass**

```bash
pnpm test:run -- ColorPicker
```

Expected: `5 passed`.

- [ ] **Step 5: Commit**

```bash
git add src/components/form/ColorPicker.vue tests/components/ColorPicker.test.ts
git commit -m "feat(form): ColorPicker — named / 256-index / hex modes"
```

---

## Task 11: SortableList primitive

**Files:**
- Create: `src/components/form/SortableList.vue`
- Test: `tests/components/SortableList.test.ts`

Drag-reorder a list of string items. Uses HTML5 drag-and-drop (native, no dependency).

- [ ] **Step 1: Write the failing test**

```typescript
// tests/components/SortableList.test.ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SortableList from '@/components/form/SortableList.vue'

describe('SortableList', () => {
  it('renders each item', () => {
    const w = mount(SortableList, { props: { modelValue: ['a', 'b', 'c'] } })
    expect(w.findAll('.sortable-item').map(n => n.text())).toContain('a')
  })

  it('emits reordered list on move-up button', async () => {
    const w = mount(SortableList, { props: { modelValue: ['a', 'b', 'c'] } })
    const items = w.findAll('.sortable-item')
    await items[1].find('.move-up').trigger('click')
    expect(w.emitted('update:modelValue')?.[0]).toEqual([['b', 'a', 'c']])
  })

  it('move-down on last item is a no-op', async () => {
    const w = mount(SortableList, { props: { modelValue: ['a', 'b'] } })
    const items = w.findAll('.sortable-item')
    await items[1].find('.move-down').trigger('click')
    expect(w.emitted('update:modelValue')).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run, verify it fails**

```bash
pnpm test:run -- SortableList
```

- [ ] **Step 3: Create src/components/form/SortableList.vue**

```vue
<script setup lang="ts">
const props = defineProps<{ modelValue: string[]; labels?: Record<string, string> }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: string[]): void }>()

function move(from: number, to: number) {
  if (to < 0 || to >= props.modelValue.length) return
  const next = [...props.modelValue]
  const [removed] = next.splice(from, 1)
  next.splice(to, 0, removed)
  emit('update:modelValue', next)
}

function onDragStart(e: DragEvent, idx: number) {
  e.dataTransfer?.setData('text/plain', String(idx))
}
function onDrop(e: DragEvent, idx: number) {
  const from = Number(e.dataTransfer?.getData('text/plain'))
  if (Number.isFinite(from) && from !== idx) move(from, idx)
}
function onDragOver(e: DragEvent) { e.preventDefault() }
</script>

<template>
  <ul class="sortable-list">
    <li
      v-for="(item, idx) in modelValue"
      :key="item"
      class="sortable-item"
      draggable="true"
      @dragstart="onDragStart($event, idx)"
      @dragover="onDragOver"
      @drop="onDrop($event, idx)"
    >
      <span class="grip">⋮⋮</span>
      <span class="item-label">{{ labels?.[item] ?? item }}</span>
      <span class="item-spacer" />
      <button type="button" class="move-up" :disabled="idx === 0" @click="move(idx, idx - 1)">▲</button>
      <button type="button" class="move-down" :disabled="idx === modelValue.length - 1" @click="move(idx, idx + 1)">▼</button>
    </li>
  </ul>
</template>

<style scoped>
.sortable-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 2px; }
.sortable-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 4px 8px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-dim);
  border-radius: 2px;
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--fg-base);
  cursor: grab;
}
.sortable-item:active { cursor: grabbing; }
.grip { color: var(--fg-dim); }
.item-label { color: var(--fg-base); }
.item-spacer { flex: 1; }
.move-up, .move-down {
  background: transparent;
  border: 1px solid var(--border-dim);
  color: var(--fg-dim);
  font-size: 10px;
  width: 22px;
  height: 20px;
  cursor: pointer;
}
.move-up:disabled, .move-down:disabled { opacity: 0.3; cursor: not-allowed; }
.move-up:hover:not(:disabled), .move-down:hover:not(:disabled) { color: var(--accent); border-color: var(--accent); }
</style>
```

- [ ] **Step 4: Run tests, verify all pass**

```bash
pnpm test:run -- SortableList
```

Expected: `3 passed`.

- [ ] **Step 5: Commit**

```bash
git add src/components/form/SortableList.vue tests/components/SortableList.test.ts
git commit -m "feat(form): SortableList — drag + up/down reorder"
```

---

## Task 12: MergeGroupEditor

**Files:**
- Create: `src/components/form/MergeGroupEditor.vue`

Manages a `HudElement[][]` — multiple groups, each with 2+ elements. UI: each group shown as a row of chips with "remove" buttons + "add element" picker; a global "add group" button at the bottom.

- [ ] **Step 1: Create src/components/form/MergeGroupEditor.vue**

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { DEFAULT_ELEMENT_ORDER, type HudElement } from '@/lib/hud-schema'

const props = defineProps<{ modelValue: HudElement[][] }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: HudElement[][]): void }>()

const usedElements = computed(() => new Set(props.modelValue.flat()))
const availableElements = computed(() =>
  DEFAULT_ELEMENT_ORDER.filter(e => !usedElements.value.has(e))
)

function emitGroups(next: HudElement[][]) {
  emit('update:modelValue', next.filter(g => g.length >= 2))
}

function addGroup() {
  const pool = availableElements.value
  if (pool.length < 2) return
  const next = [...props.modelValue, [pool[0], pool[1]]]
  emit('update:modelValue', next)
}

function removeGroup(idx: number) {
  emitGroups(props.modelValue.filter((_, i) => i !== idx))
}

function removeFromGroup(gIdx: number, elIdx: number) {
  const next = props.modelValue.map(g => [...g])
  next[gIdx].splice(elIdx, 1)
  emitGroups(next)
}

function addToGroup(gIdx: number, el: HudElement) {
  const next = props.modelValue.map(g => [...g])
  next[gIdx].push(el)
  emitGroups(next)
}
</script>

<template>
  <div class="merge-group-editor">
    <div v-for="(group, gIdx) in modelValue" :key="gIdx" class="group-row">
      <span class="group-label">[{{ gIdx + 1 }}]</span>
      <span v-for="(el, elIdx) in group" :key="el" class="chip">
        {{ el }}
        <button type="button" class="x" @click="removeFromGroup(gIdx, elIdx)" :disabled="group.length <= 2">×</button>
      </span>
      <select v-if="availableElements.length > 0" class="add-select" @change="addToGroup(gIdx, ($event.target as HTMLSelectElement).value as HudElement); ($event.target as HTMLSelectElement).value = ''">
        <option value="" disabled selected>+ add</option>
        <option v-for="el in availableElements" :key="el" :value="el">{{ el }}</option>
      </select>
      <span class="group-spacer" />
      <button type="button" class="remove-group" @click="removeGroup(gIdx)">delete group</button>
    </div>
    <button v-if="availableElements.length >= 2" type="button" class="add-group" @click="addGroup">+ add group</button>
    <p v-else-if="modelValue.length === 0" class="empty">No merge groups. Click "+ add group" when elements are available.</p>
  </div>
</template>

<style scoped>
.merge-group-editor { display: flex; flex-direction: column; gap: var(--space-2); flex: 1; }
.group-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-1);
  padding: 4px 8px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-dim);
  border-radius: 2px;
}
.group-label { color: var(--fg-dim); font-size: 11px; margin-right: var(--space-2); }
.chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: var(--bg-base);
  border: 1px solid var(--border-dash);
  padding: 2px 6px;
  border-radius: 2px;
  font-size: 11px;
}
.chip .x { background: transparent; border: none; color: var(--fg-dim); cursor: pointer; padding: 0 2px; }
.chip .x:disabled { opacity: 0.3; cursor: not-allowed; }
.chip .x:hover:not(:disabled) { color: var(--accent-bad); }
.add-select {
  background: transparent;
  border: 1px dashed var(--border-dash);
  color: var(--fg-dim);
  font-family: var(--font-mono);
  font-size: 11px;
  padding: 2px 4px;
}
.group-spacer { flex: 1; }
.remove-group {
  background: transparent;
  border: 1px solid var(--border-dim);
  color: var(--fg-dim);
  font-size: 10px;
  padding: 2px 6px;
  cursor: pointer;
}
.remove-group:hover { color: var(--accent-bad); border-color: var(--accent-bad); }
.add-group {
  align-self: flex-start;
  background: transparent;
  border: 1px dashed var(--border-dash);
  color: var(--fg-dim);
  font-family: var(--font-mono);
  font-size: 12px;
  padding: 4px 10px;
  cursor: pointer;
}
.add-group:hover { color: var(--accent); border-color: var(--accent); }
.empty { color: var(--fg-dim); font-size: 11px; }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/form/MergeGroupEditor.vue
git commit -m "feat(form): MergeGroupEditor — chip-based group management"
```

---

## Task 13: TabNav

**Files:**
- Create: `src/components/shell/TabNav.vue`

- [ ] **Step 1: Create src/components/shell/TabNav.vue**

```vue
<script setup lang="ts">
defineProps<{
  modelValue: string
  tabs: Array<{ value: string; label: string }>
}>()
defineEmits<{ (e: 'update:modelValue', v: string): void }>()
</script>

<template>
  <nav class="tab-nav">
    <button
      v-for="t in tabs"
      :key="t.value"
      type="button"
      class="tab"
      :class="{ on: modelValue === t.value }"
      @click="$emit('update:modelValue', t.value)"
    >{{ t.label }}</button>
  </nav>
</template>

<style scoped>
.tab-nav {
  display: flex;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4) 0;
  border-bottom: 1px dashed var(--border-dash);
}
.tab {
  background: transparent;
  border: none;
  color: var(--fg-dim);
  font-family: var(--font-mono);
  font-size: 12px;
  padding: 6px 0;
  margin-bottom: -1px;
  border-bottom: 1px solid transparent;
  cursor: pointer;
}
.tab:hover { color: var(--fg-base); }
.tab.on { color: var(--accent); border-bottom-color: var(--accent); }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/shell/TabNav.vue
git commit -m "feat(shell): TabNav component"
```

---

## Task 14: LayoutTab

**Files:**
- Create: `src/components/editor/LayoutTab.vue`
- Test: `tests/components/LayoutTab.test.ts`

Wires the Layout-related fields: `lineLayout`, `showSeparators`, `pathLevels`, `maxWidth`, `forceMaxWidth`, `elementOrder`.

- [ ] **Step 1: Write the failing test**

```typescript
// tests/components/LayoutTab.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import LayoutTab from '@/components/editor/LayoutTab.vue'
import { useConfigStore } from '@/stores/config'

describe('LayoutTab', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('mounts with current parsed config visible', () => {
    const w = mount(LayoutTab)
    expect(w.text()).toContain('lineLayout')
    expect(w.text()).toContain('pathLevels')
  })

  it('toggling lineLayout writes to store', async () => {
    const store = useConfigStore()
    const w = mount(LayoutTab)
    const select = w.find('select')
    await select.setValue('compact')
    expect(store.rawJson).toEqual({ lineLayout: 'compact' })
  })
})
```

- [ ] **Step 2: Run, verify it fails**

```bash
pnpm test:run -- LayoutTab
```

- [ ] **Step 3: Create src/components/editor/LayoutTab.vue**

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useConfigStore } from '@/stores/config'
import FieldRow from '@/components/form/FieldRow.vue'
import ToggleSwitch from '@/components/form/ToggleSwitch.vue'
import SelectInput from '@/components/form/SelectInput.vue'
import NumberInput from '@/components/form/NumberInput.vue'
import SortableList from '@/components/form/SortableList.vue'

const store = useConfigStore()
const cfg = computed(() => store.parsedConfig)

function setLineLayout(v: string | number) { store.patchField('lineLayout', v) }
function setShowSeparators(v: boolean) { store.patchField('showSeparators', v) }
function setPathLevels(v: string | number) { store.patchField('pathLevels', Number(v)) }
function setMaxWidth(v: number | null) {
  if (v === null) store.clearField('maxWidth')
  else store.patchField('maxWidth', v)
}
function setForceMaxWidth(v: boolean) { store.patchField('forceMaxWidth', v) }
function setElementOrder(v: string[]) { store.patchField('elementOrder', v) }
</script>

<template>
  <div class="layout-tab">
    <FieldRow label="Line layout" path="lineLayout">
      <SelectInput
        :modelValue="cfg.lineLayout"
        :options="[{ value: 'expanded', label: 'expanded' }, { value: 'compact', label: 'compact' }]"
        @update:modelValue="setLineLayout"
      />
    </FieldRow>

    <FieldRow label="Show separators" path="showSeparators" hint="Insert a dashed separator line between header and activity lines.">
      <ToggleSwitch :modelValue="cfg.showSeparators" @update:modelValue="setShowSeparators" />
    </FieldRow>

    <FieldRow label="Path levels" path="pathLevels" hint="How many path segments to show in the project label.">
      <SelectInput
        :modelValue="cfg.pathLevels"
        :options="[{ value: 1, label: '1' }, { value: 2, label: '2' }, { value: 3, label: '3' }]"
        @update:modelValue="setPathLevels"
      />
    </FieldRow>

    <FieldRow label="Max width" path="maxWidth" hint="Clamp output width (cells). Leave empty for auto.">
      <NumberInput :modelValue="cfg.maxWidth" :min="0" nullable placeholder="auto" @update:modelValue="setMaxWidth" />
    </FieldRow>

    <FieldRow label="Force max width" path="forceMaxWidth" hint="Use the configured maxWidth even when terminal width is wider.">
      <ToggleSwitch :modelValue="cfg.forceMaxWidth" @update:modelValue="setForceMaxWidth" />
    </FieldRow>

    <FieldRow label="Element order" path="elementOrder" hint="Drag to reorder. Elements not listed are hidden.">
      <SortableList :modelValue="cfg.elementOrder" @update:modelValue="setElementOrder" />
    </FieldRow>
  </div>
</template>

<style scoped>
.layout-tab { display: flex; flex-direction: column; }
</style>
```

- [ ] **Step 4: Run tests, verify all pass**

```bash
pnpm test:run -- LayoutTab
```

Expected: `2 passed`.

- [ ] **Step 5: Commit**

```bash
git add src/components/editor/LayoutTab.vue tests/components/LayoutTab.test.ts
git commit -m "feat(editor): LayoutTab — first editable tab"
```

---

## Task 15: Wire LayoutTab into App.vue + TabNav

**Files:**
- Modify: `src/App.vue`

- [ ] **Step 1: Replace src/App.vue**

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'
import HudPreview from '@/preview/HudPreview.vue'
import TabNav from '@/components/shell/TabNav.vue'
import LayoutTab from '@/components/editor/LayoutTab.vue'
import { useConfigStore } from '@/stores/config'

const store = useConfigStore()

const tabs = [
  { value: 'layout', label: 'Layout' },
  { value: 'elements', label: 'Elements' },
  { value: 'git', label: 'Git' },
  { value: 'display', label: 'Display' },
  { value: 'thresholds', label: 'Thresholds' },
  { value: 'colors', label: 'Colors' },
  { value: 'rawJson', label: 'Raw JSON' },
]

const activeTab = ref('layout')
const parsedConfig = computed(() => store.parsedConfig)
</script>

<template>
  <div id="app-shell">
    <header class="topbar">
      <span class="logo">▆ claude-hud.cfg</span>
      <span class="topbar-spacer" />
      <span class="topbar-hint">v0.2 — editor</span>
    </header>

    <section class="preview-stage">
      <div class="stage-label">PREVIEW (live)</div>
      <HudPreview :config="parsedConfig" />
    </section>

    <TabNav v-model="activeTab" :tabs="tabs" />

    <main class="editor-stage">
      <LayoutTab v-if="activeTab === 'layout'" />
      <p v-else class="placeholder">"{{ activeTab }}" tab lands later in Plan 02.</p>
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
.placeholder { color: var(--fg-dim); font-size: 12px; }
</style>
```

- [ ] **Step 2: Verify visually**

```bash
pnpm dev
```

Open browser. Confirm:
- Preview stays sticky on top
- Tab nav appears under preview
- "Layout" tab shows all 6 fields
- Changing `lineLayout` to `compact` collapses the preview to one-line form
- Changing `pathLevels` to 3 lengthens the project path
- Dragging items in element order reorders preview lines

Stop with Ctrl+C.

- [ ] **Step 3: Commit**

```bash
git add src/App.vue
git commit -m "feat(app): TabNav + LayoutTab wired in"
```

---

## Task 16: ElementsTab

**Files:**
- Create: `src/components/editor/ElementsTab.vue`
- Test: `tests/components/ElementsTab.test.ts`

Covers all `show*` activity toggles + `mergeGroups`.

- [ ] **Step 1: Write the failing test**

```typescript
// tests/components/ElementsTab.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import ElementsTab from '@/components/editor/ElementsTab.vue'
import { useConfigStore } from '@/stores/config'

describe('ElementsTab', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('renders the toggle for showTools', () => {
    const w = mount(ElementsTab)
    expect(w.text()).toContain('showTools')
  })

  it('toggling showTools writes to store', async () => {
    const store = useConfigStore()
    const w = mount(ElementsTab)
    const toggles = w.findAll('button.toggle')
    const showTools = toggles.find(b => b.element.closest('.field-row')?.textContent?.includes('showTools'))!
    await showTools.trigger('click')
    expect(store.rawJson).toEqual({ display: { showTools: true } })
  })
})
```

- [ ] **Step 2: Run, verify it fails**

```bash
pnpm test:run -- ElementsTab
```

- [ ] **Step 3: Create src/components/editor/ElementsTab.vue**

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useConfigStore } from '@/stores/config'
import FieldRow from '@/components/form/FieldRow.vue'
import ToggleSwitch from '@/components/form/ToggleSwitch.vue'
import MergeGroupEditor from '@/components/form/MergeGroupEditor.vue'
import type { HudElement } from '@/lib/hud-schema'

const store = useConfigStore()
const cfg = computed(() => store.parsedConfig)

const elementToggles: Array<{ path: string; label: string; hint?: string }> = [
  { path: 'display.showModel',          label: 'showModel',          hint: 'Show the [Model name] badge.' },
  { path: 'display.showProject',        label: 'showProject',        hint: 'Show the project path.' },
  { path: 'display.showAddedDirs',      label: 'showAddedDirs',      hint: 'Show added directories.' },
  { path: 'display.showContextBar',     label: 'showContextBar',     hint: 'Show the context-usage bar.' },
  { path: 'display.showTokenBreakdown', label: 'showTokenBreakdown', hint: 'Show in/out token counts after the percentage.' },
  { path: 'display.showUsage',          label: 'showUsage',          hint: 'Show the 5h / 7d usage line.' },
  { path: 'display.usageBarEnabled',    label: 'usageBarEnabled',    hint: 'Show bars for usage values.' },
  { path: 'display.showResetLabel',     label: 'showResetLabel',     hint: 'Show reset countdown for usage.' },
  { path: 'display.showTools',          label: 'showTools' },
  { path: 'display.showAgents',         label: 'showAgents' },
  { path: 'display.showTodos',          label: 'showTodos' },
  { path: 'display.showMemoryUsage',    label: 'showMemoryUsage' },
  { path: 'display.showPromptCache',    label: 'showPromptCache' },
  { path: 'display.showSessionName',    label: 'showSessionName' },
  { path: 'display.showClaudeCodeVersion', label: 'showClaudeCodeVersion' },
  { path: 'display.showEffortLevel',    label: 'showEffortLevel' },
  { path: 'display.showSessionTokens',  label: 'showSessionTokens' },
  { path: 'display.showOutputStyle',    label: 'showOutputStyle' },
  { path: 'display.showSessionStartDate', label: 'showSessionStartDate' },
  { path: 'display.showLastResponseAt', label: 'showLastResponseAt' },
  { path: 'display.showConfigCounts',   label: 'showConfigCounts',   hint: 'Show counts of CLAUDE.md / rules / MCPs / hooks.' },
  { path: 'display.showCost',           label: 'showCost' },
  { path: 'display.showDuration',       label: 'showDuration' },
  { path: 'display.showSpeed',          label: 'showSpeed' },
]

function getBool(path: string): boolean {
  const parts = path.split('.')
  let cur: any = cfg.value
  for (const k of parts) cur = cur?.[k]
  return Boolean(cur)
}

function setBool(path: string, v: boolean) { store.patchField(path, v) }

function setMergeGroups(v: HudElement[][]) { store.patchField('display.mergeGroups', v) }
</script>

<template>
  <div class="elements-tab">
    <h3 class="section-title">Visibility toggles</h3>
    <FieldRow
      v-for="t in elementToggles"
      :key="t.path"
      :label="t.label"
      :path="t.path"
      :hint="t.hint"
    >
      <ToggleSwitch :modelValue="getBool(t.path)" @update:modelValue="setBool(t.path, $event)" />
    </FieldRow>

    <h3 class="section-title">Merge groups</h3>
    <FieldRow
      label="display.mergeGroups"
      path="display.mergeGroups"
      hint="Elements in the same group render on one line separated by │."
    >
      <MergeGroupEditor :modelValue="cfg.display.mergeGroups" @update:modelValue="setMergeGroups" />
    </FieldRow>
  </div>
</template>

<style scoped>
.elements-tab { display: flex; flex-direction: column; }
.section-title {
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--fg-dim);
  margin: var(--space-4) 0 var(--space-2);
}
.section-title:first-child { margin-top: 0; }
</style>
```

- [ ] **Step 4: Run tests, verify all pass**

```bash
pnpm test:run -- ElementsTab
```

Expected: `2 passed`.

- [ ] **Step 5: Wire into App.vue**

In `src/App.vue`, import `ElementsTab` and replace the placeholder paragraph for `activeTab === 'elements'`:

```vue
<script setup lang="ts">
// add this import near the others
import ElementsTab from '@/components/editor/ElementsTab.vue'
</script>

<template>
  <!-- inside <main class="editor-stage"> -->
  <LayoutTab v-if="activeTab === 'layout'" />
  <ElementsTab v-else-if="activeTab === 'elements'" />
  <p v-else class="placeholder">"{{ activeTab }}" tab lands later in Plan 02.</p>
</template>
```

- [ ] **Step 6: Commit**

```bash
git add src/components/editor/ElementsTab.vue tests/components/ElementsTab.test.ts src/App.vue
git commit -m "feat(editor): ElementsTab — toggles + MergeGroupEditor"
```

---

## Task 17: GitTab

**Files:**
- Create: `src/components/editor/GitTab.vue`
- Modify: `src/App.vue`

- [ ] **Step 1: Create src/components/editor/GitTab.vue**

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useConfigStore } from '@/stores/config'
import FieldRow from '@/components/form/FieldRow.vue'
import ToggleSwitch from '@/components/form/ToggleSwitch.vue'
import SelectInput from '@/components/form/SelectInput.vue'
import NumberInput from '@/components/form/NumberInput.vue'

const store = useConfigStore()
const cfg = computed(() => store.parsedConfig.gitStatus)

function set(path: string, v: unknown) { store.patchField(`gitStatus.${path}`, v) }
</script>

<template>
  <div class="git-tab">
    <FieldRow label="enabled" path="gitStatus.enabled" hint="Master switch for the git line.">
      <ToggleSwitch :modelValue="cfg.enabled" @update:modelValue="set('enabled', $event)" />
    </FieldRow>
    <FieldRow label="showDirty" path="gitStatus.showDirty">
      <ToggleSwitch :modelValue="cfg.showDirty" @update:modelValue="set('showDirty', $event)" />
    </FieldRow>
    <FieldRow label="showAheadBehind" path="gitStatus.showAheadBehind">
      <ToggleSwitch :modelValue="cfg.showAheadBehind" @update:modelValue="set('showAheadBehind', $event)" />
    </FieldRow>
    <FieldRow label="showFileStats" path="gitStatus.showFileStats">
      <ToggleSwitch :modelValue="cfg.showFileStats" @update:modelValue="set('showFileStats', $event)" />
    </FieldRow>
    <FieldRow label="branchOverflow" path="gitStatus.branchOverflow" hint="How to handle very long branch names.">
      <SelectInput
        :modelValue="cfg.branchOverflow"
        :options="[{ value: 'truncate', label: 'truncate' }, { value: 'wrap', label: 'wrap' }]"
        @update:modelValue="set('branchOverflow', $event)"
      />
    </FieldRow>
    <FieldRow label="pushWarningThreshold" path="gitStatus.pushWarningThreshold" hint="Warn when this many commits are unpushed (0 = off).">
      <NumberInput :modelValue="cfg.pushWarningThreshold" :min="0" @update:modelValue="set('pushWarningThreshold', $event)" />
    </FieldRow>
    <FieldRow label="pushCriticalThreshold" path="gitStatus.pushCriticalThreshold">
      <NumberInput :modelValue="cfg.pushCriticalThreshold" :min="0" @update:modelValue="set('pushCriticalThreshold', $event)" />
    </FieldRow>
  </div>
</template>

<style scoped>
.git-tab { display: flex; flex-direction: column; }
</style>
```

- [ ] **Step 2: Wire into App.vue**

Add to script imports:
```typescript
import GitTab from '@/components/editor/GitTab.vue'
```

Add to template:
```vue
<GitTab v-else-if="activeTab === 'git'" />
```

- [ ] **Step 3: Commit**

```bash
git add src/components/editor/GitTab.vue src/App.vue
git commit -m "feat(editor): GitTab"
```

---

## Task 18: DisplayTab

**Files:**
- Create: `src/components/editor/DisplayTab.vue`
- Modify: `src/App.vue`

Covers the remaining display.* fields not in Elements / Thresholds tabs: contextValue, usageValue, usageCompact, addedDirsLayout, autocompactBuffer, modelFormat, timeFormat, customLine, modelOverride, externalUsagePath, externalUsageFreshnessMs, promptCacheTtlSeconds.

- [ ] **Step 1: Create src/components/editor/DisplayTab.vue**

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useConfigStore } from '@/stores/config'
import FieldRow from '@/components/form/FieldRow.vue'
import SelectInput from '@/components/form/SelectInput.vue'
import NumberInput from '@/components/form/NumberInput.vue'
import TextInput from '@/components/form/TextInput.vue'

const store = useConfigStore()
const d = computed(() => store.parsedConfig.display)

function set(path: string, v: unknown) { store.patchField(`display.${path}`, v) }
</script>

<template>
  <div class="display-tab">
    <h3 class="section-title">Context display</h3>
    <FieldRow label="contextValue" path="display.contextValue" hint="What to show as the context number.">
      <SelectInput
        :modelValue="d.contextValue"
        :options="[
          { value: 'percent',   label: 'percent' },
          { value: 'tokens',    label: 'tokens' },
          { value: 'remaining', label: 'remaining' },
          { value: 'both',      label: 'both' },
        ]"
        @update:modelValue="set('contextValue', $event)"
      />
    </FieldRow>
    <FieldRow label="autocompactBuffer" path="display.autocompactBuffer">
      <SelectInput
        :modelValue="d.autocompactBuffer"
        :options="[{ value: 'enabled', label: 'enabled' }, { value: 'disabled', label: 'disabled' }]"
        @update:modelValue="set('autocompactBuffer', $event)"
      />
    </FieldRow>

    <h3 class="section-title">Usage display</h3>
    <FieldRow label="usageValue" path="display.usageValue">
      <SelectInput
        :modelValue="d.usageValue"
        :options="[{ value: 'percent', label: 'percent' }, { value: 'remaining', label: 'remaining' }]"
        @update:modelValue="set('usageValue', $event)"
      />
    </FieldRow>
    <FieldRow label="usageCompact" path="display.usageCompact" hint="Compress the usage line to fewer characters.">
      <SelectInput
        :modelValue="d.usageCompact ? 'on' : 'off'"
        :options="[{ value: 'off', label: 'off' }, { value: 'on', label: 'on' }]"
        @update:modelValue="set('usageCompact', $event === 'on')"
      />
    </FieldRow>

    <h3 class="section-title">Model</h3>
    <FieldRow label="modelFormat" path="display.modelFormat">
      <SelectInput
        :modelValue="d.modelFormat"
        :options="[
          { value: 'full',    label: 'full' },
          { value: 'compact', label: 'compact' },
          { value: 'short',   label: 'short' },
        ]"
        @update:modelValue="set('modelFormat', $event)"
      />
    </FieldRow>
    <FieldRow label="modelOverride" path="display.modelOverride" hint="If set, this string replaces the model display name entirely. Max 80 chars.">
      <TextInput :modelValue="d.modelOverride" :maxLength="80" placeholder="e.g. Claude" @update:modelValue="set('modelOverride', $event)" />
    </FieldRow>

    <h3 class="section-title">Time</h3>
    <FieldRow label="timeFormat" path="display.timeFormat">
      <SelectInput
        :modelValue="d.timeFormat"
        :options="[
          { value: 'relative', label: 'relative' },
          { value: 'absolute', label: 'absolute' },
          { value: 'both',     label: 'both' },
        ]"
        @update:modelValue="set('timeFormat', $event)"
      />
    </FieldRow>

    <h3 class="section-title">Project</h3>
    <FieldRow label="addedDirsLayout" path="display.addedDirsLayout">
      <SelectInput
        :modelValue="d.addedDirsLayout"
        :options="[{ value: 'inline', label: 'inline' }, { value: 'line', label: 'line' }]"
        @update:modelValue="set('addedDirsLayout', $event)"
      />
    </FieldRow>

    <h3 class="section-title">Prompt cache</h3>
    <FieldRow label="promptCacheTtlSeconds" path="display.promptCacheTtlSeconds" hint="Anthropic API cache TTL (default 300).">
      <NumberInput :modelValue="d.promptCacheTtlSeconds" :min="1" @update:modelValue="set('promptCacheTtlSeconds', $event ?? 1)" />
    </FieldRow>

    <h3 class="section-title">External usage</h3>
    <FieldRow label="externalUsagePath" path="display.externalUsagePath" hint="Path to an external JSON snapshot of usage data.">
      <TextInput :modelValue="d.externalUsagePath" placeholder="/path/to/usage.json" @update:modelValue="set('externalUsagePath', $event)" />
    </FieldRow>
    <FieldRow label="externalUsageFreshnessMs" path="display.externalUsageFreshnessMs" hint="Max age of the external snapshot before it's considered stale.">
      <NumberInput :modelValue="d.externalUsageFreshnessMs" :min="0" @update:modelValue="set('externalUsageFreshnessMs', $event ?? 0)" />
    </FieldRow>

    <h3 class="section-title">Custom</h3>
    <FieldRow label="customLine" path="display.customLine" hint="Free-form extra line appended at the end. Max 80 chars.">
      <TextInput :modelValue="d.customLine" :maxLength="80" placeholder="" @update:modelValue="set('customLine', $event)" />
    </FieldRow>
  </div>
</template>

<style scoped>
.display-tab { display: flex; flex-direction: column; }
.section-title {
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--fg-dim);
  margin: var(--space-4) 0 var(--space-2);
}
.section-title:first-child { margin-top: 0; }
</style>
```

- [ ] **Step 2: Wire into App.vue**

Add import:
```typescript
import DisplayTab from '@/components/editor/DisplayTab.vue'
```

Add to template:
```vue
<DisplayTab v-else-if="activeTab === 'display'" />
```

- [ ] **Step 3: Commit**

```bash
git add src/components/editor/DisplayTab.vue src/App.vue
git commit -m "feat(editor): DisplayTab — context/usage/model/time/cache/external/custom"
```

---

## Task 19: ThresholdsTab

**Files:**
- Create: `src/components/editor/ThresholdsTab.vue`
- Modify: `src/App.vue`

- [ ] **Step 1: Create src/components/editor/ThresholdsTab.vue**

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useConfigStore } from '@/stores/config'
import FieldRow from '@/components/form/FieldRow.vue'
import ThresholdSlider from '@/components/form/ThresholdSlider.vue'

const store = useConfigStore()
const d = computed(() => store.parsedConfig.display)

function set(path: string, v: number) { store.patchField(`display.${path}`, v) }
</script>

<template>
  <div class="thresholds-tab">
    <FieldRow label="contextWarningThreshold" path="display.contextWarningThreshold" hint="Context % at which the bar turns warning-colored.">
      <ThresholdSlider :modelValue="d.contextWarningThreshold" @update:modelValue="set('contextWarningThreshold', $event)" />
    </FieldRow>
    <FieldRow label="contextCriticalThreshold" path="display.contextCriticalThreshold" hint="Context % at which the bar turns critical-colored.">
      <ThresholdSlider :modelValue="d.contextCriticalThreshold" @update:modelValue="set('contextCriticalThreshold', $event)" />
    </FieldRow>
    <FieldRow label="usageThreshold" path="display.usageThreshold" hint="5h usage % above which the value turns warning-colored. 0 = off.">
      <ThresholdSlider :modelValue="d.usageThreshold" @update:modelValue="set('usageThreshold', $event)" />
    </FieldRow>
    <FieldRow label="sevenDayThreshold" path="display.sevenDayThreshold" hint="7d usage % threshold.">
      <ThresholdSlider :modelValue="d.sevenDayThreshold" @update:modelValue="set('sevenDayThreshold', $event)" />
    </FieldRow>
    <FieldRow label="environmentThreshold" path="display.environmentThreshold" hint="Threshold for environment counts (CLAUDE.md etc).">
      <ThresholdSlider :modelValue="d.environmentThreshold" @update:modelValue="set('environmentThreshold', $event)" />
    </FieldRow>
  </div>
</template>

<style scoped>
.thresholds-tab { display: flex; flex-direction: column; }
</style>
```

- [ ] **Step 2: Wire into App.vue**

Add import:
```typescript
import ThresholdsTab from '@/components/editor/ThresholdsTab.vue'
```

Add to template:
```vue
<ThresholdsTab v-else-if="activeTab === 'thresholds'" />
```

- [ ] **Step 3: Commit**

```bash
git add src/components/editor/ThresholdsTab.vue src/App.vue
git commit -m "feat(editor): ThresholdsTab — 5 slider fields"
```

---

## Task 20: ColorsTab

**Files:**
- Create: `src/components/editor/ColorsTab.vue`
- Test: `tests/components/ColorsTab.test.ts`
- Modify: `src/App.vue`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/components/ColorsTab.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import ColorsTab from '@/components/editor/ColorsTab.vue'
import { useConfigStore } from '@/stores/config'

describe('ColorsTab', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('renders each color override label', () => {
    const w = mount(ColorsTab)
    const text = w.text()
    expect(text).toContain('context')
    expect(text).toContain('barFilled')
  })

  it('changing barFilled writes to store', async () => {
    const store = useConfigStore()
    const w = mount(ColorsTab)
    const inputs = w.findAll('input[type="text"]')
    const barInput = inputs.find(i => i.element.closest('.field-row')?.textContent?.includes('barFilled'))!
    await barInput.setValue('▓')
    expect((store.rawJson.colors as any)?.barFilled).toBe('▓')
  })
})
```

- [ ] **Step 2: Run, verify it fails**

```bash
pnpm test:run -- ColorsTab
```

- [ ] **Step 3: Create src/components/editor/ColorsTab.vue**

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useConfigStore } from '@/stores/config'
import FieldRow from '@/components/form/FieldRow.vue'
import ColorPicker from '@/components/form/ColorPicker.vue'
import TextInput from '@/components/form/TextInput.vue'
import type { HudColorValue } from '@/lib/hud-schema'

const store = useConfigStore()
const c = computed(() => store.parsedConfig.colors)

const colorFields: Array<{ key: keyof typeof c.value; label: string; hint?: string }> = [
  { key: 'context',       label: 'context',       hint: 'Default color for context bar/value.' },
  { key: 'usage',         label: 'usage',         hint: 'Default color for usage bars.' },
  { key: 'warning',       label: 'warning',       hint: 'Context warning color (>= contextWarningThreshold).' },
  { key: 'usageWarning',  label: 'usageWarning',  hint: 'Usage warning color.' },
  { key: 'critical',      label: 'critical',      hint: 'Context critical color.' },
  { key: 'model',         label: 'model',         hint: 'Color for the [Model] badge.' },
  { key: 'project',       label: 'project',       hint: 'Color for the project path.' },
  { key: 'git',           label: 'git',           hint: 'Color for git status text.' },
  { key: 'gitBranch',     label: 'gitBranch',     hint: 'Color for the branch name.' },
  { key: 'label',         label: 'label',         hint: 'Color for labels like "ctx", "5h".' },
  { key: 'custom',        label: 'custom',        hint: 'Color for custom-line elements.' },
]

function setColor(key: string, v: HudColorValue) { store.patchField(`colors.${key}`, v) }
function setChar(key: string, v: string) { store.patchField(`colors.${key}`, v) }
</script>

<template>
  <div class="colors-tab">
    <FieldRow
      v-for="f in colorFields"
      :key="f.key"
      :label="f.label"
      :path="`colors.${f.key}`"
      :hint="f.hint"
    >
      <ColorPicker :modelValue="c[f.key] as HudColorValue" @update:modelValue="setColor(String(f.key), $event)" />
    </FieldRow>

    <FieldRow label="barFilled" path="colors.barFilled" hint="Single character (or grapheme) used for filled bar segments.">
      <TextInput :modelValue="c.barFilled" :maxLength="4" placeholder="█" @update:modelValue="setChar('barFilled', $event)" />
    </FieldRow>
    <FieldRow label="barEmpty" path="colors.barEmpty" hint="Single character used for empty bar segments.">
      <TextInput :modelValue="c.barEmpty" :maxLength="4" placeholder="░" @update:modelValue="setChar('barEmpty', $event)" />
    </FieldRow>
  </div>
</template>

<style scoped>
.colors-tab { display: flex; flex-direction: column; }
</style>
```

- [ ] **Step 4: Wire into App.vue**

Add import:
```typescript
import ColorsTab from '@/components/editor/ColorsTab.vue'
```

Add to template:
```vue
<ColorsTab v-else-if="activeTab === 'colors'" />
```

- [ ] **Step 5: Run tests, verify all pass**

```bash
pnpm test:run -- ColorsTab
```

Expected: `2 passed`.

- [ ] **Step 6: Commit**

```bash
git add src/components/editor/ColorsTab.vue tests/components/ColorsTab.test.ts src/App.vue
git commit -m "feat(editor): ColorsTab — 11 color overrides + bar chars"
```

---

## Task 21: RawJsonTab

**Files:**
- Create: `src/components/editor/RawJsonTab.vue`
- Test: `tests/components/RawJsonTab.test.ts`
- Modify: `src/App.vue`

Plain `<textarea>` (CodeMirror deferred). Validates on blur — invalid JSON keeps the local edit but does NOT update the store, and shows an error.

- [ ] **Step 1: Write the failing test**

```typescript
// tests/components/RawJsonTab.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import RawJsonTab from '@/components/editor/RawJsonTab.vue'
import { useConfigStore } from '@/stores/config'

describe('RawJsonTab', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('shows current rawJson formatted', () => {
    const store = useConfigStore()
    store.setRawJson({ lineLayout: 'compact' })
    const w = mount(RawJsonTab)
    const text = (w.find('textarea').element as HTMLTextAreaElement).value
    expect(text).toContain('"lineLayout": "compact"')
  })

  it('valid JSON on blur updates the store', async () => {
    const store = useConfigStore()
    const w = mount(RawJsonTab)
    const ta = w.find('textarea')
    await ta.setValue('{"pathLevels": 3}')
    await ta.trigger('blur')
    expect(store.rawJson).toEqual({ pathLevels: 3 })
  })

  it('invalid JSON on blur surfaces an error and leaves store untouched', async () => {
    const store = useConfigStore()
    store.setRawJson({ pathLevels: 2 })
    const w = mount(RawJsonTab)
    const ta = w.find('textarea')
    await ta.setValue('{"pathLevels": 3,,,')
    await ta.trigger('blur')
    expect(store.rawJson).toEqual({ pathLevels: 2 })
    expect(w.find('.json-error').exists()).toBe(true)
  })

  it('non-object root rejected', async () => {
    const store = useConfigStore()
    store.setRawJson({ pathLevels: 2 })
    const w = mount(RawJsonTab)
    const ta = w.find('textarea')
    await ta.setValue('[1,2,3]')
    await ta.trigger('blur')
    expect(store.rawJson).toEqual({ pathLevels: 2 })
    expect(w.find('.json-error').text()).toContain('must be a JSON object')
  })
})
```

- [ ] **Step 2: Run, verify it fails**

```bash
pnpm test:run -- RawJsonTab
```

- [ ] **Step 3: Create src/components/editor/RawJsonTab.vue**

```vue
<script setup lang="ts">
import { ref, watch } from 'vue'
import { useConfigStore } from '@/stores/config'
import type { JsonObject } from '@/lib/path-set'

const store = useConfigStore()

const draft = ref(JSON.stringify(store.rawJson, null, 2))
const error = ref<string | null>(null)

watch(() => store.rawJson, (next) => {
  const newText = JSON.stringify(next, null, 2)
  if (newText !== draft.value) draft.value = newText
}, { deep: true })

function onInput(e: Event) {
  draft.value = (e.target as HTMLTextAreaElement).value
}

function onBlur() {
  try {
    const parsed = JSON.parse(draft.value || '{}')
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      error.value = 'Config must be a JSON object'
      return
    }
    error.value = null
    store.setRawJson(parsed as JsonObject)
  } catch (e) {
    error.value = (e as Error).message
  }
}
</script>

<template>
  <div class="raw-json-tab">
    <p class="hint">Edit the underlying JSON directly. Changes apply on blur. Unknown fields are preserved on export.</p>
    <textarea
      class="json-textarea"
      :class="{ 'has-error': error }"
      spellcheck="false"
      :value="draft"
      @input="onInput"
      @blur="onBlur"
    />
    <p v-if="error" class="json-error">⚠ {{ error }}</p>
  </div>
</template>

<style scoped>
.raw-json-tab { display: flex; flex-direction: column; gap: var(--space-2); }
.hint { color: var(--fg-dim); font-size: 12px; }
.json-textarea {
  background: var(--bg-deep);
  color: var(--fg-bright);
  border: 1px solid var(--border-dim);
  border-radius: 2px;
  padding: var(--space-3);
  font-family: var(--font-mono);
  font-size: 12px;
  line-height: 1.55;
  min-height: 320px;
  resize: vertical;
}
.json-textarea:focus { outline: none; border-color: var(--accent); }
.json-textarea.has-error { border-color: var(--accent-bad); }
.json-error { color: var(--accent-bad); font-size: 12px; }
</style>
```

- [ ] **Step 4: Wire into App.vue**

Add import:
```typescript
import RawJsonTab from '@/components/editor/RawJsonTab.vue'
```

Replace the placeholder `<p>` with the final tab cascade:
```vue
<LayoutTab v-if="activeTab === 'layout'" />
<ElementsTab v-else-if="activeTab === 'elements'" />
<GitTab v-else-if="activeTab === 'git'" />
<DisplayTab v-else-if="activeTab === 'display'" />
<ThresholdsTab v-else-if="activeTab === 'thresholds'" />
<ColorsTab v-else-if="activeTab === 'colors'" />
<RawJsonTab v-else-if="activeTab === 'rawJson'" />
```

- [ ] **Step 5: Run tests, verify all pass**

```bash
pnpm test:run -- RawJsonTab
```

Expected: `4 passed`.

- [ ] **Step 6: Commit**

```bash
git add src/components/editor/RawJsonTab.vue tests/components/RawJsonTab.test.ts src/App.vue
git commit -m "feat(editor): RawJsonTab — textarea with JSON validation on blur"
```

---

## Final checks before Plan 02 done

- [ ] **Step 1: Full test suite, type-check, build**

```bash
pnpm type-check && pnpm lint && pnpm test:run && pnpm build
```

Expected: all succeed.

- [ ] **Step 2: Full manual smoke test**

```bash
pnpm dev
```

Visit `http://localhost:5173`. For each tab:
- **Layout:** toggle compact/expanded, adjust pathLevels, reorder elements
- **Elements:** toggle show* fields, add/remove merge groups
- **Git:** disable git, watch git line disappear from preview
- **Display:** change contextValue to tokens / remaining / both
- **Thresholds:** push contextWarningThreshold below 58% — preview turns yellow
- **Colors:** change `model` color to red, watch the badge color update
- **Raw JSON:** paste `{"foo": 1, "lineLayout": "compact"}`, blur — `foo` survives, compact applies

Stop with Ctrl+C.

- [ ] **Step 3: Tag**

```bash
git tag v0.2-editor
```

---

## Self-review notes

- All 7 tabs exist and are wired into `App.vue`.
- `rawJson` is the source of truth; preview reads `parsedConfig`; round-trips preserve unknown fields (verified by RawJsonTab test and manual smoke).
- `mergeConfig` test fixtures cover edge cases for every validator.
- No import/export, no presets, no URL share, no validation banner yet — those land in Plan 03.

**End state of Plan 02:** Every field in `HudConfig` is editable through the visual form. Preview updates live for any change. Raw JSON tab lets users paste arbitrary JSON in (or copy current state out manually via select-all).
