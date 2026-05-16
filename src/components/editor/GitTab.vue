<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useConfigStore } from '@/stores/config'
import FieldRow from '@/components/form/FieldRow.vue'
import ToggleSwitch from '@/components/form/ToggleSwitch.vue'
import SelectInput from '@/components/form/SelectInput.vue'
import NumberInput from '@/components/form/NumberInput.vue'

const { t } = useI18n()
const store = useConfigStore()
const cfg = computed(() => store.parsedConfig.gitStatus)

function set(path: string, v: unknown) {
  store.patchField(`gitStatus.${path}`, v)
}
</script>

<template>
  <div class="git-tab">
    <FieldRow
      :label="t('git.fields.enabled.label')"
      path="gitStatus.enabled"
      :hint="t('git.fields.enabled.hint')"
    >
      <ToggleSwitch :modelValue="cfg.enabled" @update:modelValue="set('enabled', $event)" />
    </FieldRow>
    <FieldRow
      :label="t('git.fields.showDirty.label')"
      path="gitStatus.showDirty"
      :hint="t('git.fields.showDirty.hint')"
    >
      <ToggleSwitch :modelValue="cfg.showDirty" @update:modelValue="set('showDirty', $event)" />
    </FieldRow>
    <FieldRow
      :label="t('git.fields.showAheadBehind.label')"
      path="gitStatus.showAheadBehind"
      :hint="t('git.fields.showAheadBehind.hint')"
    >
      <ToggleSwitch
        :modelValue="cfg.showAheadBehind"
        @update:modelValue="set('showAheadBehind', $event)"
      />
    </FieldRow>
    <FieldRow
      :label="t('git.fields.showFileStats.label')"
      path="gitStatus.showFileStats"
      :hint="t('git.fields.showFileStats.hint')"
    >
      <ToggleSwitch
        :modelValue="cfg.showFileStats"
        @update:modelValue="set('showFileStats', $event)"
      />
    </FieldRow>
    <FieldRow
      :label="t('git.fields.branchOverflow.label')"
      path="gitStatus.branchOverflow"
      :hint="t('git.fields.branchOverflow.hint')"
    >
      <SelectInput
        :modelValue="cfg.branchOverflow"
        :options="[
          { value: 'truncate', label: t('git.options.branchOverflow.truncate') },
          { value: 'wrap', label: t('git.options.branchOverflow.wrap') },
        ]"
        @update:modelValue="set('branchOverflow', $event)"
      />
    </FieldRow>
    <FieldRow
      :label="t('git.fields.pushWarningThreshold.label')"
      path="gitStatus.pushWarningThreshold"
      :hint="t('git.fields.pushWarningThreshold.hint')"
    >
      <NumberInput
        :modelValue="cfg.pushWarningThreshold"
        :min="0"
        @update:modelValue="set('pushWarningThreshold', $event)"
      />
    </FieldRow>
    <FieldRow
      :label="t('git.fields.pushCriticalThreshold.label')"
      path="gitStatus.pushCriticalThreshold"
      :hint="t('git.fields.pushCriticalThreshold.hint')"
    >
      <NumberInput
        :modelValue="cfg.pushCriticalThreshold"
        :min="0"
        @update:modelValue="set('pushCriticalThreshold', $event)"
      />
    </FieldRow>
  </div>
</template>

<style scoped>
.git-tab {
  display: flex;
  flex-direction: column;
}
</style>
