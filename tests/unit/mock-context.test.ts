import { describe, it, expect } from 'vitest'
import { MOCK_CONTEXT } from '@/lib/mock-context'

describe('mock-context', () => {
  it('exposes a model display name', () => {
    expect(MOCK_CONTEXT.model.displayName).toBe('Opus 4.7')
  })

  it('project path ends with claude-uhd-cc', () => {
    expect(MOCK_CONTEXT.project.cwd.endsWith('claude-uhd-cc')).toBe(true)
  })

  it('context usage is 58%', () => {
    expect(MOCK_CONTEXT.context.usedPercentage).toBe(58)
  })

  it('5h usage is 22, 7d usage is 5', () => {
    expect(MOCK_CONTEXT.usage.fiveHour).toBe(22)
    expect(MOCK_CONTEXT.usage.sevenDay).toBe(5)
  })

  it('git is clean and 3 ahead on main', () => {
    expect(MOCK_CONTEXT.git.branch).toBe('main')
    expect(MOCK_CONTEXT.git.dirty).toBe(false)
    expect(MOCK_CONTEXT.git.ahead).toBe(3)
    expect(MOCK_CONTEXT.git.behind).toBe(0)
  })

  it('todos: 2 of 5 done', () => {
    expect(MOCK_CONTEXT.todos.filter(t => t.status === 'completed')).toHaveLength(2)
    expect(MOCK_CONTEXT.todos).toHaveLength(5)
  })

  it('memory usage is 31%', () => {
    expect(MOCK_CONTEXT.memory.usedPercent).toBe(31)
  })

  it('environment threshold counters', () => {
    expect(MOCK_CONTEXT.environment.claudeMdCount).toBe(4)
    expect(MOCK_CONTEXT.environment.mcpCount).toBe(2)
    expect(MOCK_CONTEXT.environment.hooksCount).toBe(1)
  })
})
