import { Context } from '@deepseek-ai/cordis'
import type {} from '@pi-dsh/agent'
import type {} from '@pi-dsh/agent-presets'
import { AgentLoopEngine, type AgentLoopConfig } from './engine.js'

export * from './engine.js'

export function apply(ctx: Context, config?: AgentLoopConfig) {
  ctx.inject(['agents', 'agentPresets'], (ctx) => {
    ctx.effect(() => {
      const engine = new AgentLoopEngine(ctx)
      const unSet = ctx.agents.setFactory(engine)
      console.log('\x1b[36m[Agent Loop]\x1b[0m Factory registered with AgentRegistry.')
      return () => {
        unSet()
      }
    })
  })
}
