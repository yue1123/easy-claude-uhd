<script setup lang="ts">
import { computed } from 'vue'
import { useConfigStore } from '@/stores/config'
import FieldRow from '@/components/form/FieldRow.vue'
import ThresholdSlider from '@/components/form/ThresholdSlider.vue'

const store = useConfigStore()
const d = computed(() => store.parsedConfig.display)

function set(path: string, v: number) {
  store.patchField(`display.${path}`, v)
}
</script>

<template>
  <div class="thresholds-tab">
    <FieldRow
      label="contextWarningThreshold"
      path="display.contextWarningThreshold"
      hint="Context % at which the bar turns warning-colored."
    >
      <ThresholdSlider
        :modelValue="d.contextWarningThreshold"
        @update:modelValue="set('contextWarningThreshold', $event)"
      />
    </FieldRow>
    <FieldRow
      label="contextCriticalThreshold"
      path="display.contextCriticalThreshold"
      hint="Context % at which the bar turns critical-colored."
    >
      <ThresholdSlider
        :modelValue="d.contextCriticalThreshold"
        @update:modelValue="set('contextCriticalThreshold', $event)"
      />
    </FieldRow>
    <FieldRow
      label="usageThreshold"
      path="display.usageThreshold"
      hint="5h usage % above which the value turns warning-colored. 0 = off."
    >
      <ThresholdSlider
        :modelValue="d.usageThreshold"
        @update:modelValue="set('usageThreshold', $event)"
      />
    </FieldRow>
    <FieldRow
      label="sevenDayThreshold"
      path="display.sevenDayThreshold"
      hint="7d usage % threshold."
    >
      <ThresholdSlider
        :modelValue="d.sevenDayThreshold"
        @update:modelValue="set('sevenDayThreshold', $event)"
      />
    </FieldRow>
    <FieldRow
      label="environmentThreshold"
      path="display.environmentThreshold"
      hint="Threshold for environment counts (CLAUDE.md etc)."
    >
      <ThresholdSlider
        :modelValue="d.environmentThreshold"
        @update:modelValue="set('environmentThreshold', $event)"
      />
    </FieldRow>
  </div>
</template>

<style scoped>
.thresholds-tab {
  display: flex;
  flex-direction: column;
}
</style>
