<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useConfigStore } from '@/stores/config'
import FieldRow from '@/components/form/FieldRow.vue'
import ColorPicker from '@/components/form/ColorPicker.vue'
import TextInput from '@/components/form/TextInput.vue'
import type { HudColorOverrides, HudColorValue } from '@/lib/hud-schema'

const { t } = useI18n()
const store = useConfigStore()
const c = computed(() => store.parsedConfig.colors)

type ColorKey =
  | 'context'
  | 'usage'
  | 'warning'
  | 'usageWarning'
  | 'critical'
  | 'model'
  | 'project'
  | 'git'
  | 'gitBranch'
  | 'label'
  | 'custom'

const colorFields: Array<{ key: ColorKey }> = [
  { key: 'context' },
  { key: 'usage' },
  { key: 'warning' },
  { key: 'usageWarning' },
  { key: 'critical' },
  { key: 'model' },
  { key: 'project' },
  { key: 'git' },
  { key: 'gitBranch' },
  { key: 'label' },
  { key: 'custom' },
]

function setColor(key: string, v: HudColorValue) {
  store.patchField(`colors.${key}`, v)
}
function setChar(key: string, v: string) {
  store.patchField(`colors.${key}`, v)
}
function colorOf(key: ColorKey): HudColorValue {
  return c.value[key] as HudColorOverrides[ColorKey]
}
</script>

<template>
  <div class="colors-tab">
    <FieldRow
      v-for="f in colorFields"
      :key="f.key"
      :label="t(`colors.fields.${f.key}.label`)"
      :path="`colors.${f.key}`"
      :hint="t(`colors.fields.${f.key}.hint`)"
    >
      <ColorPicker
        :modelValue="colorOf(f.key)"
        @update:modelValue="setColor(String(f.key), $event)"
      />
    </FieldRow>

    <FieldRow
      :label="t('colors.fields.barFilled.label')"
      path="colors.barFilled"
      :hint="t('colors.fields.barFilled.hint')"
    >
      <TextInput
        :modelValue="c.barFilled"
        :maxLength="4"
        placeholder="█"
        @update:modelValue="setChar('barFilled', $event)"
      />
    </FieldRow>
    <FieldRow
      :label="t('colors.fields.barEmpty.label')"
      path="colors.barEmpty"
      :hint="t('colors.fields.barEmpty.hint')"
    >
      <TextInput
        :modelValue="c.barEmpty"
        :maxLength="4"
        placeholder="░"
        @update:modelValue="setChar('barEmpty', $event)"
      />
    </FieldRow>
  </div>
</template>

<style scoped>
.colors-tab {
  display: flex;
  flex-direction: column;
}
</style>
