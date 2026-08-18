import { Context } from '@deepseek-ai/cordis'
import { ToolRegistry } from './registry.js'

export * from './types.js'
export * from './registry.js'

declare module '@deepseek-ai/cordis' {
  interface Context {
    tools: ToolRegistry
  }
}

export function apply(ctx: Context) {
  ctx.plugin(ToolRegistry)
}
