# Preset Configs Redesign

**Date:** 2026-07-12
**Status:** Approved (pending spec review)

## Goal

Replace the current 6 presets in `src/stores/presets.ts` with a curated set of **7 style presets + a `Default` reset baseline**, informed by how the open-source community actually configures Claude Code statuslines. Each preset maps a recurring community "persona" onto real `claude-hud` config fields.

## Background / Research

Community tooling (`sirmalloc/ccstatusline`, `Owloops/claude-powerline`, `ccusage` statusline mode, and multiple blog articles) converges on a small set of usage personas:

- **A. Minimalist** — model + project/branch + context only. "5 fields beat 10."
- **B. Developer / git-centric** — branch, dirty/ahead-behind, file stats, repo path; cost/usage secondary.
- **C. Cost / usage-limit tracker** — cost, context bar, 5-hour session-limit bar + reset time, 7-day quota, with green/yellow/red thresholds. Most-written-about persona; currently missing as a dedicated preset.
- **D. Power user / everything** — multi-line: token breakdown, cache efficiency, speed, tool/skill/mcp/agent counts, memory, compactions.
- **E. Powerline / aesthetic** — differentiated by layout + color, not info. `claude-hud` can't do true Nerd-Font powerline, so this is adapted to a themed compact + merge-group line.
- **F. Speed / efficiency** — throughput, cache hit rate, token breakdown (smaller niche).

**Threshold consensus baked into usage-aware presets:** context green <50% / yellow 50–79% / red ≥80%; quota / 7-day bars turn warning at ≥90%.

Reference sources (recorded from research for this task): ccstatusline (github.com/sirmalloc/ccstatusline), claude-powerline (github.com/Owloops/claude-powerline), ccusage statusline (ccusage.com/guide/statusline), cost-in-one-line blog (julianpaul.me), worktree statusline blog (dandoescode.com), official docs (code.claude.com/docs/en/statusline).

## Current state

`src/stores/presets.ts` exports `PRESETS: Preset[]` with ids: `default`, `minimal`, `full-featured`, `cjk`, `dev-mode`, `compact-oneliner`.

Each `Preset` is `{ id, labelKey, descriptionKey, config: Partial<HudConfig> & JsonObject }`. `PresetMenu.vue` calls `store.setRawJson(p.config)`, and the config store / preview engine **deep-merges** the partial config over upstream `DEFAULT_CONFIG` (confirmed by the existing `minimal` preset, which shows `model` despite never setting `showModel`). Therefore each preset only needs to specify **overrides**; unspecified fields fall back to defaults.

Relevant upstream defaults (`vendor/claude-hud/src/config.ts`, pinned v0.3.0): `showContextBar: true`, `showUsage: true`, `usageBarEnabled: true`, `showResetLabel: true`, `showTokenBreakdown: true`, `showModel/showProject: true`; `showCost/showDuration/showSpeed: false`; `tools/skills/mcp/agents/todos: false`; `contextWarningThreshold: 70`, `contextCriticalThreshold: 85`, `usageThreshold: 0`, `sevenDayThreshold: 80`; colors default `context: green`, `usage: brightBlue`, `barFilled: █`, `barEmpty: ░`.

**Field placement (from `vendor/claude-hud/src/config.ts` `HudConfig`):** top-level = `language`, `lineLayout`, `showSeparators`, `pathLevels`, `maxWidth`, `forceMaxWidth`, `elementOrder`, `gitStatus` (object), `colors` (object). Everything else — including `modelFormat`, `timeFormat`, `showSessionStartDate`, `mergeGroups`, `contextWarningThreshold`, `contextCriticalThreshold`, `usageThreshold`, `sevenDayThreshold` — lives under `display`.

## New preset lineup

Menu order = `Default` first (reset baseline), then the 7 styles below.

### 0. `default` — Default (kept)
Reset baseline. `config: {}`. Description: "Upstream defaults — equivalent to an empty config".

### 1. `minimal` — Minimal
Persona A. Model + project + context, single compact line.
```ts
{
  lineLayout: 'compact',
  elementOrder: ['project', 'context'],
  display: { showTokenBreakdown: false, showUsage: false },
}
```

### 2. `developer` — Developer
Persona B. Git-centric.
```ts
{
  pathLevels: 2,
  elementOrder: ['project', 'context', 'sessionTime'],
  gitStatus: { enabled: true, showDirty: true, showAheadBehind: true, showFileStats: true },
  display: { modelFormat: 'short', showUsage: false, showTokenBreakdown: false },
}
```

