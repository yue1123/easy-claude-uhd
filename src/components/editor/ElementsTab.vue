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
  { path: 'display.showModel', label: 'showModel', hint: 'Show the [Model name] badge.' },
  { path: 'display.showProject', label: 'showProject', hint: 'Show the project path.' },
  { path: 'display.showAddedDirs', label: 'showAddedDirs', hint: 'Show added directories.' },
  { path: 'display.showContextBar', label: 'showContextBar', hint: 'Show the context-usage bar.' },
  {
    path: 'display.showTokenBreakdown',
    label: 'showTokenBreakdown',
    hint: 'Show in/out token counts after the percentage.',
  },
  { path: 'display.showUsage', label: 'showUsage', hint: 'Show the 5h / 7d usage line.' },
  {
    path: 'display.usageBarEnabled',
    label: 'usageBarEnabled',
    hint: 'Show bars for usage values.',
  },
  {
    path: 'display.showResetLabel',
    label: 'showResetLabel',
    hint: 'Show reset countdown for usage.',
  },
  { path: 'display.showTools', label: 'showTools' },
  { path: 'display.showAgents', label: 'showAgents' },
  { path: 'display.showTodos', label: 'showTodos' },
  { path: 'display.showMemoryUsage', label: 'showMemoryUsage' },
  { path: 'display.showPromptCache', label: 'showPromptCache' },
  { path: 'display.showSessionName', label: 'showSessionName' },
  { path: 'display.showClaudeCodeVersion', label: 'showClaudeCodeVersion' },
  { path: 'display.showEffortLevel', label: 'showEffortLevel' },
  { path: 'display.showSessionTokens', label: 'showSessionTokens' },
  { path: 'display.showOutputStyle', label: 'showOutputStyle' },
  { path: 'display.showSessionStartDate', label: 'showSessionStartDate' },
  { path: 'display.showLastResponseAt', label: 'showLastResponseAt' },
  {
    path: 'display.showConfigCounts',
    label: 'showConfigCounts',
    hint: 'Show counts of CLAUDE.md / rules / MCPs / hooks.',
  },
  { path: 'display.showCost', label: 'showCost' },
  { path: 'display.showDuration', label: 'showDuration' },
  { path: 'display.showSpeed', label: 'showSpeed' },
]

function getBool(path: string): boolean {
  const parts = path.split('.')
  let cur: unknown = cfg.value
  for (const k of parts) {
    if (cur && typeof cur === 'object') cur = (cur as Record<string, unknown>)[k]
    else return false
  }
  return Boolean(cur)
}

function setBool(path: string, v: boolean) {
  store.patchField(path, v)
}

function setMergeGroups(v: HudElement[][]) {
  store.patchField('display.mergeGroups', v)
}
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
      <ToggleSwitch
        :modelValue="getBool(t.path)"
        @update:modelValue="setBool(t.path, $event)"
      />
    </FieldRow>

    <h3 class="section-title">Merge groups</h3>
    <FieldRow
      label="display.mergeGroups"
      path="display.mergeGroups"
      hint="Elements in the same group render on one line separated by │."
    >
      <MergeGroupEditor
        :modelValue="cfg.display.mergeGroups"
        @update:modelValue="setMergeGroups"
      />
    </FieldRow>
  </div>
</template>

<style scoped>
.elements-tab {
  display: flex;
  flex-direction: column;
}
.section-title {
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--fg-dim);
  margin: var(--space-4) 0 var(--space-2);
}
.section-title:first-child {
  margin-top: 0;
}
</style>
