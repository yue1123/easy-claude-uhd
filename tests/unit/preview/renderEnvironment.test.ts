import { describe, it, expect } from 'vitest'
import { renderEnvironment } from '@/preview/lines/renderEnvironment'
import { DEFAULT_CONFIG } from '@/lib/hud-schema'
import { MOCK_CONTEXT } from '@/lib/mock-context'

describe('renderEnvironment', () => {
  it('returns nothing when showConfigCounts=false (default)', () => {
    expect(renderEnvironment(DEFAULT_CONFIG, MOCK_CONTEXT)).toHaveLength(0)
  })

  it('shows the four counts when showConfigCounts=true', () => {
    const cfg = { ...DEFAULT_CONFIG, display: { ...DEFAULT_CONFIG.display, showConfigCounts: true } }
    const [line] = renderEnvironment(cfg, MOCK_CONTEXT)
    const text = line.map(s => s.text).join('')
    expect(text).toContain('CLAUDE.md×4')
    expect(text).toContain('rules×2')
    expect(text).toContain('mcp×2')
    expect(text).toContain('hooks×1')
  })
})
