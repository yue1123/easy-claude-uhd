import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import ElementsTab from '@/components/editor/ElementsTab.vue'
import { useConfigStore } from '@/stores/config'

describe('ElementsTab', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('renders the toggle for showTools', () => {
    const w = mount(ElementsTab)
    expect(w.text()).toContain('showTools')
  })

  it('toggling showTools writes to store', async () => {
    const store = useConfigStore()
    const w = mount(ElementsTab)
    const toggles = w.findAll('button.toggle')
    const showTools = toggles.find((b) =>
      b.element.closest('.field-row')?.textContent?.includes('showTools'),
    )!
    await showTools.trigger('click')
    expect(store.rawJson).toEqual({ display: { showTools: true } })
  })
})
