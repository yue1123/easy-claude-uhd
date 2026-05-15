import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import HudPreview from '@/preview/HudPreview.vue'
import { DEFAULT_CONFIG } from '@/lib/hud-schema'

describe('HudPreview', () => {
  it('renders project + context content with DEFAULT_CONFIG', () => {
    const w = mount(HudPreview, { props: { config: DEFAULT_CONFIG } })
    expect(w.text()).toContain('Opus 4.7')
    expect(w.text()).toContain('claude-uhd-cc')
    expect(w.text()).toContain('ctx')
  })

  it('renders nothing when elementOrder is empty', () => {
    const cfg = { ...DEFAULT_CONFIG, elementOrder: [] }
    const w = mount(HudPreview, { props: { config: cfg } })
    expect(w.find('.preview-line').exists()).toBe(false)
  })
})
