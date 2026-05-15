import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { HudConfig } from '@/lib/hud-schema'
import { mergeConfig } from '@/lib/merge-config'
import { setPath, deletePath, getPath, type JsonObject } from '@/lib/path-set'

export const useConfigStore = defineStore('config', () => {
  const rawJson = ref<JsonObject>({})

  const parsedConfig = computed<HudConfig>(() => mergeConfig(rawJson.value))

  function patchField(path: string, value: unknown): void {
    rawJson.value = setPath(rawJson.value, path, value)
  }

  function clearField(path: string): void {
    rawJson.value = deletePath(rawJson.value, path)
  }

  function readField(path: string): unknown {
    return getPath(rawJson.value, path)
  }

  function setRawJson(next: JsonObject): void {
    rawJson.value = { ...next }
  }

  function reset(): void {
    rawJson.value = {}
  }

  return { rawJson, parsedConfig, patchField, clearField, readField, setRawJson, reset }
})
