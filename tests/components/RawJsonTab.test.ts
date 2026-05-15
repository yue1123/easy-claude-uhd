import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import RawJsonTab from '@/components/editor/RawJsonTab.vue'
import { useConfigStore } from '@/stores/config'

describe('RawJsonTab', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('shows current rawJson formatted', () => {
    const store = useConfigStore()
    store.setRawJson({ lineLayout: 'compact' })
    const w = mount(RawJsonTab)
    const text = (w.find('textarea').element as HTMLTextAreaElement).value
    expect(text).toContain('"lineLayout": "compact"')
  })

  it('valid JSON on blur updates the store', async () => {
    const store = useConfigStore()
    const w = mount(RawJsonTab)
    const ta = w.find('textarea')
    await ta.setValue('{"pathLevels": 3}')
    await ta.trigger('blur')
    expect(store.rawJson).toEqual({ pathLevels: 3 })
  })

  it('invalid JSON on blur surfaces an error and leaves store untouched', async () => {
    const store = useConfigStore()
    store.setRawJson({ pathLevels: 2 })
    const w = mount(RawJsonTab)
    const ta = w.find('textarea')
    await ta.setValue('{"pathLevels": 3,,,')
    await ta.trigger('blur')
    expect(store.rawJson).toEqual({ pathLevels: 2 })
    expect(w.find('.json-error').exists()).toBe(true)
  })

  it('non-object root rejected', async () => {
    const store = useConfigStore()
    store.setRawJson({ pathLevels: 2 })
    const w = mount(RawJsonTab)
    const ta = w.find('textarea')
    await ta.setValue('[1,2,3]')
    await ta.trigger('blur')
    expect(store.rawJson).toEqual({ pathLevels: 2 })
    expect(w.find('.json-error').text()).toContain('must be a JSON object')
  })
})
