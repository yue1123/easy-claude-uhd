import type { HudConfig } from '@/lib/hud-schema'
import type { JsonObject } from '@/lib/path-set'

export interface Preset {
  id: string
  labelKey: string
  descriptionKey: string
  config: Partial<HudConfig> & JsonObject
}

export const PRESETS: Preset[] = [
  {
    id: 'default',
    labelKey: 'presets.default.label',
    descriptionKey: 'presets.default.description',
    config: {},
  },
  {
    id: 'minimal',
    labelKey: 'presets.minimal.label',
    descriptionKey: 'presets.minimal.description',
    config: {
      lineLayout: 'compact',
      elementOrder: ['project', 'context'],
      display: {
        showTokenBreakdown: false,
        showUsage: false,
      } as never,
    },
  },
  {
    id: 'developer',
    labelKey: 'presets.developer.label',
    descriptionKey: 'presets.developer.description',
    config: {
      pathLevels: 2,
      elementOrder: ['project', 'context', 'sessionTime'],
      gitStatus: {
        enabled: true,
        showDirty: true,
        showAheadBehind: true,
        showFileStats: true,
      } as never,
      display: {
        modelFormat: 'short',
        showUsage: false,
        showTokenBreakdown: false,
      } as never,
    },
  },
  {
    id: 'cost-usage',
    labelKey: 'presets.costUsage.label',
    descriptionKey: 'presets.costUsage.description',
    config: {
      elementOrder: ['project', 'context', 'usage', 'sessionTime'],
      display: {
        showCost: true,
        showContextBar: true,
        showUsage: true,
        usageBarEnabled: true,
        showResetLabel: true,
        showTokenBreakdown: false,
        showSessionStartDate: true,
        timeFormat: 'both',
        contextWarningThreshold: 50,
        contextCriticalThreshold: 80,
        usageThreshold: 90,
        sevenDayThreshold: 90,
      } as never,
    },
  },
  {
    id: 'power-user',
    labelKey: 'presets.powerUser.label',
    descriptionKey: 'presets.powerUser.description',
    config: {
      lineLayout: 'expanded',
      showSeparators: true,
      gitStatus: {
        showAheadBehind: true,
        showFileStats: true,
      } as never,
      display: {
        showCost: true,
        showDuration: true,
        showSpeed: true,
        showTokenBreakdown: true,
        showSessionTokens: true,
        showClaudeCodeVersion: true,
        showEffortLevel: true,
        showOutputStyle: true,
        showProvider: true,
        showAdvisor: true,
        showTools: true,
        showSkills: true,
        showMcp: true,
        showAgents: true,
        showTodos: true,
        showConfigCounts: true,
        showMemoryUsage: true,
        showPromptCache: true,
        showCompactions: true,
        showSessionStartDate: true,
        showLastResponseAt: true,
      } as never,
    },
  },
  {
    id: 'cjk',
    labelKey: 'presets.cjk.label',
    descriptionKey: 'presets.cjk.description',
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
    id: 'aesthetic',
    labelKey: 'presets.aesthetic.label',
    descriptionKey: 'presets.aesthetic.description',
    config: {
      lineLayout: 'compact',
      showSeparators: true,
      display: {
        showCost: true,
        showTokenBreakdown: false,
        mergeGroups: [
          ['context', 'usage'],
          ['tools', 'skills', 'mcp', 'agents'],
        ],
      } as never,
      colors: {
        context: 'green',
        usage: 'cyan',
        model: 'brightMagenta',
        project: 'brightBlue',
        gitBranch: 'yellow',
        barFilled: '▓',
        barEmpty: '░',
      } as never,
    },
  },
  {
    id: 'efficiency',
    labelKey: 'presets.efficiency.label',
    descriptionKey: 'presets.efficiency.description',
    config: {
      lineLayout: 'compact',
      elementOrder: ['project', 'context', 'promptCache', 'usage'],
      display: {
        showSpeed: true,
        showDuration: true,
        showTokenBreakdown: true,
        showPromptCache: true,
        showSessionTokens: true,
        showCost: true,
        showUsage: false,
      } as never,
    },
  },
]
