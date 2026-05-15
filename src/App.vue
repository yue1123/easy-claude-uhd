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
