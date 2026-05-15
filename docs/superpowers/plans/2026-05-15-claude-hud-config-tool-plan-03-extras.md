# claude-hud Config Tool — Plan 03: IO + Presets + URL Share + Diagnostics + i18n

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Prerequisite:** Plan 02 is complete and committed.

**Goal:** Round out v1 features — JSON import/export, preset library, URL-hash sharing, inline validation hints, bilingual UI.

**Architecture:** Each feature is mostly additive — new components on the topbar (`ImportButton`, `ExportButton`, `ShareButton`, `PresetMenu`, language toggle), a new `lib/url-codec.ts`, a `lib/diagnostics.ts` that walks `rawJson` vs `parsedConfig` and produces `Diagnostic[]`, and a `vue-i18n` instance with en/zh keysets.

**Out of scope:** Deployment / CI / contract test — those land in Plan 04.

---

## File Structure (this plan)

```
src/
├── App.vue                                 # MODIFIED — extend topbar, add ValidationBanner
├── main.ts                                 # MODIFIED — install vue-i18n
├── lib/
│   ├── url-codec.ts                        # NEW — rawJson <-> URL hash
│   └── diagnostics.ts                      # NEW — Diagnostic[] generator
├── stores/
│   ├── presets.ts                          # NEW — built-in preset list
│   └── ui.ts                               # NEW — current tab, language, dialog state
├── components/
│   ├── shell/
│   │   └── ValidationBanner.vue            # NEW
│   ├── form/
│   │   └── FieldRow.vue                    # MODIFIED — show inline diagnostic
│   └── io/
│       ├── ImportButton.vue                # NEW
│       ├── ExportButton.vue                # NEW
│       ├── ShareButton.vue                 # NEW
│       ├── PresetMenu.vue                  # NEW
│       └── ConfirmDialog.vue               # NEW — reusable replace-config confirm
└── i18n/
    ├── index.ts                            # NEW — vue-i18n setup
    ├── en.ts                               # NEW
    └── zh.ts                               # NEW

tests/
├── unit/
│   ├── url-codec.test.ts                   # NEW
│   └── diagnostics.test.ts                 # NEW
├── stores/
│   └── presets.test.ts                     # NEW
└── components/
    ├── ImportButton.test.ts                # NEW
    ├── ExportButton.test.ts                # NEW
    ├── PresetMenu.test.ts                  # NEW
    └── ValidationBanner.test.ts            # NEW
```

---

## Task 1: Install `lz-string` + `vue-i18n`

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install**

```bash
cd /Users/dh/Desktop/code/claude-uhd-cc
pnpm add lz-string vue-i18n@11
```

- [ ] **Step 2: Verify**

```bash
grep -E '"(lz-string|vue-i18n)"' package.json
```

Expected: both deps appear under `dependencies`.

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add lz-string + vue-i18n"
```

---

## Task 2: `url-codec`

**Files:**
- Create: `src/lib/url-codec.ts`
- Test: `tests/unit/url-codec.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/url-codec.test.ts
import { describe, it, expect } from 'vitest'
import { encodeConfig, decodeConfig } from '@/lib/url-codec'

describe('url-codec', () => {
  it('round-trips an empty object', () => {
    const encoded = encodeConfig({})
    expect(decodeConfig(encoded)).toEqual({})
  })

  it('round-trips a typical config', () => {
    const input = { lineLayout: 'compact', display: { contextValue: 'tokens' } }
    expect(decodeConfig(encodeConfig(input))).toEqual(input)
  })

  it('preserves unknown fields', () => {
    const input = { foo: 'bar', display: { futureField: 42 } }
    expect(decodeConfig(encodeConfig(input))).toEqual(input)
  })

  it('encoded string is URL-safe (no #, ?, &, =)', () => {
    const encoded = encodeConfig({ a: 1, b: 'hello world' })
    expect(encoded).not.toMatch(/[#?&=]/)
  })

  it('decode returns null for empty input', () => {
    expect(decodeConfig('')).toBeNull()
  })

  it('decode returns null for garbage', () => {
    expect(decodeConfig('not-valid-lz-base64')).toBeNull()
  })

  it('decode returns null when decompressed content is not JSON', () => {
    // Manually compress non-JSON, encode through the same pipeline
    // Easiest: just feed a string that would decompress to something invalid
    expect(decodeConfig('!!!')).toBeNull()
  })
})
```

- [ ] **Step 2: Run, verify it fails**

```bash
pnpm test:run -- url-codec
```

- [ ] **Step 3: Create src/lib/url-codec.ts**

```typescript
import LZString from 'lz-string'
import type { JsonObject } from '@/lib/path-set'

export function encodeConfig(rawJson: JsonObject): string {
  return LZString.compressToEncodedURIComponent(JSON.stringify(rawJson))
}

export function decodeConfig(encoded: string): JsonObject | null {
  if (!encoded) return null
  let decompressed: string | null
  try {
    decompressed = LZString.decompressFromEncodedURIComponent(encoded)
  } catch {
    return null
  }
  if (decompressed === null) return null
  try {
    const parsed = JSON.parse(decompressed)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null
    return parsed as JsonObject
  } catch {
    return null
  }
}
```

- [ ] **Step 4: Run tests, verify all pass**

```bash
pnpm test:run -- url-codec
```

Expected: `7 passed`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/url-codec.ts tests/unit/url-codec.test.ts
git commit -m "feat(lib): url-codec via LZ-string + JSON validation"
```

---

## Task 3: Hook URL hash into store boot

**Files:**
- Modify: `src/stores/config.ts`
- Modify: `src/main.ts`

The store should optionally accept an initial `rawJson` (from URL hash on app boot) and write back to the URL on changes (debounced).

- [ ] **Step 1: Update src/stores/config.ts**

Replace the file:

```typescript
import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import type { HudConfig } from '@/lib/hud-schema'
import { mergeConfig } from '@/lib/merge-config'
import { setPath, deletePath, getPath, type JsonObject } from '@/lib/path-set'
import { encodeConfig, decodeConfig } from '@/lib/url-codec'

const HASH_DEBOUNCE_MS = 500

export const useConfigStore = defineStore('config', () => {
  const rawJson = ref<JsonObject>({})
  const lastHashWrite = ref(0)
  let hashTimer: number | null = null

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

  function loadFromHash(): void {
    if (typeof window === 'undefined') return
    const hash = window.location.hash.replace(/^#/, '')
    if (!hash) return
    const decoded = decodeConfig(hash)
    if (decoded) rawJson.value = decoded
  }

  function startHashSync(): void {
    if (typeof window === 'undefined') return
    watch(rawJson, (next) => {
      if (hashTimer !== null) window.clearTimeout(hashTimer)
      hashTimer = window.setTimeout(() => {
        const isEmpty = Object.keys(next).length === 0
        try {
          if (isEmpty) {
            history.replaceState(null, '', window.location.pathname + window.location.search)
          } else {
            history.replaceState(null, '', '#' + encodeConfig(next))
          }
          lastHashWrite.value = Date.now()
        } catch {
          // ignore — URL sync is best-effort
        }
      }, HASH_DEBOUNCE_MS)
    }, { deep: true })
  }

  return {
    rawJson, parsedConfig, lastHashWrite,
    patchField, clearField, readField, setRawJson, reset,
    loadFromHash, startHashSync,
  }
})
```

- [ ] **Step 2: Update src/main.ts**

```typescript
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import './style.css'
import { useConfigStore } from '@/stores/config'

const app = createApp(App)
app.use(createPinia())

const store = useConfigStore()
store.loadFromHash()
store.startHashSync()

app.mount('#app')
```

- [ ] **Step 3: Re-run existing store tests, verify still passing**

```bash
pnpm test:run -- stores/config
```

Expected: 8 passed (the original tests should not have regressed — `loadFromHash` and `startHashSync` are no-ops in jsdom without a hash).

- [ ] **Step 4: Manual smoke**

```bash
pnpm dev
```

In the browser, open dev tools, change `pathLevels` to 3, then look at `window.location.hash` — should populate after ~500 ms. Reload page — pathLevels should still be 3.

- [ ] **Step 5: Commit**

```bash
git add src/stores/config.ts src/main.ts
git commit -m "feat(stores): wire URL hash boot + debounced writeback"
```

---

## Task 4: ShareButton

**Files:**
- Create: `src/components/io/ShareButton.vue`
- Test: `tests/components/ShareButton.test.ts` (optional smoke)

- [ ] **Step 1: Create src/components/io/ShareButton.vue**

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useConfigStore } from '@/stores/config'
import { encodeConfig } from '@/lib/url-codec'

const store = useConfigStore()
const toast = ref<string | null>(null)
let toastTimer: number | null = null

function showToast(msg: string) {
  toast.value = msg
  if (toastTimer !== null) window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => { toast.value = null }, 2500)
}

