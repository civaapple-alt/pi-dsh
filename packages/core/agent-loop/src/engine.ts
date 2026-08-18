import { Context } from '@deepseek-ai/cordis'
import type { Agent, AgentFactory, AgentInbox, AgentStatus, CreateAgentOptions, ToolCallRecord, UserMessage } from '@pi-dsh/agent'
import type {} from '@pi-dsh/agent-presets'
import type {} from '@pi-dsh/system-prompt'
import type {} from '@pi-dsh/tools'

export interface AgentLoopConfig {
  defaultProvider?: string
  defaultModel?: string
}

class SimpleInbox implements AgentInbox {
  private queue: UserMessage[] = []

  public append(msg: UserMessage) {
    this.queue.push(msg)
  }

  public claim(): UserMessage[] {
    const list = [...this.queue]
    this.queue = []
    return list
  }

  public clear() {
    this.queue = []
  }

  public peek(): UserMessage[] {
    return [...this.queue]
  }
}

export class AgentInstance implements Agent {
  public id: string
  public ctx: Context
  public status: AgentStatus = 'idle'
  public options: CreateAgentOptions
  public inbox: AgentInbox = new SimpleInbox()
  private messageHistory: any[] = []
  private abortController?: AbortController

  constructor(ctx: Context, options: CreateAgentOptions) {
    this.id = options.id
    this.ctx = ctx
    this.options = options
  }

  public async followup(content: string): Promise<void> {
    const userMsg: UserMessage = {
      id: Math.random().toString(36).slice(2),
      role: 'user',
      content,
      timestamp: Date.now()
    }
    this.inbox.append(userMsg)
    await this.runTurn()
  }

  public cancel(reason = 'Cancelled by user') {
    if (this.abortController) {
      this.abortController.abort(reason)
    }
    this.status = 'idle'
  }

  public async whenIdle(): Promise<void> {
    while (this.status === 'running') {
      await new Promise(r => setTimeout(r, 50))
    }
  }

  public async dispose(): Promise<void> {
    this.cancel('Disposed')
    this.status = 'disposed'
  }

  private async runTurn() {
    if (this.status === 'running') {
      return
    }

    this.status = 'running'
    this.abortController = new AbortController()

    const claimed = this.inbox.claim()
    const promptText = claimed.map(m => m.content).join('\n')

    this.ctx.emit('agent/turn-start', this, promptText)

    try {
      // 1. Assemble System Prompt
      const systemPromptService: any = this.ctx.get('systemPrompt')
      const systemPrompt = systemPromptService
        ? await systemPromptService.render()
        : 'You are an intelligent coding agent.'

      // 2. Prepare Tools Schema
      const toolsService: any = this.ctx.get('tools')
      const tools = toolsService ? toolsService.list() : []
      const openAiTools = tools.map((t: any) => ({
        type: 'function',
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters
        }
      }))

      // 3. Prepare messages for LLM
      if (this.messageHistory.length === 0 && systemPrompt) {
        this.messageHistory.push({ role: 'system', content: systemPrompt })
      }
      this.messageHistory.push({ role: 'user', content: promptText })

      let continueLoop = true
      let turnStep = 0
      const maxSteps = this.options.maxTurns || 20

      while (continueLoop && turnStep < maxSteps) {
        turnStep++

        const response = await this.callLlmStream(this.messageHistory, openAiTools, this.abortController.signal)
        
        // Add assistant message to history
        const assistantMsg: any = {
          role: 'assistant',
          content: response.content || ''
        }

        if (response.toolCalls && response.toolCalls.length > 0) {
          assistantMsg.tool_calls = response.toolCalls.map(tc => ({
            id: tc.id,
            type: 'function',
            function: {
              name: tc.name,
              arguments: JSON.stringify(tc.arguments)
            }
          }))
        }

        this.messageHistory.push(assistantMsg)

        // Execute tool calls if any
        if (response.toolCalls && response.toolCalls.length > 0) {
          for (const tc of response.toolCalls) {
            this.ctx.emit('agent/tool-call', this, tc)

            const result = toolsService
              ? await toolsService.execute(tc.name, tc.arguments, this.ctx)
              : { content: `Error: Tools service unavailable`, isError: true }
            tc.result = result

            this.ctx.emit('agent/tool-result', this, tc, result)

            this.messageHistory.push({
              role: 'tool',
              tool_call_id: tc.id,
              name: tc.name,
              content: result.content
            })
          }
          // Loop again to give model the tool results
          continueLoop = true
        } else {
          // Model finished with direct answer
          continueLoop = false
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log(`\x1b[33m[AgentLoop]\x1b[0m Turn aborted.`)
      } else {
        console.error(`\x1b[31m[AgentLoop Error]\x1b[0m`, err?.message || err)
      }
    } finally {
      this.status = 'idle'
      this.ctx.emit('agent/turn-end', this)
    }
  }

