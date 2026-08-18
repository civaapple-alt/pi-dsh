import { Context, Service } from '@deepseek-ai/cordis'
import type { Agent, AgentFactory, CreateAgentOptions } from './types.js'

export class AgentRegistry extends Service {
  private agents = new Map<string, Agent>()
  private factory?: AgentFactory

  constructor(ctx: Context) {
    super(ctx, 'agents')
  }

  public setFactory(factory: AgentFactory): () => void {
    if (this.factory) {
      throw new Error('[AgentRegistry] An AgentFactory is already registered.')
    }
    this.factory = factory
    return () => {
      this.factory = undefined
    }
  }

  public register(agent: Agent): () => void {
    if (this.agents.has(agent.id)) {
      throw new Error(`[AgentRegistry] Agent with id '${agent.id}' is already registered.`)
    }
    this.agents.set(agent.id, agent)
    this.ctx.emit('agent/created', agent)

    return () => {
      this.agents.delete(agent.id)
      this.ctx.emit('agent/disposed', agent)
    }
  }

  public get(id: string): Agent | undefined {
    return this.agents.get(id)
  }

  public list(): Agent[] {
    return Array.from(this.agents.values())
  }

  public async create(options: CreateAgentOptions): Promise<Agent> {
    if (!this.factory) {
      throw new Error('[AgentRegistry] No AgentFactory registered. Ensure @pi-dsh/agent-loop is loaded.')
    }
    return this.factory.create(options)
  }
}
