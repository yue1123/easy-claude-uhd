# claude-hud Config Tool — Plan 04: Deploy + CI + Contract Test

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Prerequisite:** Plan 03 is complete and committed.

**Goal:** Ship the tool to the public — GitHub Pages deployment, CI pipeline (type-check, lint, tests, build), upstream-schema contract test, and a README with screenshots so people can find and use it.

**Architecture:** Static Vite build, GitHub Actions workflow that runs tests + builds + deploys to `gh-pages` branch. Contract test reads the user's local `~/.claude/plugins/marketplaces/claude-hud/src/config.ts` (when present) and verifies our hand-copied schema field set matches.

---

## File Structure (this plan)

```
.github/
└── workflows/
    └── ci.yml                                    # NEW
vite.config.ts                                    # MODIFIED — set base for GH Pages
tsconfig.app.json                                 # MODIFIED — include tests
README.md                                         # REWRITTEN
public/
└── og-preview.png                                # NEW (manually captured screenshot, optional)

tests/
└── contract/
    └── upstream-schema.test.ts                   # NEW

src/
└── lib/
    └── hud-schema.ts                             # No change — referenced by contract test
```

---

## Task 1: Vite base path for GitHub Pages

**Files:**
- Modify: `vite.config.ts`

GitHub Pages serves project sites under `https://<user>.github.io/<repo>/`. Vite needs `base: '/claude-uhd-cc/'` for assets to resolve.

- [ ] **Step 1: Read existing vite.config.ts**

```bash
cat /Users/dh/Desktop/code/claude-uhd-cc/vite.config.ts
```

- [ ] **Step 2: Edit vite.config.ts**

