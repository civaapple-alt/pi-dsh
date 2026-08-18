import { Context } from '@deepseek-ai/cordis'
import { AgentRegistry } from './registry.js'

export * from './types.js'
export * from './registry.js'

declare module '@deepseek-ai/cordis' {
  interface Context {
    agents: AgentRegistry
  }

  interface Events {
    'agent/created'(agent: import('./types.js').Agent): void
    'agent/disposed'(agent: import('./types.js').Agent): void
    'agent/turn-start'(agent: import('./types.js').Agent, prompt: string): void
    'agent/turn-end'(agent: import('./types.js').Agent): void
    'agent/chunk'(agent: import('./types.js').Agent, delta: string): void
    'agent/thinking'(agent: import('./types.js').Agent, delta: string): void
    'agent/tool-call'(agent: import('./types.js').Agent, call: import('./types.js').ToolCallRecord): void
    'agent/tool-result'(agent: import('./types.js').Agent, call: import('./types.js').ToolCallRecord, result: import('./types.js').ToolResult): void
  }
}

export function apply(ctx: Context) {
  ctx.plugin(AgentRegistry)
}
