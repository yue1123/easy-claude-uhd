# claude-hud Visual Config Tool — Design

**Date:** 2026-05-15
**Status:** Draft for review
**Owner:** dh

## Summary

A pure-static frontend that lets users edit `claude-hud` configuration (`~/.claude/plugins/claude-hud/config.json`) through a visual form with a live statusline preview. Built with Vue 3 + Vite + TypeScript. Deployable as a public static site for the claude-hud community, while also serving as a more comfortable replacement for hand-editing the JSON.

The core selling point is the live preview: as users toggle switches and tweak thresholds, they see the resulting statusline render in real time, sized to look like the actual terminal output.

## Goals

- **Primary:** Make claude-hud configuration faster and less error-prone than editing JSON by hand.
- **Secondary:** Provide the community a shareable, public-facing way to discover claude-hud capabilities (presets) and to share configurations (URL hash).
- **Non-goals:** Backend, account system, cloud sync, multi-version support, autodiscovery from the user's filesystem.

## Target Users

1. **claude-hud community users** — anyone who has installed the plugin and wants a friendlier way to configure it. Tool is published as a public static site, potentially upstreamed.
2. **Users replacing hand-editing** — people who could edit `config.json` directly but prefer a visual tool. They need a raw-JSON view as an escape hatch and trust that the tool preserves unknown fields.

## Decisions Log

| Decision | Choice | Reason |
|---|---|---|
| Form factor | Pure static frontend (no Node middleware) | Cheapest to host, easiest to share |
| Preview implementation | Rewrite renderer in Vue (~90% fidelity, not 100% port) | No Node-polyfill complexity, small bundle, full Vue reactivity for UI extras like highlighted-modified fields |
| Layout | Top sticky preview + bottom tabbed form ("Layout B") | Preview is the selling point, always visible at real statusline scale |
| Visual style | Terminal vibe — dark background, monospace, square-bracket/dashed-border aesthetic ("Variant A") | Matches claude-hud's real output; resonates with CLI users |
| Preview mock context | Fixed, not user-tunable | Simpler MVP; user changes thresholds to see warning/critical states |
| v1 features beyond base loop | Presets, URL hash share, en/zh bilingual, validation hints | Community use demands polish |
| Unknown field passthrough | **Required invariant** | Upstream may add fields; users may extend; never silently strip |

## Architecture

```
Browser (static, zero backend)
├── Vue 3 + TypeScript + Vite
├── Pinia (state)
├── vue-i18n (en/zh; keyset aligned with upstream claude-hud's i18n)
└── Boot flow:
      1. Parse URL hash → if present, deserialize into rawJson
      2. Otherwise rawJson = {} (empty, parsedConfig falls through to DEFAULT_CONFIG)
      3. On any config change:
           a. Re-render preview (Vue reactivity over parsedConfig)
           b. Re-run mergeConfig → produce Diagnostic[] (which fields were clamped/dropped)
           c. Debounced (500 ms) write to URL hash
```

Deployment target: GitHub Pages or Vercel — `pnpm build` outputs a static bundle.

**Hard non-goals (explicit YAGNI):**

- No backend / server
- No reading from `~/.claude/...` (browser can't, and shouldn't)
- No undo/redo stack (v1.5+ backlog)
- No multi-claude-hud-version selector (lock to one upstream version; track drift via CI)
- No external schema validation service
- No account system / cloud sync

## Component Decomposition

Each file has one responsibility. Keep files small (most under 100 lines).

