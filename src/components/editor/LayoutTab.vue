<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useConfigStore } from '@/stores/config'
import FieldRow from '@/components/form/FieldRow.vue'
import ToggleSwitch from '@/components/form/ToggleSwitch.vue'
import SelectInput from '@/components/form/SelectInput.vue'
import NumberInput from '@/components/form/NumberInput.vue'
import SortableList from '@/components/form/SortableList.vue'

const { t } = useI18n()
const store = useConfigStore()
const cfg = computed(() => store.parsedConfig)

function setLineLayout(v: string | number) {
  store.patchField('lineLayout', v)
}
function setShowSeparators(v: boolean) {
  store.patchField('showSeparators', v)
}
function setPathLevels(v: string | number) {
  store.patchField('pathLevels', Number(v))
}
function setMaxWidth(v: number | null) {
  if (v === null) store.clearField('maxWidth')
  else store.patchField('maxWidth', v)
}
function setForceMaxWidth(v: boolean) {
  store.patchField('forceMaxWidth', v)
}
function setElementOrder(v: string[]) {
  store.patchField('elementOrder', v)
}
</script>

<template>
  <div class="layout-tab">
    <FieldRow :label="t('layout.fields.lineLayout.label')" path="lineLayout">
      <SelectInput
        :modelValue="cfg.lineLayout"
        :options="[
          { value: 'expanded', label: t('layout.options.lineLayout.expanded') },
          { value: 'compact', label: t('layout.options.lineLayout.compact') },
        ]"
        @update:modelValue="setLineLayout"
      />
    </FieldRow>

    <FieldRow
      :label="t('layout.fields.showSeparators.label')"
      path="showSeparators"
      :hint="t('layout.fields.showSeparators.hint')"
    >
      <ToggleSwitch :modelValue="cfg.showSeparators" @update:modelValue="setShowSeparators" />
    </FieldRow>

    <FieldRow
      :label="t('layout.fields.pathLevels.label')"
      path="pathLevels"
      :hint="t('layout.fields.pathLevels.hint')"
    >
      <SelectInput
        :modelValue="cfg.pathLevels"
        :options="[
          { value: 1, label: '1' },
          { value: 2, label: '2' },
          { value: 3, label: '3' },
        ]"
        @update:modelValue="setPathLevels"
      />
    </FieldRow>

    <FieldRow
      :label="t('layout.fields.maxWidth.label')"
      path="maxWidth"
      :hint="t('layout.fields.maxWidth.hint')"
    >
      <NumberInput
        :modelValue="cfg.maxWidth"
        :min="0"
        nullable
        :placeholder="t('layout.placeholders.maxWidth')"
        @update:modelValue="setMaxWidth"
      />
    </FieldRow>

    <FieldRow
      :label="t('layout.fields.forceMaxWidth.label')"
      path="forceMaxWidth"
      :hint="t('layout.fields.forceMaxWidth.hint')"
    >
      <ToggleSwitch :modelValue="cfg.forceMaxWidth" @update:modelValue="setForceMaxWidth" />
    </FieldRow>

    <FieldRow
      :label="t('layout.fields.elementOrder.label')"
      path="elementOrder"
      :hint="t('layout.fields.elementOrder.hint')"
    >
      <SortableList :modelValue="cfg.elementOrder" @update:modelValue="setElementOrder" />
    </FieldRow>
  </div>
</template>

<style scoped>
.layout-tab {
  display: flex;
  flex-direction: column;
}
</style>
