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
.label-text {
  color: var(--fg-base);
  font-size: 13px;
}
.label-path {
  color: var(--fg-dim);
  font-size: 10px;
  font-family: var(--font-mono);
}
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