```
src/
├── App.vue                                 # Root layout: topbar + preview + tabs + active tab
│
├── stores/
│   ├── config.ts                           # rawJson + parsedConfig + validation (core)
│   ├── ui.ts                               # current tab, language
│   └── presets.ts                          # built-in preset list + selection
│
├── lib/
│   ├── hud-schema.ts                       # HudConfig type + DEFAULT_CONFIG (hand-copy from upstream)
│   ├── merge-config.ts                     # mergeConfig + validate* + Diagnostic generator
│   ├── url-codec.ts                        # rawJson <-> URL hash (LZ-string + base64url)
│   └── mock-context.ts                     # fixed preview scenario data
│
├── preview/
│   ├── HudPreview.vue                      # sticky preview container
│   ├── render-line.ts                      # line assembly (iterates elementOrder)
│   ├── lines/                              # renderers covering the 11 HudElements
│   │   ├── renderProject.ts                # project / addedDirs
│   │   ├── renderContext.ts                # context bar + tokens
│   │   ├── renderUsage.ts                  # 5h / 7d
│   │   ├── renderPromptCache.ts            # prompt cache TTL line
│   │   ├── renderGit.ts                    # used by GitTab settings; not a HudElement but rendered into context lines
│   │   ├── renderMemory.ts
│   │   ├── renderEnvironment.ts
│   │   ├── renderActivity.ts               # exports renderTools / renderAgents / renderTodos
│   │   └── renderSessionTime.ts
│   └── color-map.ts                        # HudColorValue → CSS color
│
├── components/
│   ├── shell/
│   │   ├── TopBar.vue                      # logo + Presets + Import + Export + Share + Language
│   │   ├── TabNav.vue                      # tab strip (7 tabs)
│   │   └── ValidationBanner.vue            # "3 fields were normalized"
│   │
│   ├── editor/
│   │   ├── LayoutTab.vue
│   │   ├── ElementsTab.vue
│   │   ├── GitTab.vue
│   │   ├── DisplayTab.vue                  # internally subgrouped: Model & Project / Context & Usage / Activity / Tokens & Time / Misc
│   │   ├── ThresholdsTab.vue
│   │   ├── ColorsTab.vue
│   │   └── RawJsonTab.vue                  # plain <textarea> + parse validation (CodeMirror deferred to v1.5)
│   │
│   ├── form/                               # reusable form primitives
│   │   ├── FieldRow.vue                    # label + control slot + diagnostic slot
│   │   ├── ToggleSwitch.vue
│   │   ├── SelectInput.vue
│   │   ├── NumberInput.vue
│   │   ├── ThresholdSlider.vue             # 0-100 slider + number input
│   │   ├── TextInput.vue
│   │   ├── ColorPicker.vue                 # named / 256 / hex modes
│   │   ├── SortableList.vue                # drag-sort for elementOrder
│   │   └── MergeGroupEditor.vue            # multi-group drag chips
│   │
│   └── io/
│       ├── ImportButton.vue                # file drop / paste modal
│       ├── ExportButton.vue                # download config.json
│       ├── ShareButton.vue                 # copy URL with hash + toast
│       └── PresetMenu.vue                  # dropdown: Default / Minimal / Full / CJK / Dev / Compact
│
└── i18n/
    ├── en.ts                               # UI text + field tooltips
    └── zh.ts
```

### Boundary notes

- **`lib/hud-schema.ts` / `lib/merge-config.ts`** are hand-copied from upstream. A CI contract test diffs against upstream `src/config.ts` to detect drift.
- **`preview/lines/*.ts`** return Vue `VNode[]` or styled HTML — never ANSI. CSS classes carry the color/style information.
- **`form/FieldRow.vue`** provides slots for the control and for inline diagnostic display.
- **`SortableList.vue` / `MergeGroupEditor.vue`** are the only interactively complex form primitives; the rest are thin wrappers.

Total estimate: ~50 files, most short.

## Data Flow

