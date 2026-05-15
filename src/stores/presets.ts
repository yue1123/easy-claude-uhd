import type { HudConfig } from '@/lib/hud-schema'
import type { JsonObject } from '@/lib/path-set'

export interface Preset {
  id: string
  label: string
  description: string
  config: Partial<HudConfig> & JsonObject
}

export const PRESETS: Preset[] = [
  {
    id: 'default',
    label: 'Default',
    description: 'Upstream defaults — equivalent to an empty config.',
    config: {},
  },
  {
    id: 'minimal',
    label: 'Minimal',
    description: 'Just model badge + project + context. Everything else off.',
    config: {
      elementOrder: ['project', 'context'],
      display: {
        showTokenBreakdown: false,
        showUsage: false,
      } as never,
    },
  },
  {
    id: 'full-featured',
    label: 'Full-featured',
    description: 'Every information element visible.',
    config: {
      showSeparators: true,
      display: {
        showCost: true,
        showDuration: true,
        showSpeed: true,
        showSessionTokens: true,
        showClaudeCodeVersion: true,
        showOutputStyle: true,
        showEffortLevel: true,
        showSessionStartDate: true,
        showLastResponseAt: true,
        showTools: true,
        showAgents: true,
        showTodos: true,
        showMemoryUsage: true,
        showPromptCache: true,
        showConfigCounts: true,
      } as never,
    },
  },
  {
    id: 'cjk',
    label: 'CJK optimized',
    description: 'Chinese users — language=zh, compact layout, narrow bar chars.',
    config: {
      language: 'zh',
      pathLevels: 1,
      lineLayout: 'compact',
      colors: {
        barFilled: '#',
        barEmpty: '-',
      } as never,
    },
  },
  {
    id: 'dev-mode',
    label: 'Dev mode',
    description: 'Cost, duration, speed, token breakdown, Claude Code version.',
    config: {
      display: {
        showCost: true,
        showDuration: true,
        showSpeed: true,
        showTokenBreakdown: true,
        showClaudeCodeVersion: true,
        showSessionTokens: true,
      } as never,
    },
  },
  {
    id: 'compact-oneliner',
    label: 'Compact one-liner',
    description: 'Single-line dense layout — merge everything visible.',
    config: {
      lineLayout: 'compact',
      display: {
        mergeGroups: [['context', 'usage', 'memory']],
      } as never,
    },
  },
]
