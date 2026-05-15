import type { HudConfig, HudElement } from '@/lib/hud-schema'
import type { MockContext } from '@/lib/mock-context'
import type { RenderLine, RenderSpan } from '@/preview/types'

import { renderProject } from '@/preview/lines/renderProject'
import { renderContext } from '@/preview/lines/renderContext'
import { renderUsage } from '@/preview/lines/renderUsage'
import { renderPromptCache } from '@/preview/lines/renderPromptCache'
import { renderMemory } from '@/preview/lines/renderMemory'
import { renderEnvironment } from '@/preview/lines/renderEnvironment'
import { renderTools, renderAgents, renderTodos } from '@/preview/lines/renderActivity'
import { renderSessionTime } from '@/preview/lines/renderSessionTime'

type Renderer = (cfg: HudConfig, ctx: MockContext) => RenderLine[]

const RENDERERS: Record<HudElement, Renderer> = {
  project: renderProject,
  addedDirs: () => [],   // handled inside renderProject
  context: renderContext,
  usage: renderUsage,
  promptCache: renderPromptCache,
  memory: renderMemory,
  environment: renderEnvironment,
  tools: renderTools,
  agents: renderAgents,
  todos: renderTodos,
  sessionTime: renderSessionTime,
}

function buildMergeLookup(groups: HudElement[][]): Map<HudElement, Set<HudElement>> {
  const lookup = new Map<HudElement, Set<HudElement>>()
  for (const group of groups) {
    const set = new Set(group)
    for (const el of group) {
      if (!lookup.has(el)) lookup.set(el, set)
    }
  }
  return lookup
}

const SEPARATOR: RenderSpan = { text: ' │ ', dim: true }

export function renderAll(cfg: HudConfig, ctx: MockContext): RenderLine[] {
  const order = cfg.elementOrder
  const mergeLookup = buildMergeLookup(cfg.display.mergeGroups)
  const seen = new Set<HudElement>()
  const out: RenderLine[] = []

  for (let i = 0; i < order.length; i++) {
    const el = order[i] as HudElement
    if (seen.has(el)) continue

    const group = mergeLookup.get(el)
    if (group) {
      const sequence: HudElement[] = []
      for (let j = i; j < order.length; j++) {
        const next = order[j] as HudElement
        if (!group.has(next) || seen.has(next)) break
        sequence.push(next)
      }
      const rendered = sequence
        .map(e => ({ el: e, lines: RENDERERS[e]!(cfg, ctx) }))
        .filter(r => r.lines.length > 0)
      sequence.forEach(e => seen.add(e))
      i += sequence.length - 1

      if (rendered.length > 1) {
        const combined: RenderLine = []
        rendered.forEach((r, idx) => {
          if (idx > 0) combined.push(SEPARATOR)
          combined.push(...(r.lines[0] as RenderLine))
          for (let k = 1; k < r.lines.length; k++) out.push(r.lines[k] as RenderLine)
        })
        out.push(combined)
        continue
      }
      if (rendered.length === 1) {
        for (const line of rendered[0]!.lines) out.push(line)
      }
      continue
    }

    seen.add(el)
    const lines = RENDERERS[el]!(cfg, ctx)
    for (const line of lines) out.push(line)
  }

  return out
}