```
                      ┌──────────────────────┐
                      │   URL hash (init)    │ ── deserialize
                      └──────────┬───────────┘
                                 │
                                 ▼
┌───────────────────────────────────────────────────────────────┐
│  Pinia store (config.ts)                                      │
│                                                                │
│    rawJson: Record<string, unknown>   ◄── SINGLE SOURCE OF    │
│                                            TRUTH for export   │
│                                                                │
│    parsedConfig: HudConfig            ◄── derived (computed)  │
│                                            = mergeConfig(     │
│                                                rawJson)       │
│                                                                │
│    validation: Diagnostic[]           ◄── derived (computed)  │
│                                            = diff(rawJson,    │
│                                                parsedConfig)  │
└──────┬──────────────────────┬─────────────────────────┬───────┘
       │                      │                         │
       ▼                      ▼                         ▼
  ┌────────┐           ┌────────────┐           ┌──────────────┐
  │ Editor │           │  Preview   │           │ Validation   │
  │  Tab   │           │ (HudPreview│           │ UI (red marks│
  │ (writes│           │   .vue)    │           │  on fields)  │
  │ rawJson│           │            │           │              │
  │  via   │           │ reads      │           │ reads        │
  │ patch) │           │ parsedCfg  │           │ validation[] │
  └────────┘           └────────────┘           └──────────────┘
       │
       ▼
  ┌────────────────────────────────────┐
  │ writeBack (debounced 500ms):       │
  │   URL.hash = urlCodec(rawJson)     │
  └────────────────────────────────────┘
```

### Write paths

1. **Form field edit → `patchRawJson(path, value)`** — modifies nested `rawJson`, derived state recomputes, hash writeBack fires.
2. **Raw JSON textarea edit → `setRawJson(parsed)`** — full replacement on successful parse; store untouched on parse failure.
3. **Preset load → `setRawJson(preset.config)`** — same path as JSON edit; preset is `Partial<HudConfig>`, fields equal to defaults stay out of `rawJson` to keep export lean.

### Invariants

- `rawJson` is the **only** source of truth for export. `parsedConfig` is read-only derived state.
- Form controls **display** `parsedConfig` (safe), **write** to `rawJson` (preserves unknowns).
- Deleting/resetting a field removes the key from `rawJson` rather than writing the default value — keeps exported JSON minimal.
- `Diagnostic[]` is structured: `{ path, kind, from, to, severity }` — each entry has a path for inline UI display.

### Diagnostic kinds

