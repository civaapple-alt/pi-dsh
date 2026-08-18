import type { Context } from '@deepseek-ai/cordis'

export type AgentStatus = 'idle' | 'running' | 'paused' | 'disposed'

export interface UserMessage {
  id: string
  role: 'user'
  content: string
  timestamp: number
}

export interface AssistantMessage {
  role: 'assistant'
  content: string
  thinking?: string
  toolCalls?: ToolCallRecord[]
}

export interface ToolCallRecord {
  id: string
  name: string
  arguments: Record<string, any>
  result?: ToolResult
}

export interface ToolResult {
  content: string
  isError?: boolean
}

export interface AgentOptions {
  id: string
  provider?: string
  model?: string
  preset?: string
  cwd?: string
  maxTurns?: number
}

export interface AgentInbox {
  append(message: UserMessage): void
  claim(): UserMessage[]
  clear(): void
  peek(): UserMessage[]
}

export interface Agent {
  id: string
  ctx: Context
  status: AgentStatus
  options: AgentOptions
  inbox: AgentInbox
  followup(content: string): Promise<void>
  cancel(reason?: string): void
  whenIdle(): Promise<void>
  dispose(): Promise<void>
}

export interface CreateAgentOptions extends AgentOptions {
  setup?: (agentCtx: Context) => Promise<void> | void
}

export interface AgentFactory {
  create(options: CreateAgentOptions): Promise<Agent>
}
