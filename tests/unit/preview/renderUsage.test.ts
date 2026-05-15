import { describe, it, expect } from 'vitest'
import { renderUsage } from '@/preview/lines/renderUsage'
import { DEFAULT_CONFIG } from '@/lib/hud-schema'
import { MOCK_CONTEXT } from '@/lib/mock-context'

describe('renderUsage', () => {
  it('returns one line with 5h and 7d labels by default', () => {
    const [line] = renderUsage(DEFAULT_CONFIG, MOCK_CONTEXT)
    const text = line.map(s => s.text).join('')
    expect(text).toContain('5h')
    expect(text).toContain('7d')
  })

  it('shows 22% for 5h, 5% for 7d', () => {
    const [line] = renderUsage(DEFAULT_CONFIG, MOCK_CONTEXT)
    const text = line.map(s => s.text).join('')
    expect(text).toContain('22%')
    expect(text).toContain('5%')
  })

  it('usageBarEnabled=false omits bars', () => {
    const cfg = { ...DEFAULT_CONFIG, display: { ...DEFAULT_CONFIG.display, usageBarEnabled: false } }
    const [line] = renderUsage(cfg, MOCK_CONTEXT)
    const text = line.map(s => s.text).join('')
    expect(text).not.toContain('█')
  })

  it('showUsage=false returns no lines', () => {
    const cfg = { ...DEFAULT_CONFIG, display: { ...DEFAULT_CONFIG.display, showUsage: false } }
    expect(renderUsage(cfg, MOCK_CONTEXT)).toHaveLength(0)
  })

  it('usageValue=remaining shows "78%" for 5h', () => {
    const cfg = { ...DEFAULT_CONFIG, display: { ...DEFAULT_CONFIG.display, usageValue: 'remaining' as const } }
    const [line] = renderUsage(cfg, MOCK_CONTEXT)
    const text = line.map(s => s.text).join('')
    expect(text).toContain('78%')
  })

  it('over usageThreshold warns with magenta color', () => {
    const ctx = { ...MOCK_CONTEXT, usage: { ...MOCK_CONTEXT.usage, fiveHour: 88 } }
    const cfg = { ...DEFAULT_CONFIG, display: { ...DEFAULT_CONFIG.display, usageThreshold: 80 } }
    const [line] = renderUsage(cfg, ctx)
    const valSpan = line.find(s => s.text.includes('88%'))
    expect(valSpan?.color).toBe('var(--color-named-brightMagenta)')
  })
})