| kind | Trigger | Severity |
|---|---|---|
| `clamped` | Numeric out of range [0,100] / [0,255] | warn |
| `unknownEnum` | Enum field has illegal value; fell back to default | warn |
| `unknownElement` | `elementOrder` contains unknown element; stripped | info |
| `duplicateInGroup` | `mergeGroups` had duplicate elements; deduped | info |
| `parseFailure` | JSON textarea unparseable | error (RawJsonTab only) |
| `invalidColor` | Color value illegal; fell back | warn |
| `unknownField` | rawJson contains a key the schema doesn't recognize | info (`Preserved on export, but you'll need Raw JSON tab to edit`) |

## Error Handling

Principle: **never silently lose data, never let the UI enter a dead state.**

### Input errors (invalid JSON)

| Scenario | Detection | UX |
|---|---|---|
| Paste/drop file: JSON parse fails | `try { JSON.parse } catch` | Modal stays open, red text under filename with line/col. rawJson unchanged. |
| Drop file: not valid `.json` (empty, binary), or > 1 MB | Size + parse | Red text: "File too large" / "Not a valid JSON file" |
| Raw JSON textarea: live edit invalid | Parse on blur | textarea border red, error message under. store unchanged. |
| JSON valid but root is not object (`[]`, `"x"`, `null`) | `typeof !== 'object' \|\| Array.isArray` | "Config must be a JSON object" |

### URL hash errors

| Scenario | Handling |
|---|---|
| No hash | Boot with DEFAULT_CONFIG (normal first visit) |
| Hash present but decompress fails | Toast warn: "Shared link is corrupted, loaded default instead"; boot defaults |
| Decompressed content fails JSON parse | Same |
| Hash near browser URL limit on export | Toast warn at share time: "Config is large — link may not work on some platforms (X chars)" |

### Schema drift

**(A) Upstream added field; user has it set; we don't recognize**
- `rawJson` passthrough preserves it
- `ValidationBanner` lists unknown field paths: "Detected 2 fields this tool doesn't know about — they'll be preserved but you'll need to edit them in Raw JSON"

**(B) We recognize field; upstream removed/renamed it**
- Out of scope at runtime — our hand-copied schema is stale
- Mitigation: CI contract test diffs upstream `src/config.ts` against `lib/hud-schema.ts`; opens an issue on diff

### Render-layer errors

| Scenario | Handling |
|---|---|
| Preview render throws | Vue `errorCaptured` hook around `HudPreview`; degrades to `<Preview unavailable — see console>`; editor remains usable |
| Color picker receives illegal string | Component falls back to named mode + highlights; doesn't blow up store |

### Browser API failures

| Scenario | Handling |
|---|---|
| Clipboard write fails (Safari, non-https) | Select textarea content; toast: "Copy failed — link selected, press Ctrl+C" |
| File download fails | Provide "Copy JSON to clipboard" fallback |
| `history.replaceState` fails | Silently ignored; URL sync only |

### Destructive operations: confirm

| Operation | Confirm? |
|---|---|
| Load preset (overwrites config) | Yes, unless rawJson is empty |
| Import file (overwrites config) | Yes, unless rawJson is empty |
| Reset to default | Yes |
| URL hash load (initial visit) | No — that's the expected behavior of shared links |

### i18n missing

- Missing translation key → display the key itself + `console.warn` (vue-i18n default)

## Testing Strategy

Principle: **80% of risk in pure functions → 80% of tests as pure unit tests.** Component tests cover critical integration only.

### Stack

- Vitest (Vite-native, zero config)
- @vue/test-utils (components)
- Inline snapshots for preview output

### Unit tests (target 90%+ coverage)

```
tests/unit/
├── merge-config.test.ts          # each validate* with boundary values (-1, 0, 100, 101, NaN, "abc")
├── diagnostics.test.ts           # given (rawJson, parsedConfig) → Diagnostic[] expectations
├── url-codec.test.ts             # encode/decode round-trip + corrupted hash defense
├── color-map.test.ts             # named / 256 / hex → CSS for all branches
├── mock-context.test.ts          # default scenario key values are stable
└── preview/
    ├── render-line.test.ts       # known config + mock → known HTML (toMatchInlineSnapshot)
    ├── lines-project.test.ts
    ├── lines-context.test.ts     # all contextValue modes
    ├── lines-git.test.ts         # dirty / ahead-behind / clean branches
    └── ... one file per line renderer
```

### Upstream contract tests (CRITICAL)

```
tests/contract/
└── upstream-schema.test.ts
```

Two checks:

1. **Static** — read upstream `~/.claude/plugins/marketplaces/claude-hud/src/config.ts`, extract `HudConfig` field names + `DEFAULT_CONFIG` values, compare against `lib/hud-schema.ts`. Diff → fail with detailed output.
2. **Behavioral** — load fixture configs (simple / complex / boundary), run both our `mergeConfig` and the upstream's (dynamic import), assert outputs `deepEqual`.

Runs in CI by pulling an upstream release tarball. Locally `describe.skipIf(!hasUpstream)` so devs without the plugin installed are not blocked.

### Component / integration tests (light)

```
tests/components/
├── App.test.ts                   # smoke: mounts, topbar/preview/tab visible
├── stores/config.test.ts         # patchRawJson → parsed/validation sync; unknown fields survive round-trip
├── editor/ColorPicker.test.ts    # mode switching + invalid value graceful fallback
├── editor/SortableList.test.ts   # drag reorder → rawJson.elementOrder order correct
├── editor/RawJsonTab.test.ts     # invalid JSON → no store write + red error shown
└── io/ImportButton.test.ts       # File drop / paste → setRawJson called
```

### Snapshot tests

```
tests/snapshots/preview/
├── default-config.snap
├── compact-layout.snap
├── all-elements-on.snap
├── cjk-language.snap
└── high-threshold-warn.snap      # triggers warning/critical color states
```

Updating these requires `vitest --update` + review. This is the **last defense against preview drift.**

### Not in v1

- E2E (Playwright/Cypress) — deferred to v1.5
- Visual regression (Percy/Chromatic) — deferred; snapshots cover this for now
- Automated a11y (axe-core) — deferred; basic a11y maintained manually

### CI

```yaml
on: [push, pull_request]
jobs:
  test:
    steps:
      - pnpm install
      - pnpm lint                  # oxlint + eslint
      - pnpm type-check
      - pnpm test:unit             # vitest run
      - pnpm test:contract         # upstream tarball + diff (warn, non-blocking initially)
      - pnpm build                 # ensure bundle compiles
