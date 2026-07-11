import { describe, it, expect } from 'vitest'
import { PRESETS } from '@/stores/presets'

describe('presets', () => {
  it('has 8 presets', () => {
    expect(PRESETS).toHaveLength(8)
  })

  it('each preset has id, labelKey, descriptionKey, config', () => {
    for (const p of PRESETS) {
      expect(p.id).toBeTruthy()
      expect(p.labelKey).toBeTruthy()
      expect(p.labelKey).toMatch(/^presets\./)
      expect(p.descriptionKey).toBeTruthy()
      expect(p.descriptionKey).toMatch(/^presets\./)
      expect(typeof p.config).toBe('object')
    }
  })

  it('Default preset is the empty config', () => {
    expect(PRESETS[0]!.id).toBe('default')
    expect(PRESETS[0]!.labelKey).toBe('presets.default.label')
    expect(PRESETS[0]!.config).toEqual({})
  })

  it('Power-user has showCost, showDuration, showSpeed', () => {
    const full = PRESETS.find((p) => p.id === 'power-user')!
    const d = full.config.display as Record<string, unknown> | undefined
    expect(d?.showCost).toBe(true)
    expect(d?.showDuration).toBe(true)
    expect(d?.showSpeed).toBe(true)
  })

  it('Cost & Usage tracker enables cost and community thresholds', () => {
    const cost = PRESETS.find((p) => p.id === 'cost-usage')!
    const d = cost.config.display as Record<string, unknown> | undefined
    expect(d?.showCost).toBe(true)
    expect(d?.sevenDayThreshold).toBe(90)
  })

  it('CJK preset has language=zh', () => {
    const cjk = PRESETS.find((p) => p.id === 'cjk')!
    expect(cjk.config.language).toBe('zh')
  })
})
