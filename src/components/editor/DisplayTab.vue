<script setup lang="ts">
import { computed } from 'vue'
import { useConfigStore } from '@/stores/config'
import FieldRow from '@/components/form/FieldRow.vue'
import SelectInput from '@/components/form/SelectInput.vue'
import NumberInput from '@/components/form/NumberInput.vue'
import TextInput from '@/components/form/TextInput.vue'

const store = useConfigStore()
const d = computed(() => store.parsedConfig.display)

function set(path: string, v: unknown) {
  store.patchField(`display.${path}`, v)
}
</script>

<template>
  <div class="display-tab">
    <h3 class="section-title">Context display</h3>
    <FieldRow
      label="contextValue"
      path="display.contextValue"
      hint="What to show as the context number."
    >
      <SelectInput
        :modelValue="d.contextValue"
        :options="[
          { value: 'percent', label: 'percent' },
          { value: 'tokens', label: 'tokens' },
          { value: 'remaining', label: 'remaining' },
          { value: 'both', label: 'both' },
        ]"
        @update:modelValue="set('contextValue', $event)"
      />
    </FieldRow>
    <FieldRow label="autocompactBuffer" path="display.autocompactBuffer">
      <SelectInput
        :modelValue="d.autocompactBuffer"
        :options="[
          { value: 'enabled', label: 'enabled' },
          { value: 'disabled', label: 'disabled' },
        ]"
        @update:modelValue="set('autocompactBuffer', $event)"
      />
    </FieldRow>

    <h3 class="section-title">Usage display</h3>
    <FieldRow label="usageValue" path="display.usageValue">
      <SelectInput
        :modelValue="d.usageValue"
        :options="[
          { value: 'percent', label: 'percent' },
          { value: 'remaining', label: 'remaining' },
        ]"
        @update:modelValue="set('usageValue', $event)"
      />
    </FieldRow>
    <FieldRow
      label="usageCompact"
      path="display.usageCompact"
      hint="Compress the usage line to fewer characters."
    >
      <SelectInput
        :modelValue="d.usageCompact ? 'on' : 'off'"
        :options="[
          { value: 'off', label: 'off' },
          { value: 'on', label: 'on' },
        ]"
        @update:modelValue="set('usageCompact', $event === 'on')"
      />
    </FieldRow>

    <h3 class="section-title">Model</h3>
    <FieldRow label="modelFormat" path="display.modelFormat">
      <SelectInput
        :modelValue="d.modelFormat"
        :options="[
          { value: 'full', label: 'full' },
          { value: 'compact', label: 'compact' },
          { value: 'short', label: 'short' },
        ]"
        @update:modelValue="set('modelFormat', $event)"
      />
    </FieldRow>
    <FieldRow
      label="modelOverride"
      path="display.modelOverride"
      hint="If set, this string replaces the model display name entirely. Max 80 chars."
    >
      <TextInput
        :modelValue="d.modelOverride"
        :maxLength="80"
        placeholder="e.g. Claude"
        @update:modelValue="set('modelOverride', $event)"
      />
    </FieldRow>

    <h3 class="section-title">Time</h3>
    <FieldRow label="timeFormat" path="display.timeFormat">
      <SelectInput
        :modelValue="d.timeFormat"
        :options="[
          { value: 'relative', label: 'relative' },
          { value: 'absolute', label: 'absolute' },
          { value: 'both', label: 'both' },
        ]"
        @update:modelValue="set('timeFormat', $event)"
      />
    </FieldRow>

    <h3 class="section-title">Project</h3>
    <FieldRow label="addedDirsLayout" path="display.addedDirsLayout">
      <SelectInput
        :modelValue="d.addedDirsLayout"
        :options="[
          { value: 'inline', label: 'inline' },
          { value: 'line', label: 'line' },
        ]"
        @update:modelValue="set('addedDirsLayout', $event)"
      />
    </FieldRow>

    <h3 class="section-title">Prompt cache</h3>
    <FieldRow
      label="promptCacheTtlSeconds"
      path="display.promptCacheTtlSeconds"
      hint="Anthropic API cache TTL (default 300)."
    >
      <NumberInput
        :modelValue="d.promptCacheTtlSeconds"
        :min="1"
        @update:modelValue="set('promptCacheTtlSeconds', $event ?? 1)"
      />
    </FieldRow>

    <h3 class="section-title">External usage</h3>
    <FieldRow
      label="externalUsagePath"
      path="display.externalUsagePath"
      hint="Path to an external JSON snapshot of usage data."
    >
      <TextInput
        :modelValue="d.externalUsagePath"
        placeholder="/path/to/usage.json"
        @update:modelValue="set('externalUsagePath', $event)"
      />
    </FieldRow>
    <FieldRow
      label="externalUsageFreshnessMs"
      path="display.externalUsageFreshnessMs"
      hint="Max age of the external snapshot before it's considered stale."
    >
      <NumberInput
        :modelValue="d.externalUsageFreshnessMs"
        :min="0"
        @update:modelValue="set('externalUsageFreshnessMs', $event ?? 0)"
      />
    </FieldRow>

    <h3 class="section-title">Custom</h3>
    <FieldRow
      label="customLine"
      path="display.customLine"
      hint="Free-form extra line appended at the end. Max 80 chars."
    >
      <TextInput
        :modelValue="d.customLine"
        :maxLength="80"
        placeholder=""
        @update:modelValue="set('customLine', $event)"
      />
    </FieldRow>
  </div>
</template>

<style scoped>
.display-tab {
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