  private async callLlmStream(
    messages: any[],
    tools: any[],
    signal: AbortSignal
  ): Promise<{ content: string; reasoningContent: string; toolCalls: ToolCallRecord[] }> {
    const apiKey = process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY || ''
    const baseURL = process.env.DEEPSEEK_BASE_URL || process.env.OPENAI_BASE_URL || 'https://api.deepseek.com'
    const model = this.options.model || process.env.DEEPSEEK_MODEL || 'deepseek-chat'

    if (!apiKey && !baseURL.includes('localhost') && !baseURL.includes('127.0.0.1')) {
      const mockReply = `⚠️ [Agent Warning] DEEPSEEK_API_KEY or OPENAI_API_KEY environment variable is not set. Please provide API key in .env or environment to talk to real LLM.\n\nHere are available tools: ${tools.map(t => t.function.name).join(', ')}`
      this.ctx.emit('agent/chunk', this, mockReply)
      return { content: mockReply, reasoningContent: '', toolCalls: [] }
    }

    const payload: any = {
      model,
      messages,
      stream: true
    }

    if (tools.length > 0) {
      payload.tools = tools
      payload.tool_choice = 'auto'
    }

    const res = await fetch(`${baseURL.replace(/\/+$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload),
      signal
    })

    if (!res.ok) {
      const errorText = await res.text()
      throw new Error(`LLM HTTP Error ${res.status}: ${errorText}`)
    }

    let fullContent = ''
    let fullReasoning = ''
    const toolCallsMap = new Map<number, { id: string; name: string; argsStr: string }>()

    const reader = res.body?.getReader()
    if (!reader) throw new Error('No response body from LLM')

    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith('data:')) continue
        const dataStr = trimmed.replace(/^data:\s*/, '')
        if (dataStr === '[DONE]') break

        try {
          const json = JSON.parse(dataStr)
          const delta = json.choices?.[0]?.delta

          if (delta?.reasoning_content) {
            fullReasoning += delta.reasoning_content
            this.ctx.emit('agent/thinking', this, delta.reasoning_content)
          }

          if (delta?.content) {
            fullContent += delta.content
            this.ctx.emit('agent/chunk', this, delta.content)
          }

          if (delta?.tool_calls) {
            for (const tc of delta.tool_calls) {
              const index = tc.index ?? 0
              if (!toolCallsMap.has(index)) {
                toolCallsMap.set(index, {
                  id: tc.id || `call_${Math.random().toString(36).slice(2)}`,
                  name: tc.function?.name || '',
                  argsStr: ''
                })
              }
              const current = toolCallsMap.get(index)!
              if (tc.id) current.id = tc.id
              if (tc.function?.name) {
                if (!current.name) {
                  current.name = tc.function.name
                } else if (!current.name.includes(tc.function.name)) {
                  current.name += tc.function.name
                }
              }
              if (tc.function?.arguments) current.argsStr += tc.function.arguments
            }
          }
        } catch {}
      }
    }

    const toolCalls: ToolCallRecord[] = []
    for (const [, tc] of toolCallsMap.entries()) {
      let parsedArgs = {}
      try {
        parsedArgs = JSON.parse(tc.argsStr)
      } catch {
        parsedArgs = { raw: tc.argsStr }
      }
      toolCalls.push({
        id: tc.id,
        name: tc.name,
        arguments: parsedArgs
      })
    }

    return {
      content: fullContent,
      reasoningContent: fullReasoning,
      toolCalls
    }
  }
}

export class AgentLoopEngine implements AgentFactory {
  private ctx: Context

  constructor(ctx: Context) {
    this.ctx = ctx
  }

  public async create(options: CreateAgentOptions): Promise<Agent> {
    const agentCtx = this.ctx.isolate('tools')
    agentCtx.isolate('systemPrompt')
    const agent = new AgentInstance(agentCtx, options)

    // Mount preset into agent context if preset is configured
    if (this.ctx.agentPresets && options.preset) {
      await this.ctx.agentPresets.mount(agentCtx, options.preset)
    }

    if (options.setup) {
      await options.setup(agentCtx)
    }

    this.ctx.agents.register(agent)
    return agent
  }
}