```

## Implementation Phases

| Phase | Days | Output |
|---|---:|---|
| 0. Scaffold cleanup | 0.5 | Trim default Vue template, add deps (pinia, vue-i18n, vitest), configure test runner, commit baseline |
| 1. Render skeleton + default preview | 2.0 | Page renders DEFAULT_CONFIG statusline. Hand-copy hud-schema + mergeConfig. Visual style locked in. **No editing yet.** |
| 2. Pinia store + Layout tab | 2.0 | First editable tab. Form primitives in place. Store invariants tested (unknown fields survive). |
| 3. Remaining tabs | 3.0 | Elements (with MergeGroupEditor), Git, Display (subgrouped), Thresholds, Colors (last — ColorPicker is complex), RawJson (textarea) |
| 4. IO + Presets | 1.5 | Import/Export buttons + preset library + load-confirm dialog |
| 5. URL sharing | 1.0 | url-codec + ShareButton + hash boot integration |
| 6. Diagnostics | 1.0 | Diagnostic[] generation + inline field hints + ValidationBanner |
| 7. i18n | 1.0 | en/zh keysets + language toggle |
| 8. Deploy + README | 0.5 | GH Pages workflow + screenshots/GIFs + contract test in CI |

**Total: ~12.5 days** for a single developer. Each phase ships as its own PR.

## v1 Preset Library

Six presets ship with v1. Each stored as `Partial<HudConfig>`:

| Preset | Pitch | Key fields |
|---|---|---|
| **Default** | Upstream defaults | empty (= DEFAULT_CONFIG) |
| **Minimal** | Model + project + context only | `elementOrder: [project, context]`; most `show*: false` |
| **Full-featured** | Everything visible | all `show*: true`; `showSeparators: true` |
| **CJK optimized** | Chinese users | `language: 'zh'`; `pathLevels: 1`; `lineLayout: 'compact'`; CJK-safe bar chars |
| **Dev mode** | Cost / duration / speed / tokens / version | enable `showCost`, `showDuration`, `showSpeed`, `showTokenBreakdown`, `showClaudeCodeVersion`, `showSessionTokens` |
| **Compact one-liner** | Single-line dense layout | `lineLayout: 'compact'`; all mergeGroups enabled |

## Open Questions (defer to plan or v1.5)

- Whether the contract test should block CI initially, or warn-only until we get a feel for upstream cadence — **default: warn-only, promote to blocking after one upstream release cycle.**
- Whether to support drag-reorder within `mergeGroups` (chips draggable across groups) or simple add/remove — **default: drag, since SortableList already exists.**
- LZ-string vs pako for URL hash — **default: LZ-string (smaller for JSON-heavy text, simpler API).**

## v1.5+ Backlog

- Undo/redo stack
- CodeMirror for Raw JSON tab (syntax highlight)
- Adjustable mock context (sliders to test warning/critical color states)
- E2E with Playwright
- A11y audit + axe-core CI
- Visual regression (Chromatic / Percy)
- Multi-version selector (pick claude-hud version → load corresponding schema)
- "Diff against default" export (only non-default fields)
- Import directly from user transcript (parse claude-hud transcript-cache for true-to-life preview)