async function share() {
  const hash = encodeConfig(store.rawJson)
  const url = `${window.location.origin}${window.location.pathname}#${hash}`
  const sizeHint = hash.length > 6000 ? ` (long: ${hash.length} chars)` : ''
  try {
    await navigator.clipboard.writeText(url)
    showToast('Link copied' + sizeHint)
  } catch {
    showToast('Copy failed — see console')
    console.error('Clipboard write failed; URL is:', url)
  }
}
</script>

<template>
  <div class="share-wrap">
    <button class="topbar-btn" type="button" @click="share">[ share ]</button>
    <span v-if="toast" class="toast">{{ toast }}</span>
  </div>
</template>

<style scoped>
.share-wrap { position: relative; }
.topbar-btn {
  background: transparent;
  border: 1px solid var(--border-dim);
  color: var(--fg-dim);
  font-family: var(--font-mono);
  font-size: 12px;
  padding: 3px 10px;
  cursor: pointer;
}
.topbar-btn:hover { color: var(--accent); border-color: var(--accent); }
.toast {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  background: var(--bg-elevated);
  border: 1px solid var(--accent);
  color: var(--accent);
  font-size: 11px;
  padding: 2px 8px;
  white-space: nowrap;
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/io/ShareButton.vue
git commit -m "feat(io): ShareButton — copy URL with config hash"
```

---

## Task 5: ConfirmDialog

**Files:**
- Create: `src/components/io/ConfirmDialog.vue`

Reusable "Yes / Cancel" modal. Used by Import and PresetMenu when rawJson is non-empty.

- [ ] **Step 1: Create src/components/io/ConfirmDialog.vue**

```vue
<script setup lang="ts">
defineProps<{
  open: boolean
  title: string
  message: string
  confirmLabel?: string
}>()
defineEmits<{ (e: 'confirm'): void; (e: 'cancel'): void }>()
</script>

<template>
  <div v-if="open" class="dialog-backdrop" @click.self="$emit('cancel')">
    <div class="dialog">
      <h3 class="dialog-title">{{ title }}</h3>
      <p class="dialog-message">{{ message }}</p>
      <div class="dialog-actions">
        <button class="btn-secondary" type="button" @click="$emit('cancel')">Cancel</button>
        <button class="btn-primary" type="button" @click="$emit('confirm')">{{ confirmLabel ?? 'Continue' }}</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dialog-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(5, 8, 17, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}
.dialog {
  background: var(--bg-base);
  border: 1px dashed var(--border-dash);
  padding: var(--space-4);
  max-width: 420px;
  font-family: var(--font-mono);
}
.dialog-title { margin: 0 0 var(--space-2); color: var(--accent); font-size: 14px; }
.dialog-message { margin: 0 0 var(--space-4); color: var(--fg-base); font-size: 12px; line-height: 1.55; }
.dialog-actions { display: flex; gap: var(--space-2); justify-content: flex-end; }
.btn-secondary, .btn-primary {
  background: transparent;
  border: 1px solid var(--border-dim);
  color: var(--fg-dim);
  font-family: var(--font-mono);
  font-size: 12px;
  padding: 4px 12px;
  cursor: pointer;
}
.btn-primary { color: var(--accent); border-color: var(--accent); }
.btn-secondary:hover { color: var(--fg-base); }
.btn-primary:hover { background: var(--accent); color: var(--bg-base); }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/io/ConfirmDialog.vue
git commit -m "feat(io): ConfirmDialog — reusable yes/cancel modal"
```

---

## Task 6: ImportButton

**Files:**
- Create: `src/components/io/ImportButton.vue`
- Test: `tests/components/ImportButton.test.ts`

Accepts file drop, file picker, or pasted text. Validates JSON. Confirms before overwriting non-empty state.

- [ ] **Step 1: Write the failing test**

```typescript
// tests/components/ImportButton.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import ImportButton from '@/components/io/ImportButton.vue'
import { useConfigStore } from '@/stores/config'

describe('ImportButton', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('renders an [ import ] button', () => {
    const w = mount(ImportButton)
    expect(w.text()).toContain('import')
  })

  it('opens a modal when clicked', async () => {
    const w = mount(ImportButton)
    await w.find('button').trigger('click')
    expect(w.find('textarea').exists()).toBe(true)
  })

  it('pasting valid JSON and confirming updates store', async () => {
    const store = useConfigStore()
    const w = mount(ImportButton)
    await w.find('button').trigger('click')
    await w.find('textarea').setValue('{"lineLayout": "compact"}')
    const buttons = w.findAll('button')
    const apply = buttons.find(b => b.text().toLowerCase().includes('apply'))!
    await apply.trigger('click')
    expect(store.rawJson).toEqual({ lineLayout: 'compact' })
  })

  it('invalid JSON shows error and does not update store', async () => {
    const store = useConfigStore()
    store.setRawJson({ pathLevels: 2 })
    const w = mount(ImportButton)
    await w.find('button').trigger('click')
    await w.find('textarea').setValue('{')
    const apply = w.findAll('button').find(b => b.text().toLowerCase().includes('apply'))!
    await apply.trigger('click')
    expect(store.rawJson).toEqual({ pathLevels: 2 })
    expect(w.find('.error').exists()).toBe(true)
  })
})
```

- [ ] **Step 2: Run, verify it fails**

```bash
pnpm test:run -- ImportButton
```

- [ ] **Step 3: Create src/components/io/ImportButton.vue**

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useConfigStore } from '@/stores/config'
import type { JsonObject } from '@/lib/path-set'

const store = useConfigStore()

const open = ref(false)
const draft = ref('')
const error = ref<string | null>(null)

function openModal() {
  draft.value = ''
  error.value = null
  open.value = true
}

function closeModal() {
  open.value = false
}

async function onFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  if (file.size > 1024 * 1024) {
    error.value = 'File too large (>1 MB)'
    return
  }
  draft.value = await file.text()
}

function onDrop(e: DragEvent) {
  e.preventDefault()
  const file = e.dataTransfer?.files?.[0]
  if (!file) return
  if (file.size > 1024 * 1024) {
    error.value = 'File too large (>1 MB)'
    return
  }
  file.text().then(text => { draft.value = text })
}

function apply() {
  let parsed: unknown
  try {
    parsed = JSON.parse(draft.value || '{}')
  } catch (e) {
    error.value = (e as Error).message
    return
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    error.value = 'Config must be a JSON object'
    return
  }
  store.setRawJson(parsed as JsonObject)
  open.value = false
}
</script>

<template>
  <span class="import-wrap">
    <button class="topbar-btn" type="button" @click="openModal">[ import ]</button>

    <div v-if="open" class="modal-backdrop" @click.self="closeModal">
      <div class="modal" @dragover.prevent @drop="onDrop">
        <h3 class="title">Import config.json</h3>
        <p class="hint">Paste JSON below, drag a file in, or pick one. Existing config will be replaced.</p>
        <input type="file" accept="application/json,.json" @change="onFile" />
        <textarea v-model="draft" spellcheck="false" />
        <p v-if="error" class="error">⚠ {{ error }}</p>
        <div class="actions">
          <button class="btn-secondary" type="button" @click="closeModal">Cancel</button>
          <button class="btn-primary" type="button" @click="apply">Apply</button>
        </div>
      </div>
    </div>
  </span>
</template>

<style scoped>
.import-wrap { position: relative; }
.topbar-btn {
  background: transparent;
  border: 1px solid var(--border-dim);
  color: var(--fg-dim);
  font-family: var(--font-mono);
  font-size: 12px;
  padding: 3px 10px;
  cursor: pointer;
}
.topbar-btn:hover { color: var(--accent); border-color: var(--accent); }
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(5, 8, 17, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}
.modal {
  background: var(--bg-base);
  border: 1px dashed var(--border-dash);
  padding: var(--space-4);
  width: min(520px, 90vw);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.title { margin: 0; color: var(--accent); font-size: 14px; }
.hint { margin: 0; color: var(--fg-dim); font-size: 11px; }
input[type=file] { color: var(--fg-dim); font-size: 11px; }
textarea {
  background: var(--bg-deep);
  color: var(--fg-bright);
  border: 1px solid var(--border-dim);
  padding: var(--space-2);
  font-family: var(--font-mono);
  font-size: 12px;
  min-height: 220px;
  resize: vertical;
}
.error { color: var(--accent-bad); font-size: 12px; margin: 0; }
.actions { display: flex; gap: var(--space-2); justify-content: flex-end; }
.btn-secondary, .btn-primary {
  background: transparent;
  border: 1px solid var(--border-dim);
  color: var(--fg-dim);
  font-family: var(--font-mono);
  font-size: 12px;
  padding: 4px 12px;
  cursor: pointer;
}
.btn-primary { color: var(--accent); border-color: var(--accent); }
</style>
```

