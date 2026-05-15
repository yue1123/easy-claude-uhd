import type { HudConfig } from '@/lib/hud-schema'
import type { MockContext } from '@/lib/mock-context'
import type { RenderLine } from '@/preview/types'
import { hudColorToCss } from '@/preview/color-map'

export function renderEnvironment(cfg: HudConfig, ctx: MockContext): RenderLine[] {
  if (!cfg.display.showConfigCounts) return []
  const labelColor = hudColorToCss(cfg.colors.label)
  const valueColor = hudColorToCss(cfg.colors.custom)
  const env = ctx.environment
  return [[
    { text: 'env ', color: labelColor },
    { text: `CLAUDE.md×${env.claudeMdCount}`, color: valueColor },
    { text: ' · ' },
    { text: `rules×${env.rulesCount}`, color: valueColor },
    { text: ' · ' },
    { text: `mcp×${env.mcpCount}`, color: valueColor },
    { text: ' · ' },
    { text: `hooks×${env.hooksCount}`, color: valueColor },
  ]]
}
