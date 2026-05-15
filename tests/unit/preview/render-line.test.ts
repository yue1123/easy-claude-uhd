import { describe, it, expect } from 'vitest'
import { renderAll } from '@/preview/render-line'
import { DEFAULT_CONFIG } from '@/lib/hud-schema'
import { MOCK_CONTEXT } from '@/lib/mock-context'

describe('render-line orchestrator', () => {
  it('renders at least project + context lines by default', () => {
    const lines = renderAll(DEFAULT_CONFIG, MOCK_CONTEXT)
    const text = lines.map(l => l.map(s => s.text).join('')).join('\n')
    expect(text).toContain('Opus 4.7')
    expect(text).toContain('claude-uhd-cc')
    expect(text).toContain('ctx')
  })

  it('merges context + usage onto one line under default mergeGroups', () => {
    const lines = renderAll(DEFAULT_CONFIG, MOCK_CONTEXT)
    const merged = lines.find(l => {
      const t = l.map(s => s.text).join('')
      return t.includes('ctx') && t.includes('5h')
    })
    expect(merged).toBeDefined()
  })

  it('elementOrder=[] returns empty (no element lines)', () => {
    const cfg = { ...DEFAULT_CONFIG, elementOrder: [] }
    expect(renderAll(cfg, MOCK_CONTEXT)).toEqual([])
  })

  it('elementOrder=[project] returns only the project line', () => {
    const cfg = { ...DEFAULT_CONFIG, elementOrder: ['project'] as const, display: { ...DEFAULT_CONFIG.display, mergeGroups: [] } }
    const lines = renderAll(cfg, MOCK_CONTEXT)
    expect(lines).toHaveLength(1)
    expect(lines[0].map(s => s.text).join('')).toContain('claude-uhd-cc')
  })
})
