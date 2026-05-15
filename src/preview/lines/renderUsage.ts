import type { HudConfig } from '@/lib/hud-schema'
import type { MockContext } from '@/lib/mock-context'
import type { RenderLine, RenderSpan } from '@/preview/types'
import { hudColorToCss } from '@/preview/color-map'

const BAR_WIDTH = 10

function makeBar(usedPct: number, filled: string, empty: string): string {
  const filledCount = Math.round((Math.max(0, Math.min(100, usedPct)) / 100) * BAR_WIDTH)
  return filled.repeat(filledCount) + empty.repeat(BAR_WIDTH - filledCount)
}

function pickUsageColor(usedPct: number, threshold: number, cfg: HudConfig): string {
  if (threshold > 0 && usedPct >= threshold) return hudColorToCss(cfg.colors.usageWarning)
  return hudColorToCss(cfg.colors.usage)
}

function formatVal(used: number, mode: 'percent' | 'remaining'): string {
  return mode === 'remaining' ? `${100 - used}%` : `${used}%`
}

function pushSegment(
  spans: RenderSpan[],
  label: string,
  used: number,
  threshold: number,
  cfg: HudConfig,
  labelColor: string,
): void {
  spans.push({ text: label + ' ', color: labelColor })
  if (cfg.display.usageBarEnabled) {
    const bar = makeBar(used, cfg.colors.barFilled, cfg.colors.barEmpty)
    spans.push({ text: bar, color: pickUsageColor(used, threshold, cfg) })
    spans.push({ text: ' ' })
  }
  spans.push({ text: formatVal(used, cfg.display.usageValue), color: pickUsageColor(used, threshold, cfg) })
}

export function renderUsage(cfg: HudConfig, ctx: MockContext): RenderLine[] {
  if (!cfg.display.showUsage) return []
  const labelColor = hudColorToCss(cfg.colors.label)
  const spans: RenderSpan[] = []

  pushSegment(spans, '5h', ctx.usage.fiveHour, cfg.display.usageThreshold, cfg, labelColor)
  spans.push({ text: '  ' })
  pushSegment(spans, '7d', ctx.usage.sevenDay, cfg.display.sevenDayThreshold, cfg, labelColor)

  if (cfg.display.showResetLabel) {
    spans.push({
      text: ` (reset in ${ctx.usage.fiveHourResetAtMinutes}m / ${Math.round(ctx.usage.sevenDayResetAtMinutes / 60)}h)`,
      dim: true,
    })
  }

  return [spans]
}
