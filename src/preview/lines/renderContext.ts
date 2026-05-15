import type { HudConfig } from '@/lib/hud-schema'
import type { MockContext } from '@/lib/mock-context'
import type { RenderLine, RenderSpan } from '@/preview/types'
import { hudColorToCss } from '@/preview/color-map'

const BAR_WIDTH = 10

function makeBar(usedPct: number, filled: string, empty: string): string {
  const filledCount = Math.round((Math.max(0, Math.min(100, usedPct)) / 100) * BAR_WIDTH)
  return filled.repeat(filledCount) + empty.repeat(BAR_WIDTH - filledCount)
}

function pickContextColor(usedPct: number, cfg: HudConfig): string {
  const { contextWarningThreshold, contextCriticalThreshold } = cfg.display
  if (usedPct >= contextCriticalThreshold) return hudColorToCss(cfg.colors.critical)
  if (usedPct >= contextWarningThreshold) return hudColorToCss(cfg.colors.warning)
  return hudColorToCss(cfg.colors.context)
}

function formatValue(cfg: HudConfig, ctx: MockContext): string {
  const used = ctx.context.usedPercentage
  switch (cfg.display.contextValue) {
    case 'percent':
      return `${used}%`
    case 'tokens': {
      const total = ctx.context.inputTokens + ctx.context.outputTokens
      return `${total.toLocaleString()} tok`
    }
    case 'remaining':
      return `${100 - used}%`
    case 'both':
      return `${used}% / ${(100 - used)}% rem`
  }
}

export function renderContext(cfg: HudConfig, ctx: MockContext): RenderLine[] {
  const color = pickContextColor(ctx.context.usedPercentage, cfg)
  const labelColor = hudColorToCss(cfg.colors.label)
  const spans: RenderSpan[] = []

  spans.push({ text: 'ctx ', color: labelColor })

  if (cfg.display.showContextBar) {
    const bar = makeBar(ctx.context.usedPercentage, cfg.colors.barFilled, cfg.colors.barEmpty)
    spans.push({ text: bar, color })
    spans.push({ text: ' ' })
  }

  spans.push({ text: formatValue(cfg, ctx), color })

  if (cfg.display.showTokenBreakdown && cfg.display.contextValue !== 'tokens') {
    const t = ctx.context
    spans.push({ text: ` (in ${t.inputTokens.toLocaleString()}/out ${t.outputTokens.toLocaleString()})`, dim: true })
  }

  return [spans]
}
