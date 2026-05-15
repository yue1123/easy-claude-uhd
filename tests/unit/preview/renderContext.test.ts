import { describe, it, expect } from 'vitest'
import { renderContext } from '@/preview/lines/renderContext'
import { DEFAULT_CONFIG } from '@/lib/hud-schema'
import { MOCK_CONTEXT } from '@/lib/mock-context'

describe('renderContext', () => {
  it('returns one line under default', () => {
    const lines = renderContext(DEFAULT_CONFIG, MOCK_CONTEXT)
    expect(lines).toHaveLength(1)
    expect(lines[0].length).toBeGreaterThan(0)
  })

  it('default contains a label "ctx"', () => {
    const [line] = renderContext(DEFAULT_CONFIG, MOCK_CONTEXT)
    expect(line.map(s => s.text).join('')).toContain('ctx')
  })

  it('contextValue=percent shows "58%"', () => {
    const [line] = renderContext(DEFAULT_CONFIG, MOCK_CONTEXT)
    expect(line.map(s => s.text).join('')).toContain('58%')
  })

  it('contextValue=tokens shows token count', () => {
    const cfg = { ...DEFAULT_CONFIG, display: { ...DEFAULT_CONFIG.display, contextValue: 'tokens' as const } }
    const [line] = renderContext(cfg, MOCK_CONTEXT)
    expect(line.map(s => s.text).join('')).toMatch(/\d/)
  })

  it('contextValue=remaining shows remaining %', () => {
    const cfg = { ...DEFAULT_CONFIG, display: { ...DEFAULT_CONFIG.display, contextValue: 'remaining' as const } }
    const [line] = renderContext(cfg, MOCK_CONTEXT)
    expect(line.map(s => s.text).join('')).toContain('42%')
  })

  it('showContextBar=false omits the bar character', () => {
    const cfg = { ...DEFAULT_CONFIG, display: { ...DEFAULT_CONFIG.display, showContextBar: false } }
    const [line] = renderContext(cfg, MOCK_CONTEXT)
    const text = line.map(s => s.text).join('')
    expect(text).not.toContain('█')
    expect(text).not.toContain('░')
  })

  it('warning color when usage > warningThreshold but < criticalThreshold', () => {
    const ctx = { ...MOCK_CONTEXT, context: { ...MOCK_CONTEXT.context, usedPercentage: 75 } }
    const [line] = renderContext(DEFAULT_CONFIG, ctx)
    const valSpan = line.find(s => s.text.includes('75%'))
    expect(valSpan?.color).toBe('var(--color-named-yellow)')
  })

  it('critical color when usage > criticalThreshold', () => {
    const ctx = { ...MOCK_CONTEXT, context: { ...MOCK_CONTEXT.context, usedPercentage: 92 } }
    const [line] = renderContext(DEFAULT_CONFIG, ctx)
    const valSpan = line.find(s => s.text.includes('92%'))
    expect(valSpan?.color).toBe('var(--color-named-red)')
  })
})