- [ ] **Step 4: Run tests, verify all pass**

```bash
pnpm test:run -- ImportButton
```

Expected: `4 passed`.

- [ ] **Step 5: Commit**

```bash
git add src/components/io/ImportButton.vue tests/components/ImportButton.test.ts
git commit -m "feat(io): ImportButton — paste/drag/pick JSON"
```

---

## Task 7: ExportButton

**Files:**
- Create: `src/components/io/ExportButton.vue`

- [ ] **Step 1: Create src/components/io/ExportButton.vue**

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useConfigStore } from '@/stores/config'

const store = useConfigStore()
const toast = ref<string | null>(null)
let toastTimer: number | null = null

function showToast(msg: string) {
  toast.value = msg
  if (toastTimer !== null) window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => { toast.value = null }, 2000)
}

function download() {
  const blob = new Blob([JSON.stringify(store.rawJson, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'config.json'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  showToast('Downloaded')
}

async function copyToClipboard() {
  const text = JSON.stringify(store.rawJson, null, 2)
  try {
    await navigator.clipboard.writeText(text)
    showToast('Copied to clipboard')
  } catch {
    showToast('Copy failed — see console')
    console.error('Clipboard write failed; JSON is:', text)
  }
}
</script>

<template>
  <div class="export-wrap">
    <button class="topbar-btn" type="button" @click="download">[ export ]</button>
    <button class="topbar-btn" type="button" @click="copyToClipboard" title="Copy JSON to clipboard">[ copy ]</button>
    <span v-if="toast" class="toast">{{ toast }}</span>
  </div>
</template>

<style scoped>
.export-wrap { position: relative; display: inline-flex; gap: 4px; }
.topbar-btn {
  background: transparent;
  border: 1px solid var(--border-dim);
  color: var(--fg-dim);
  font-family: var(--font-mono);
  font-size: 12px;
  padding: 3px 10px;
  cursor: pointer;
}
.topbar-btn:hover { color: var(--accent); border-color: var(--accent); }
.toast {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  background: var(--bg-elevated);
  border: 1px solid var(--accent);
  color: var(--accent);
  font-size: 11px;
  padding: 2px 8px;
  white-space: nowrap;
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/io/ExportButton.vue
git commit -m "feat(io): ExportButton — download + clipboard"
```

---

## Task 8: Preset library

**Files:**
- Create: `src/stores/presets.ts`
- Test: `tests/stores/presets.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/stores/presets.test.ts
import { describe, it, expect } from 'vitest'
import { PRESETS } from '@/stores/presets'

describe('presets', () => {
  it('has 6 presets', () => {
    expect(PRESETS).toHaveLength(6)
  })

  it('each preset has id, label, config', () => {
    for (const p of PRESETS) {
      expect(p.id).toBeTruthy()
      expect(p.label).toBeTruthy()
      expect(typeof p.config).toBe('object')
    }
  })

  it('Default preset is the empty config', () => {
    expect(PRESETS[0].id).toBe('default')
    expect(PRESETS[0].config).toEqual({})
  })

  it('Full-featured has showCost, showDuration, showSpeed', () => {
    const full = PRESETS.find(p => p.id === 'full-featured')!
    expect((full.config.display as any)?.showCost).toBe(true)
    expect((full.config.display as any)?.showDuration).toBe(true)
    expect((full.config.display as any)?.showSpeed).toBe(true)
  })

  it('CJK preset has language=zh', () => {
    const cjk = PRESETS.find(p => p.id === 'cjk')!
    expect(cjk.config.language).toBe('zh')
  })
})
```

- [ ] **Step 2: Run, verify it fails**

```bash
pnpm test:run -- presets
```

- [ ] **Step 3: Create src/stores/presets.ts**

```typescript
import type { HudConfig } from '@/lib/hud-schema'
import type { JsonObject } from '@/lib/path-set'

export interface Preset {
  id: string
  label: string
  description: string
  config: Partial<HudConfig> & JsonObject
}

export const PRESETS: Preset[] = [
  {
    id: 'default',
    label: 'Default',
    description: 'Upstream defaults — equivalent to an empty config.',
    config: {},
  },
  {
    id: 'minimal',
    label: 'Minimal',
    description: 'Just model badge + project + context. Everything else off.',
    config: {
      elementOrder: ['project', 'context'],
      display: {
        showTokenBreakdown: false,
        showUsage: false,
      } as any,
    },
  },
  {
    id: 'full-featured',
    label: 'Full-featured',
    description: 'Every information element visible.',
    config: {
      showSeparators: true,
      display: {
        showCost: true,
        showDuration: true,
        showSpeed: true,
        showSessionTokens: true,
        showClaudeCodeVersion: true,
        showOutputStyle: true,
        showEffortLevel: true,
        showSessionStartDate: true,
        showLastResponseAt: true,
        showTools: true,
        showAgents: true,
        showTodos: true,
        showMemoryUsage: true,
        showPromptCache: true,
        showConfigCounts: true,
      } as any,
    },
  },
  {
    id: 'cjk',
    label: 'CJK optimized',
    description: 'Chinese users — language=zh, compact layout, narrow bar chars.',
    config: {
      language: 'zh',
      pathLevels: 1,
      lineLayout: 'compact',
      colors: {
        barFilled: '#',
        barEmpty: '-',
      } as any,
    },
  },
  {
    id: 'dev-mode',
    label: 'Dev mode',
    description: 'Cost, duration, speed, token breakdown, Claude Code version.',
    config: {
      display: {
        showCost: true,
        showDuration: true,
        showSpeed: true,
        showTokenBreakdown: true,
        showClaudeCodeVersion: true,
        showSessionTokens: true,
      } as any,
    },
  },
  {
    id: 'compact-oneliner',
    label: 'Compact one-liner',
    description: 'Single-line dense layout — merge everything visible.',
    config: {
      lineLayout: 'compact',
      display: {
        mergeGroups: [['context', 'usage', 'memory']],
      } as any,
    },
  },
]
```

- [ ] **Step 4: Run tests, verify all pass**

```bash
pnpm test:run -- presets
```

Expected: `5 passed`.

- [ ] **Step 5: Commit**

```bash
git add src/stores/presets.ts tests/stores/presets.test.ts
git commit -m "feat(stores): 6 built-in presets"
```

---

## Task 9: PresetMenu

**Files:**
- Create: `src/components/io/PresetMenu.vue`

- [ ] **Step 1: Create src/components/io/PresetMenu.vue**

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'
import { useConfigStore } from '@/stores/config'
import { PRESETS, type Preset } from '@/stores/presets'
import ConfirmDialog from '@/components/io/ConfirmDialog.vue'
import type { JsonObject } from '@/lib/path-set'

const store = useConfigStore()
const open = ref(false)
const pendingPreset = ref<Preset | null>(null)

const hasContent = computed(() => Object.keys(store.rawJson).length > 0)

function selectPreset(p: Preset) {
  open.value = false
  if (hasContent.value) {
    pendingPreset.value = p
  } else {
    apply(p)
  }
}

function apply(p: Preset) {
  store.setRawJson(p.config as JsonObject)
  pendingPreset.value = null
}

function cancel() { pendingPreset.value = null }
</script>

<template>
  <div class="preset-wrap">
    <button class="topbar-btn" type="button" @click="open = !open">[ presets ▾ ]</button>
    <ul v-if="open" class="menu" @mouseleave="open = false">
      <li
        v-for="p in PRESETS"
        :key="p.id"
        class="menu-item"
        @click="selectPreset(p)"
      >
        <div class="item-label">{{ p.label }}</div>
        <div class="item-desc">{{ p.description }}</div>
      </li>
    </ul>

    <ConfirmDialog
      :open="pendingPreset !== null"
      :title="`Load preset: ${pendingPreset?.label ?? ''}`"
      message="This will replace your current configuration. Unknown fields you have set will be lost."
      confirm-label="Load preset"
      @confirm="pendingPreset && apply(pendingPreset)"
      @cancel="cancel"
    />
  </div>
</template>

<style scoped>
.preset-wrap { position: relative; }
.topbar-btn {
  background: transparent;
  border: 1px solid var(--border-dim);
  color: var(--fg-dim);
  font-family: var(--font-mono);
  font-size: 12px;
  padding: 3px 10px;
  cursor: pointer;
}
.topbar-btn:hover { color: var(--accent); border-color: var(--accent); }
.menu {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  list-style: none;
  margin: 0;
  padding: 4px;
  background: var(--bg-base);
  border: 1px dashed var(--border-dash);
  min-width: 280px;
  z-index: 30;
}
.menu-item {
  padding: 6px 8px;
  cursor: pointer;
  border-bottom: 1px dashed var(--border-dim);
}
.menu-item:last-child { border-bottom: none; }
.menu-item:hover { background: var(--bg-elevated); }
.item-label { color: var(--accent); font-size: 12px; }
.item-desc { color: var(--fg-dim); font-size: 11px; margin-top: 2px; line-height: 1.4; }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/io/PresetMenu.vue
git commit -m "feat(io): PresetMenu — dropdown with confirm dialog"
```

---

## Task 10: Wire IO into the topbar

**Files:**
- Modify: `src/App.vue`

- [ ] **Step 1: Update the topbar in src/App.vue**

Replace the `<header class="topbar">…</header>` block:

```vue
<header class="topbar">
  <span class="logo">▆ claude-hud.cfg</span>
  <PresetMenu />
  <ImportButton />
  <ExportButton />
  <ShareButton />
  <span class="topbar-spacer" />
  <span class="topbar-hint">v0.3</span>
</header>
```

Add imports at the top of `<script setup>`:

```typescript
import PresetMenu from '@/components/io/PresetMenu.vue'
import ImportButton from '@/components/io/ImportButton.vue'
import ExportButton from '@/components/io/ExportButton.vue'
import ShareButton from '@/components/io/ShareButton.vue'
```

Update the `.topbar` style to add a gap:

```css
.topbar {
  display: flex;
  align-items: center;
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px dashed var(--border-dash);
  gap: var(--space-2);
}
```

(The base `.topbar` style is in `src/style.css` — keep it. The scoped override in `App.vue`'s `<style scoped>` overrides nothing because the topbar is not scoped. To keep the gap, modify `src/style.css` instead: change `gap: var(--space-3)` to `gap: var(--space-2)`.)

- [ ] **Step 2: Manually smoke test**

```bash
pnpm dev
```

Visit the page. Confirm:
- All topbar buttons render
- Preset menu opens, selecting "Minimal" loads a preset (confirms first if you've already edited something)
- Export downloads `config.json`
- Share copies a URL with hash
- Pasting that hash URL into a fresh tab loads the same config

Stop with Ctrl+C.

- [ ] **Step 3: Commit**

```bash
git add src/App.vue src/style.css
git commit -m "feat(app): wire IO buttons + PresetMenu into topbar"
```

---

## Task 11: Diagnostics generator

**Files:**
- Create: `src/lib/diagnostics.ts`
- Test: `tests/unit/diagnostics.test.ts`

Walks `rawJson` and `parsedConfig` and produces `Diagnostic[]` describing fields that were clamped, fell back, or are unknown.

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/diagnostics.test.ts
import { describe, it, expect } from 'vitest'
import { generateDiagnostics } from '@/lib/diagnostics'
import { mergeConfig } from '@/lib/merge-config'

describe('diagnostics', () => {
  it('clean default produces no diagnostics', () => {
    expect(generateDiagnostics({}, mergeConfig({}))).toEqual([])
  })

  it('reports clamped threshold', () => {
    const raw = { display: { contextWarningThreshold: 150 } }
    const parsed = mergeConfig(raw)
    const diag = generateDiagnostics(raw, parsed)
    const clamp = diag.find(d => d.path === 'display.contextWarningThreshold')
    expect(clamp).toBeDefined()
    expect(clamp?.kind).toBe('clamped')
    expect(clamp?.from).toBe(150)
    expect(clamp?.to).toBe(100)
  })

  it('reports invalid enum', () => {
    const raw = { display: { contextValue: 'gibberish' } }
    const parsed = mergeConfig(raw as any)
    const diag = generateDiagnostics(raw as any, parsed)
    const enumDiag = diag.find(d => d.path === 'display.contextValue')
    expect(enumDiag?.kind).toBe('unknownEnum')
  })

  it('reports unknown top-level field', () => {
    const raw = { foo: 'bar' }
    const parsed = mergeConfig(raw as any)
    const diag = generateDiagnostics(raw as any, parsed)
    const unk = diag.find(d => d.path === 'foo')
    expect(unk?.kind).toBe('unknownField')
  })

  it('reports unknown nested field', () => {
    const raw = { display: { futureField: 42 } }
    const parsed = mergeConfig(raw as any)
    const diag = generateDiagnostics(raw as any, parsed)
    const unk = diag.find(d => d.path === 'display.futureField')
    expect(unk?.kind).toBe('unknownField')
  })

  it('reports stripped elementOrder entries', () => {
    const raw = { elementOrder: ['project', 'foo', 'context'] }
    const parsed = mergeConfig(raw as any)
    const diag = generateDiagnostics(raw as any, parsed)
    const unkEl = diag.find(d => d.path === 'elementOrder' && d.kind === 'unknownElement')
    expect(unkEl).toBeDefined()
  })

  it('reports invalid color', () => {
    const raw = { colors: { model: 'notAColor' } }
    const parsed = mergeConfig(raw as any)
    const diag = generateDiagnostics(raw as any, parsed)
    const c = diag.find(d => d.path === 'colors.model')
    expect(c?.kind).toBe('invalidColor')
  })
})
```

- [ ] **Step 2: Run, verify it fails**

```bash
pnpm test:run -- diagnostics
```

- [ ] **Step 3: Create src/lib/diagnostics.ts**

```typescript
import type { HudConfig } from '@/lib/hud-schema'
import { DEFAULT_CONFIG, KNOWN_HUD_ELEMENTS } from '@/lib/hud-schema'
import { getPath, type JsonObject } from '@/lib/path-set'

export type DiagnosticKind =
  | 'clamped'
  | 'unknownEnum'
  | 'unknownElement'
  | 'duplicateInGroup'
  | 'invalidColor'
  | 'unknownField'

export type DiagnosticSeverity = 'info' | 'warn' | 'error'

export interface Diagnostic {
  path: string
  kind: DiagnosticKind
  severity: DiagnosticSeverity
  message: string
  from?: unknown
  to?: unknown
}

const CLAMPED_PATHS: Array<{ path: string; max: number }> = [
  { path: 'display.contextWarningThreshold', max: 100 },
  { path: 'display.contextCriticalThreshold', max: 100 },
  { path: 'display.usageThreshold', max: 100 },
  { path: 'display.sevenDayThreshold', max: 100 },
  { path: 'display.environmentThreshold', max: 100 },
]

const ENUM_PATHS: Array<{ path: string; values: ReadonlyArray<string> }> = [
  { path: 'lineLayout', values: ['compact', 'expanded'] },
  { path: 'language', values: ['en', 'zh'] },
  { path: 'display.contextValue', values: ['percent', 'tokens', 'remaining', 'both'] },
  { path: 'display.usageValue', values: ['percent', 'remaining'] },
  { path: 'display.modelFormat', values: ['full', 'compact', 'short'] },
  { path: 'display.timeFormat', values: ['relative', 'absolute', 'both'] },
  { path: 'display.addedDirsLayout', values: ['inline', 'line'] },
  { path: 'display.autocompactBuffer', values: ['enabled', 'disabled'] },
  { path: 'gitStatus.branchOverflow', values: ['truncate', 'wrap'] },
]

const COLOR_PATHS = [
  'colors.context', 'colors.usage', 'colors.warning', 'colors.usageWarning',
  'colors.critical', 'colors.model', 'colors.project', 'colors.git',
  'colors.gitBranch', 'colors.label', 'colors.custom',
]

const NAMED_COLORS = new Set(['dim', 'red', 'green', 'yellow', 'magenta', 'cyan', 'brightBlue', 'brightMagenta'])
const HEX_PATTERN = /^#[0-9a-fA-F]{6}$/

function isValidColor(v: unknown): boolean {
  if (typeof v === 'string' && NAMED_COLORS.has(v)) return true
  if (typeof v === 'string' && HEX_PATTERN.test(v)) return true
  if (typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 255) return true
  return false
}

function isObject(v: unknown): v is JsonObject {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function collectUnknownPaths(raw: JsonObject, ref: JsonObject, prefix = ''): string[] {
  const found: string[] = []
  for (const key of Object.keys(raw)) {
    const here = prefix ? `${prefix}.${key}` : key
    if (!(key in ref)) {
      found.push(here)
      continue
    }
    const rawV = raw[key]
    const refV = ref[key]
    if (isObject(rawV) && isObject(refV)) {
      found.push(...collectUnknownPaths(rawV, refV, here))
    }
  }
  return found
}

export function generateDiagnostics(rawJson: JsonObject, parsed: HudConfig): Diagnostic[] {
  const out: Diagnostic[] = []

  // 1. Clamped numerics
  for (const { path, max } of CLAMPED_PATHS) {
    const raw = getPath(rawJson, path)
    if (typeof raw !== 'number') continue
    if (raw > max || raw < 0) {
      const clamped = Math.max(0, Math.min(max, raw))
      out.push({
        path,
        kind: 'clamped',
        severity: 'warn',
        message: `Clamped to [0,${max}].`,
        from: raw,
        to: clamped,
      })
    }
  }

  // 2. Invalid enums
  for (const { path, values } of ENUM_PATHS) {
    const raw = getPath(rawJson, path)
    if (raw === undefined) continue
    if (typeof raw !== 'string' || !values.includes(raw)) {
      out.push({
        path,
        kind: 'unknownEnum',
        severity: 'warn',
        message: `Invalid value — fell back to default.`,
        from: raw,
        to: getPath(parsed as unknown as JsonObject, path),
      })
    }
  }

  // 3. Invalid colors
  for (const path of COLOR_PATHS) {
    const raw = getPath(rawJson, path)
    if (raw === undefined) continue
    if (!isValidColor(raw)) {
      out.push({
        path,
        kind: 'invalidColor',
        severity: 'warn',
        message: 'Not a valid color — fell back to default.',
        from: raw,
        to: getPath(parsed as unknown as JsonObject, path),
      })
    }
  }

  // 4. Unknown elements in elementOrder
  const rawOrder = getPath(rawJson, 'elementOrder')
  if (Array.isArray(rawOrder)) {
    const unknown = rawOrder.filter(e => typeof e !== 'string' || !KNOWN_HUD_ELEMENTS.has(e as any))
    if (unknown.length > 0) {
      out.push({
        path: 'elementOrder',
        kind: 'unknownElement',
        severity: 'info',
        message: `Removed unknown: ${unknown.join(', ')}`,
        from: unknown,
      })
    }
  }

  // 5. Unknown fields (anywhere in raw that's not in DEFAULT_CONFIG shape)
  const unknownFieldPaths = collectUnknownPaths(rawJson, DEFAULT_CONFIG as unknown as JsonObject)
  for (const path of unknownFieldPaths) {
    out.push({
      path,
      kind: 'unknownField',
      severity: 'info',
      message: 'Preserved on export, but not editable in the visual form.',
      from: getPath(rawJson, path),
    })
  }

  return out
}
```

- [ ] **Step 4: Run tests, verify all pass**

```bash
pnpm test:run -- diagnostics
```

Expected: `7 passed`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/diagnostics.ts tests/unit/diagnostics.test.ts
git commit -m "feat(lib): diagnostics — clamp/enum/color/element/unknown reports"
```

---

## Task 12: Expose diagnostics through the store

**Files:**
- Modify: `src/stores/config.ts`

- [ ] **Step 1: Add `diagnostics` computed to the store**

Edit `src/stores/config.ts` — add imports + a new computed:

```typescript
import { generateDiagnostics, type Diagnostic } from '@/lib/diagnostics'
// ... existing imports

export const useConfigStore = defineStore('config', () => {
  // ... existing refs/computeds

  const diagnostics = computed<Diagnostic[]>(() =>
    generateDiagnostics(rawJson.value, parsedConfig.value)
  )

  function diagnosticsForPath(path: string): Diagnostic[] {
    return diagnostics.value.filter(d => d.path === path)
  }

  // include in the returned object:
  return {
    rawJson, parsedConfig, lastHashWrite, diagnostics,
    patchField, clearField, readField, setRawJson, reset,
    loadFromHash, startHashSync, diagnosticsForPath,
  }
})
```

- [ ] **Step 2: Add a store test for diagnostic exposure**

Append to `tests/stores/config.test.ts`:

```typescript
it('exposes diagnostics for invalid values', () => {
  const store = useConfigStore()
  store.patchField('display.contextWarningThreshold', 150)
  expect(store.diagnostics.some(d => d.path === 'display.contextWarningThreshold')).toBe(true)
})

it('diagnosticsForPath filters', () => {
  const store = useConfigStore()
  store.patchField('display.contextValue', 'gibberish')
  const list = store.diagnosticsForPath('display.contextValue')
  expect(list).toHaveLength(1)
  expect(list[0].kind).toBe('unknownEnum')
})
```

- [ ] **Step 3: Run, verify all pass**

```bash
pnpm test:run -- stores/config
```

Expected: 10 passed (8 original + 2 new).

- [ ] **Step 4: Commit**

```bash
git add src/stores/config.ts tests/stores/config.test.ts
git commit -m "feat(stores): expose diagnostics computed + diagnosticsForPath"
```

---

## Task 13: FieldRow shows inline diagnostic

**Files:**
- Modify: `src/components/form/FieldRow.vue`

- [ ] **Step 1: Edit src/components/form/FieldRow.vue**

Replace the file with a version that pulls diagnostics from the store when given a `path`:

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useConfigStore } from '@/stores/config'

const props = defineProps<{
  label: string
  hint?: string
  path?: string
}>()

const store = useConfigStore()
const diagnostics = computed(() =>
  props.path ? store.diagnosticsForPath(props.path) : []
)
</script>

<template>
  <div class="field-row" :class="{ 'has-diag': diagnostics.length > 0 }">
    <div class="field-label">
      <span class="label-text">{{ label }}</span>
      <span v-if="path" class="label-path">{{ path }}</span>
    </div>
    <div class="field-control">
      <slot />
    </div>
    <div v-if="hint || $slots.hint || diagnostics.length > 0" class="field-hint">
      <slot name="hint">{{ hint }}</slot>
      <p v-for="d in diagnostics" :key="d.kind" class="diag" :class="`diag-${d.severity}`">
        ⚠ {{ d.message }}<span v-if="d.from !== undefined"> (was: {{ JSON.stringify(d.from) }})</span>
      </p>
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
.field-row.has-diag { background: rgba(252, 211, 77, 0.04); }
.field-label { display: flex; flex-direction: column; gap: 2px; padding-top: 4px; }
.label-text { color: var(--fg-base); font-size: 13px; }
.label-path { color: var(--fg-dim); font-size: 10px; font-family: var(--font-mono); }
.field-control { display: flex; align-items: center; gap: var(--space-2); min-height: 28px; }
.field-hint {
  grid-column: 2 / -1;
  color: var(--fg-dim);
  font-size: 11px;
  line-height: 1.4;
}
.diag { margin: 2px 0 0; }
.diag-warn { color: var(--accent-warm); }
.diag-info { color: var(--fg-dim); }
.diag-error { color: var(--accent-bad); }
</style>
```

- [ ] **Step 2: Verify field-level hints display**

```bash
pnpm dev
```

In ThresholdsTab, type 150 into the contextWarningThreshold number input. The slider clamps to 100; below the row a yellow line appears: "⚠ Clamped to [0,100]. (was: 150)".

Stop with Ctrl+C.

- [ ] **Step 3: Commit**

```bash
git add src/components/form/FieldRow.vue
git commit -m "feat(form): FieldRow shows inline diagnostics from the store"
```

---

## Task 14: ValidationBanner

**Files:**
- Create: `src/components/shell/ValidationBanner.vue`
- Modify: `src/App.vue`

Summarizes diagnostics at the top of the editor area (between preview and tabs). Especially highlights unknown fields the visual editor can't surface.

- [ ] **Step 1: Create src/components/shell/ValidationBanner.vue**

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useConfigStore } from '@/stores/config'

const store = useConfigStore()

const grouped = computed(() => {
  const by = new Map<string, number>()
  for (const d of store.diagnostics) {
    by.set(d.kind, (by.get(d.kind) ?? 0) + 1)
  }
  return Array.from(by.entries())
})

const unknownFields = computed(() =>
  store.diagnostics.filter(d => d.kind === 'unknownField').map(d => d.path)
)

const isEmpty = computed(() => store.diagnostics.length === 0)
</script>

<template>
  <div v-if="!isEmpty" class="validation-banner">
    <div class="banner-summary">
      <span class="icon">⚠</span>
      <span
        v-for="[kind, count] in grouped"
        :key="kind"
        class="kind-pill"
      >{{ count }} {{ kind }}</span>
    </div>
    <div v-if="unknownFields.length > 0" class="unknown-list">
      Unknown fields preserved on export:
      <code v-for="p in unknownFields" :key="p" class="unknown-path">{{ p }}</code>
    </div>
  </div>
</template>

<style scoped>
.validation-banner {
  background: rgba(252, 211, 77, 0.08);
  border-top: 1px dashed var(--border-dash);
  border-bottom: 1px dashed var(--border-dash);
  padding: var(--space-2) var(--space-4);
  font-size: 11px;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}
.banner-summary { display: flex; align-items: center; gap: var(--space-2); color: var(--accent-warm); }
.icon { font-size: 12px; }
.kind-pill {
  background: var(--bg-elevated);
  border: 1px solid var(--border-dim);
  padding: 1px 6px;
  color: var(--fg-base);
  font-family: var(--font-mono);
}
.unknown-list { color: var(--fg-dim); }
.unknown-path {
  background: var(--bg-elevated);
  border: 1px solid var(--border-dim);
  padding: 1px 4px;
  margin: 0 2px;
  color: var(--accent-magenta);
  font-family: var(--font-mono);
  font-size: 11px;
}
</style>
```

- [ ] **Step 2: Wire ValidationBanner into App.vue**

Add import:
```typescript
import ValidationBanner from '@/components/shell/ValidationBanner.vue'
```

Add the banner between `<section class="preview-stage">` and `<TabNav>` in the template:

```vue
<ValidationBanner />
<TabNav v-model="activeTab" :tabs="tabs" />
```

- [ ] **Step 3: Manual smoke**

```bash
pnpm dev
```

In Raw JSON, paste `{"foo": 1, "display": {"futureField": 99, "contextWarningThreshold": 200}}` and blur. Banner appears showing `1 clamped`, `2 unknownField`, with `foo` and `display.futureField` listed.

Stop with Ctrl+C.

- [ ] **Step 4: Commit**

```bash
git add src/components/shell/ValidationBanner.vue src/App.vue
git commit -m "feat(shell): ValidationBanner — summarize diagnostics + unknown fields"
```

---

## Task 15: i18n setup + en/zh keysets

**Files:**
- Create: `src/i18n/en.ts`
- Create: `src/i18n/zh.ts`
- Create: `src/i18n/index.ts`
- Modify: `src/main.ts`

For brevity, only top-level UI text and tab labels get translated in this plan. Field-level tooltips can be expanded over time.

- [ ] **Step 1: Create src/i18n/en.ts**

```typescript
export const en = {
  app: {
    subtitle: 'visual config editor',
  },
  topbar: {
    presets: 'presets',
    import: 'import',
    export: 'export',
    copy: 'copy',
    share: 'share',
  },
  tabs: {
    layout: 'Layout',
    elements: 'Elements',
    git: 'Git',
    display: 'Display',
    thresholds: 'Thresholds',
    colors: 'Colors',
    rawJson: 'Raw JSON',
  },
  banner: {
    title: 'Configuration warnings',
    unknownFields: 'Unknown fields preserved on export:',
  },
  dialog: {
    cancel: 'Cancel',
    continue: 'Continue',
    loadPreset: 'Load preset',
    replaceWarning: 'This will replace your current configuration.',
  },
  import: {
    title: 'Import config.json',
    hint: 'Paste JSON below, drag a file in, or pick one. Existing config will be replaced.',
    apply: 'Apply',
  },
  toast: {
    linkCopied: 'Link copied',
    downloaded: 'Downloaded',
    jsonCopied: 'Copied to clipboard',
    copyFailed: 'Copy failed — see console',
  },
}

export type Messages = typeof en
```

- [ ] **Step 2: Create src/i18n/zh.ts**

```typescript
import type { Messages } from './en'

export const zh: Messages = {
  app: {
    subtitle: '可视化配置编辑器',
  },
  topbar: {
    presets: '预设',
    import: '导入',
    export: '导出',
    copy: '复制',
    share: '分享',
  },
  tabs: {
    layout: '布局',
    elements: '元素',
    git: 'Git',
    display: '显示',
    thresholds: '阈值',
    colors: '配色',
    rawJson: '原始 JSON',
  },
  banner: {
    title: '配置警告',
    unknownFields: '导出时保留的未知字段:',
  },
  dialog: {
    cancel: '取消',
    continue: '继续',
    loadPreset: '加载预设',
    replaceWarning: '这将替换你当前的配置。',
  },
  import: {
    title: '导入 config.json',
    hint: '粘贴 JSON、拖入文件,或者选取一个文件。已有配置会被覆盖。',
    apply: '应用',
  },
  toast: {
    linkCopied: '链接已复制',
    downloaded: '已下载',
    jsonCopied: '已复制到剪贴板',
    copyFailed: '复制失败 — 请查看控制台',
  },
}
```

- [ ] **Step 3: Create src/i18n/index.ts**

```typescript
import { createI18n } from 'vue-i18n'
import { en } from './en'
import { zh } from './zh'

export const i18n = createI18n({
  legacy: false,
  locale: 'en',
  fallbackLocale: 'en',
  messages: { en, zh },
})

export function setLocale(locale: 'en' | 'zh') {
  i18n.global.locale.value = locale
}
```

- [ ] **Step 4: Update src/main.ts**

```typescript
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { i18n } from '@/i18n'
import './style.css'
import { useConfigStore } from '@/stores/config'

const app = createApp(App)
app.use(createPinia())
app.use(i18n)

const store = useConfigStore()
store.loadFromHash()
store.startHashSync()

app.mount('#app')
```

- [ ] **Step 5: Commit**

```bash
git add src/i18n/ src/main.ts
git commit -m "feat(i18n): vue-i18n setup with en + zh keysets"
```

---

## Task 16: Language toggle + applying translations

**Files:**
- Modify: `src/App.vue`

- [ ] **Step 1: Update App.vue to use i18n + add toggle**

Replace `src/App.vue` (preserving structure):

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import HudPreview from '@/preview/HudPreview.vue'
import TabNav from '@/components/shell/TabNav.vue'
import LayoutTab from '@/components/editor/LayoutTab.vue'
import ElementsTab from '@/components/editor/ElementsTab.vue'
import GitTab from '@/components/editor/GitTab.vue'
import DisplayTab from '@/components/editor/DisplayTab.vue'
import ThresholdsTab from '@/components/editor/ThresholdsTab.vue'
import ColorsTab from '@/components/editor/ColorsTab.vue'
import RawJsonTab from '@/components/editor/RawJsonTab.vue'
import PresetMenu from '@/components/io/PresetMenu.vue'
import ImportButton from '@/components/io/ImportButton.vue'
import ExportButton from '@/components/io/ExportButton.vue'
import ShareButton from '@/components/io/ShareButton.vue'
import ValidationBanner from '@/components/shell/ValidationBanner.vue'
import { useConfigStore } from '@/stores/config'

const { t, locale } = useI18n()
const store = useConfigStore()

const tabs = computed(() => ([
  { value: 'layout',     label: t('tabs.layout') },
  { value: 'elements',   label: t('tabs.elements') },
  { value: 'git',        label: t('tabs.git') },
  { value: 'display',    label: t('tabs.display') },
  { value: 'thresholds', label: t('tabs.thresholds') },
  { value: 'colors',     label: t('tabs.colors') },
  { value: 'rawJson',    label: t('tabs.rawJson') },
]))

const activeTab = ref('layout')
const parsedConfig = computed(() => store.parsedConfig)

function toggleLocale() {
  locale.value = locale.value === 'en' ? 'zh' : 'en'
}
</script>

<template>
  <div id="app-shell">
    <header class="topbar">
      <span class="logo">▆ claude-hud.cfg</span>
      <PresetMenu />
      <ImportButton />
      <ExportButton />
      <ShareButton />
      <span class="topbar-spacer" />
      <button class="lang-toggle" type="button" @click="toggleLocale">{{ locale.toUpperCase() }}</button>
      <span class="topbar-hint">v1.0</span>
    </header>

    <section class="preview-stage">
      <div class="stage-label">PREVIEW (live)</div>
      <HudPreview :config="parsedConfig" />
    </section>

    <ValidationBanner />
    <TabNav v-model="activeTab" :tabs="tabs" />

    <main class="editor-stage">
      <LayoutTab v-if="activeTab === 'layout'" />
      <ElementsTab v-else-if="activeTab === 'elements'" />
      <GitTab v-else-if="activeTab === 'git'" />
      <DisplayTab v-else-if="activeTab === 'display'" />
      <ThresholdsTab v-else-if="activeTab === 'thresholds'" />
      <ColorsTab v-else-if="activeTab === 'colors'" />
      <RawJsonTab v-else-if="activeTab === 'rawJson'" />
    </main>
  </div>
</template>

<style scoped>
.topbar-spacer { flex: 1; }
.topbar-hint { color: var(--fg-dim); font-size: 11px; margin-left: var(--space-2); }
.lang-toggle {
  background: transparent;
  border: 1px solid var(--border-dim);
  color: var(--fg-dim);
  font-family: var(--font-mono);
  font-size: 11px;
  padding: 3px 8px;
  cursor: pointer;
}
.lang-toggle:hover { color: var(--accent); border-color: var(--accent); }
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

- [ ] **Step 2: Manual smoke**

```bash
pnpm dev
```

Click `EN` in the topbar — tabs change to Chinese (布局 / 元素 / Git / 显示 / 阈值 / 配色 / 原始 JSON). Click again — back to English. Stop with Ctrl+C.

- [ ] **Step 3: Commit**

```bash
git add src/App.vue
git commit -m "feat(i18n): wire t() into tab labels + language toggle button"
```

---

## Final checks before Plan 03 done

- [ ] **Step 1: Full pipeline**

```bash
pnpm type-check && pnpm lint && pnpm test:run && pnpm build
```

Expected: all succeed.

- [ ] **Step 2: Acceptance smoke (golden path)**

```bash
pnpm dev
```

Walk through:
1. Load page — fresh, preview shows defaults
2. Click `[ presets ▾ ]` → pick Minimal — preview compresses to model + project + context
3. Click `[ share ]` — clipboard copies URL
4. Open new tab with the URL — same Minimal preset appears
5. Toggle to `ZH` — tabs translate
6. Open Raw JSON tab, paste `{"foo": 999, "display": {"contextWarningThreshold": 250}}` and blur
   - Validation banner shows `1 clamped`, `1 unknownField`
   - Thresholds tab → contextWarningThreshold slider is at 100 with the yellow ⚠ message
7. `[ export ]` — downloads `config.json` containing `foo: 999` and `display.contextWarningThreshold: 250` (the raw, NOT the clamped value)

Stop with Ctrl+C.

- [ ] **Step 3: Tag**

```bash
git tag v1.0-feature-complete
```

---

## Self-review notes

- All spec items from Plan 03 scope are implemented: import/export, presets, URL sharing, diagnostics (with inline + banner UI), bilingual UI.
- Unknown-field passthrough verified by Raw JSON acceptance smoke step 7.
- `Diagnostic` UX confirmed at two levels (FieldRow inline, ValidationBanner summary).
- i18n is structurally in place; field-level tooltips beyond tab labels are deferred to follow-up work — they're additive and don't change architecture.

**End state of Plan 03:** Feature-complete v1. Ready for deploy + CI (Plan 04).
