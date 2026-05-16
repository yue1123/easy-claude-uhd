<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useConfigStore } from '@/stores/config'
import FieldRow from '@/components/form/FieldRow.vue'
import ThresholdSlider from '@/components/form/ThresholdSlider.vue'

const { t } = useI18n()
const store = useConfigStore()
const d = computed(() => store.parsedConfig.display)

function set(path: string, v: number) {
  store.patchField(`display.${path}`, v)
}
</script>

<template>
  <div class="thresholds-tab">
    <FieldRow
      :label="t('thresholds.fields.contextWarningThreshold.label')"
      path="display.contextWarningThreshold"
      :hint="t('thresholds.fields.contextWarningThreshold.hint')"
    >
      <ThresholdSlider
        :modelValue="d.contextWarningThreshold"
        @update:modelValue="set('contextWarningThreshold', $event)"
      />
    </FieldRow>
    <FieldRow
      :label="t('thresholds.fields.contextCriticalThreshold.label')"
      path="display.contextCriticalThreshold"
      :hint="t('thresholds.fields.contextCriticalThreshold.hint')"
    >
      <ThresholdSlider
        :modelValue="d.contextCriticalThreshold"
        @update:modelValue="set('contextCriticalThreshold', $event)"
      />
    </FieldRow>
    <FieldRow
      :label="t('thresholds.fields.usageThreshold.label')"
      path="display.usageThreshold"
      :hint="t('thresholds.fields.usageThreshold.hint')"
    >
      <ThresholdSlider
        :modelValue="d.usageThreshold"
        @update:modelValue="set('usageThreshold', $event)"
      />
    </FieldRow>
    <FieldRow
      :label="t('thresholds.fields.sevenDayThreshold.label')"
      path="display.sevenDayThreshold"
      :hint="t('thresholds.fields.sevenDayThreshold.hint')"
    >
      <ThresholdSlider
        :modelValue="d.sevenDayThreshold"
        @update:modelValue="set('sevenDayThreshold', $event)"
      />
    </FieldRow>
    <FieldRow
      :label="t('thresholds.fields.environmentThreshold.label')"
      path="display.environmentThreshold"
      :hint="t('thresholds.fields.environmentThreshold.hint')"
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
