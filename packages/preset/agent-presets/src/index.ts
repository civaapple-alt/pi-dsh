import { Context } from '@deepseek-ai/cordis'
import { AgentPresetsService, type AgentPresetsConfig } from './roster.js'

export * from './types.js'
export * from './roster.js'

declare module '@deepseek-ai/cordis' {
  interface Context {
    agentPresets: AgentPresetsService
  }
}

export function apply(ctx: Context, config?: AgentPresetsConfig) {
  ctx.plugin(AgentPresetsService, config)
}