Replace the file (preserve any existing plugins/aliases — the snippet below is the canonical scaffold; merge with what's there):

```typescript
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

export default defineConfig({
  base: process.env.GITHUB_PAGES === 'true' ? '/claude-uhd-cc/' : '/',
  plugins: [vue(), vueDevTools()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
```

- [ ] **Step 3: Verify local dev still works**

```bash
pnpm dev
```

Expected: page loads at `/` as before. Stop with Ctrl+C.

- [ ] **Step 4: Verify GH Pages build path**

```bash
GITHUB_PAGES=true pnpm build
grep -o 'src="/claude-uhd-cc/' dist/index.html | head -1
```

Expected: at least one match (assets prefixed with the repo path).

- [ ] **Step 5: Commit**

```bash
git add vite.config.ts
git commit -m "chore(build): conditional base path for GitHub Pages"
```

---

## Task 2: GitHub Actions CI + deploy workflow

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create the directory + file**

```bash
mkdir -p /Users/dh/Desktop/code/claude-uhd-cc/.github/workflows
```

Then create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm type-check
      - run: pnpm test:run

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: GITHUB_PAGES=true pnpm build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    if: github.ref == 'refs/heads/main'
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: GitHub Actions — lint + type-check + test + build + deploy"
```

- [ ] **Step 3: Note for the user**

GitHub Pages must be enabled for the repo (Settings → Pages → Source: "GitHub Actions") for the deploy step to succeed on first push. Leave a TODO note in the README task below.

---

## Task 3: Upstream schema contract test

**Files:**
- Create: `tests/contract/upstream-schema.test.ts`

Reads upstream `config.ts` if present, extracts the `HudConfig` field names, and compares against our hand-copied set. Failure prints a clear diff. Skips silently if upstream isn't installed.

- [ ] **Step 1: Create tests/contract/upstream-schema.test.ts**

```typescript
import { describe, it, expect } from 'vitest'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { DEFAULT_CONFIG } from '@/lib/hud-schema'

const UPSTREAM_PATH = path.join(
  os.homedir(),
  '.claude/plugins/marketplaces/claude-hud/src/config.ts',
)

function hasUpstream(): boolean {
  try {
    return fs.statSync(UPSTREAM_PATH).isFile()
  } catch {
    return false
  }
}

function extractInterfaceFields(source: string, interfaceName: string): string[] {
  const re = new RegExp(`export interface ${interfaceName}\\s*\\{([\\s\\S]*?)\\n\\}`)
  const match = source.match(re)
  if (!match) return []
  const body = match[1]
  const fields: string[] = []
  for (const line of body.split('\n')) {
    const m = line.trim().match(/^([a-zA-Z_][a-zA-Z0-9_]*)\??\s*:/)
    if (m) fields.push(m[1])
  }
  return fields
}

function localFields(): { top: string[]; display: string[]; gitStatus: string[]; colors: string[] } {
  return {
    top: Object.keys(DEFAULT_CONFIG).sort(),
    display: Object.keys(DEFAULT_CONFIG.display).sort(),
    gitStatus: Object.keys(DEFAULT_CONFIG.gitStatus).sort(),
    colors: Object.keys(DEFAULT_CONFIG.colors).sort(),
  }
}

const skip = !hasUpstream()

describe.skipIf(skip)('upstream-schema contract', () => {
  const source = hasUpstream() ? fs.readFileSync(UPSTREAM_PATH, 'utf-8') : ''

  it('HudConfig top-level fields match upstream', () => {
    const upstream = extractInterfaceFields(source, 'HudConfig').sort()
    const ours = localFields().top
    expect(ours).toEqual(upstream)
  })

  it('HudDisplayConfig fields match upstream', () => {
    const upstream = extractInterfaceFields(source, 'HudDisplayConfig').sort()
    const ours = localFields().display
    expect(ours).toEqual(upstream)
  })

  it('HudColorOverrides fields match upstream', () => {
    const upstream = extractInterfaceFields(source, 'HudColorOverrides').sort()
    const ours = localFields().colors
    expect(ours).toEqual(upstream)
  })
})
```

- [ ] **Step 2: Run the test (will skip if upstream isn't installed)**

```bash
pnpm test:run -- contract
```

Expected (on a dev machine with claude-hud installed):
- Either all 3 contract tests PASS — schema in sync
- Or one fails with a useful diff — schema drift! Update `src/lib/hud-schema.ts` accordingly.

On CI (where upstream isn't installed), all 3 will be marked SKIPPED.

- [ ] **Step 3: Commit**

```bash
git add tests/contract/upstream-schema.test.ts
git commit -m "test(contract): upstream schema drift check (skip when not installed)"
```

---

## Task 4: README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Replace README.md**

```markdown
# claude-hud config tool

Visual configuration editor for [claude-hud](https://github.com/jarrodwatts/claude-hud), the Claude Code statusline plugin.

- **Live preview** — see the statusline update as you toggle every option
- **Zero backend** — pure static site, your config never leaves your browser
- **Round-trips safely** — unknown fields you've set by hand are preserved on export
- **Sharable** — copy a link that embeds your config (no server required)
- **EN / ZH** — bilingual UI

## Use it

Open the hosted site (link added after first GH Pages deploy) or run locally:

```sh
pnpm install
pnpm dev
```

## How it works

The editor reads upstream claude-hud's `HudConfig` schema and offers a form for every field, organized into 7 tabs:

| Tab | What's in it |
|---|---|
| Layout | `lineLayout`, `pathLevels`, `maxWidth`, `elementOrder`, separators |
| Elements | All `show*` toggles + `mergeGroups` |
| Git | `gitStatus.*` |
| Display | `contextValue`, `usageValue`, model format, time format, prompt cache, external usage, custom line |
| Thresholds | All `*Threshold` sliders |
| Colors | 11 color overrides + bar characters |
| Raw JSON | Direct JSON editing (escape hatch) |

The preview uses a fixed mock context (token usage = 58%, git = `main +3`, etc.) so you can see how thresholds and color overrides behave without needing a real Claude Code session.

## Round-trip guarantee

Importing your `config.json`, editing visually, and exporting back is lossless — including fields the editor doesn't know about. The store keeps the original raw JSON as the source of truth; the parsed (validated) config drives the preview and form display.

## Development

```sh
pnpm install
pnpm dev               # dev server
pnpm test              # vitest watch
pnpm test:run          # one-shot
pnpm type-check        # vue-tsc
pnpm lint              # oxlint + eslint
pnpm build             # static build → dist/
```

The schema is hand-copied from `~/.claude/plugins/marketplaces/claude-hud/src/config.ts`. A contract test in `tests/contract/upstream-schema.test.ts` verifies the field sets stay in sync (skipped automatically on machines without claude-hud installed).

## Deployment

A GitHub Actions workflow at `.github/workflows/ci.yml` runs CI on every push and deploys `main` to GitHub Pages.

**One-time setup:** in GitHub Settings → Pages → Source, select **"GitHub Actions"**.

## License

MIT.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: README with feature list + dev/deploy notes"
```

---

## Task 5: Final verification + push

**Files:** none

- [ ] **Step 1: Full local pipeline**

```bash
cd /Users/dh/Desktop/code/claude-uhd-cc
pnpm type-check && pnpm lint && pnpm test:run && pnpm build
```

Expected: all four steps green. `dist/` is built.

- [ ] **Step 2: Check the build output works**

```bash
pnpm preview
```

Expected: `pnpm preview` serves `dist/` at `http://localhost:4173`. Visit, smoke-test the full app. Stop with Ctrl+C.

- [ ] **Step 3: Confirm git state**

```bash
git status
git log --oneline -20
```

Expected: clean tree, recent commits cover Plans 01-04.

- [ ] **Step 4: Tag**

```bash
git tag v1.0.0
```

- [ ] **Step 5: Add remote + push (user must create the GitHub repo first)**

Tell the user:

> 1. Create an empty repo at `https://github.com/<you>/claude-uhd-cc`
> 2. In repo Settings → Pages → Source, choose **"GitHub Actions"**
> 3. Run these commands (replacing `<you>`):
>
>    ```bash
>    git remote add origin git@github.com:<you>/claude-uhd-cc.git
>    git push -u origin main
>    git push --tags
>    ```
>
> 4. Watch the Actions tab — first deploy takes ~2 minutes
> 5. Visit `https://<you>.github.io/claude-uhd-cc/`

---

## Self-review notes

- CI runs lint, type-check, unit + component + store tests on every push/PR.
- Contract test runs but skips gracefully when upstream isn't installed (CI workers don't have claude-hud).
- Deploy step is `main`-only and gated on a green build.
- Vite `base` is conditional on `GITHUB_PAGES=true`, so local dev still works on `/`.
- README documents the round-trip guarantee, contract-test design, and the GitHub Pages setup step.

**End state of Plan 04:** App is publicly deployable. Pushing to `main` triggers CI; passing builds deploy to GitHub Pages automatically. Contract test alerts dev to upstream schema drift on machines that have the plugin installed.

---

## Post-launch backlog

Not part of v1, but worth tracking:

- Undo / redo stack
- CodeMirror for Raw JSON (syntax highlight)
- Adjustable mock context (sliders to test warning/critical states without changing thresholds)
- Playwright E2E for golden path
- Axe-core a11y CI check
- Visual regression (Chromatic / Percy)
- Schema version selector (pick claude-hud version → load matching schema)
- "Diff against default" export (only non-default fields)
- Import from real claude-hud transcript-cache (true-to-life preview)
- Auto-PR upstream when contract test detects a new field (`gh pr create` hook)
