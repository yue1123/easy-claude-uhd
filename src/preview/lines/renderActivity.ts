import type { HudConfig } from '@/lib/hud-schema'
import type { MockContext } from '@/lib/mock-context'
import type { RenderLine } from '@/preview/types'
import { hudColorToCss } from '@/preview/color-map'

export function renderTools(cfg: HudConfig, ctx: MockContext): RenderLine[] {
  if (!cfg.display.showTools || ctx.tools.length === 0) return []
  const labelColor = hudColorToCss(cfg.colors.label)
  const valueColor = hudColorToCss(cfg.colors.custom)
  const names = ctx.tools.map(t => t.target ? `${t.name}·${t.target}` : t.name).join(' ')
  return [[
    { text: '🛠 ', color: labelColor },
    { text: names, color: valueColor },
  ]]
}

export function renderAgents(cfg: HudConfig, ctx: MockContext): RenderLine[] {
  if (!cfg.display.showAgents || ctx.agents.length === 0) return []
  const labelColor = hudColorToCss(cfg.colors.label)
  const valueColor = hudColorToCss(cfg.colors.custom)
  const labels = ctx.agents.map(a => `${a.type}${a.status === 'running' ? '(running)' : ''}`).join(' · ')
  return [[
    { text: '🤖 ', color: labelColor },
    { text: labels, color: valueColor },
  ]]
}

export function renderTodos(cfg: HudConfig, ctx: MockContext): RenderLine[] {
  if (!cfg.display.showTodos || ctx.todos.length === 0) return []
  const labelColor = hudColorToCss(cfg.colors.label)
  const valueColor = hudColorToCss(cfg.colors.custom)
  const done = ctx.todos.filter(t => t.status === 'completed').length
  const inProgress = ctx.todos.find(t => t.status === 'in_progress')
  const headline = inProgress ? ` · ${inProgress.content}` : ''
  return [[
    { text: '✓ ', color: labelColor },
    { text: `${done}/${ctx.todos.length}`, color: valueColor },
    { text: headline, dim: true },
  ]]
}