### 3. `cost-usage` — Cost & Usage Tracker (NEW)
Persona C. The research-motivated addition.
```ts
{
  elementOrder: ['project', 'context', 'usage', 'sessionTime'],
  display: {
    showCost: true,
    showContextBar: true,
    showUsage: true,
    usageBarEnabled: true,
    showResetLabel: true,
    showTokenBreakdown: false,
    showSessionStartDate: true,
    timeFormat: 'both',
    contextWarningThreshold: 50,
    contextCriticalThreshold: 80,
    usageThreshold: 90,
    sevenDayThreshold: 90,
  },
}
```
Threshold values follow community consensus (context 50/80, quota & 7-day 90) rather than upstream defaults.

### 4. `power-user` — Power User
Persona D. Replaces `full-featured` + folds in `dev-mode`.
```ts
{
  lineLayout: 'expanded',
  showSeparators: true,
  gitStatus: { showAheadBehind: true, showFileStats: true },
  display: {
    showCost: true, showDuration: true, showSpeed: true,
    showTokenBreakdown: true, showSessionTokens: true,
    showClaudeCodeVersion: true, showEffortLevel: true, showOutputStyle: true,
    showProvider: true, showAdvisor: true,
    showTools: true, showSkills: true, showMcp: true,
    showAgents: true, showTodos: true, showConfigCounts: true,
    showMemoryUsage: true, showPromptCache: true, showCompactions: true,
    showSessionStartDate: true, showLastResponseAt: true,
  },
}
```

### 5. `cjk` — CJK Compact (kept)
Chinese users.
```ts
{
  language: 'zh',
  pathLevels: 1,
  lineLayout: 'compact',
  colors: { barFilled: '#', barEmpty: '-' },
}
```

### 6. `aesthetic` — Aesthetic (themed one-liner)
Persona E adapted + folds in `compact-oneliner`.
```ts
{
  lineLayout: 'compact',
  showSeparators: true,
  display: {
    showCost: true,
    showTokenBreakdown: false,
    mergeGroups: [['context', 'usage'], ['tools', 'skills', 'mcp', 'agents']],
  },
  colors: {
    context: 'green', usage: 'cyan', model: 'brightMagenta',
    project: 'brightBlue', gitBranch: 'yellow',
    barFilled: '▓', barEmpty: '░',
  },
}
```

### 7. `efficiency` — Efficiency / Speed
Persona F.
```ts
{
  lineLayout: 'compact',
  elementOrder: ['project', 'context', 'promptCache', 'usage'],
  display: {
    showSpeed: true, showDuration: true,
    showTokenBreakdown: true, showPromptCache: true, showSessionTokens: true,
    showCost: true, showUsage: false,
  },
}
```

## i18n

`src/i18n/en.ts` and `src/i18n/zh.ts` each have a `presets` block keyed by camelCase preset name. Update to the new keys:

- Remove: `fullFeatured`, `devMode`, `compactOneliner`.
- Keep: `default`, `minimal`, `cjk` (revise descriptions to match new configs).
- Add: `developer`, `costUsage`, `powerUser`, `aesthetic`, `efficiency`.

`labelKey` / `descriptionKey` in `presets.ts` reference `presets.<camelCaseId>.label|description`. Id → i18n-key mapping: `cost-usage` → `presets.costUsage.*`, `power-user` → `presets.powerUser.*`; others match directly. Each preset needs an EN and ZH label + one-line description in the same tone as existing entries.

## Files touched

1. `src/stores/presets.ts` — replace `PRESETS` array.
2. `src/i18n/en.ts` — rewrite `presets` block.
3. `src/i18n/zh.ts` — rewrite `presets` block.
4. Tests — if any test references removed preset ids (`full-featured`, `dev-mode`, `compact-oneliner`) or their i18n keys, update them.

## Testing / verification

- `pnpm test` passes (adjust any preset-id assertions).
- `pnpm build` / typecheck passes — all `display` keys used must exist on the `HudConfig` type; verify field placement (esp. `timeFormat`, `modelFormat`, `showSessionStartDate`, `mergeGroups`) against `src/lib/hud-schema.ts` re-exports and `vendor/claude-hud/src/config.ts`.
- Manual: open the app, apply each of the 8 menu entries, confirm the live preview renders the intended style and no diagnostics fire for unknown fields.

## Out of scope

- No changes to `PresetMenu.vue` UI (it renders `PRESETS` generically).
- No new schema fields; presets only use existing `HudConfig` options.
- No true Nerd-Font powerline styling (unsupported by `claude-hud`).
