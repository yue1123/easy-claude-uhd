import { describe, it, expect } from 'vitest'
import { renderTools, renderAgents, renderTodos } from '@/preview/lines/renderActivity'
import { DEFAULT_CONFIG } from '@/lib/hud-schema'
import { MOCK_CONTEXT } from '@/lib/mock-context'

describe('renderActivity', () => {
  it('renderTools is empty when showTools=false (default)', () => {
    expect(renderTools(DEFAULT_CONFIG, MOCK_CONTEXT)).toHaveLength(0)
  })

  it('renderTools lists the mocked tool names when enabled', () => {
    const cfg = { ...DEFAULT_CONFIG, display: { ...DEFAULT_CONFIG.display, showTools: true } }
    const [line] = renderTools(cfg, MOCK_CONTEXT)
    const text = line.map(s => s.text).join('')
    expect(text).toContain('Read')
    expect(text).toContain('Edit')
    expect(text).toContain('Bash')
  })

  it('renderAgents lists running agent type when enabled', () => {
    const cfg = { ...DEFAULT_CONFIG, display: { ...DEFAULT_CONFIG.display, showAgents: true } }
    const [line] = renderAgents(cfg, MOCK_CONTEXT)
    const text = line.map(s => s.text).join('')
    expect(text).toContain('explore')
  })

  it('renderTodos shows 2/5 when enabled', () => {
    const cfg = { ...DEFAULT_CONFIG, display: { ...DEFAULT_CONFIG.display, showTodos: true } }
    const [line] = renderTodos(cfg, MOCK_CONTEXT)
    const text = line.map(s => s.text).join('')
    expect(text).toContain('2/5')
  })
})
