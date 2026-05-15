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
