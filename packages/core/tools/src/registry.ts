import { Context, Service } from '@deepseek-ai/cordis'
import type { ToolDefinition } from './types.js'

export class ToolRegistry extends Service {
  private tools = new Map<string, ToolDefinition>()

  constructor(ctx: Context) {
    super(ctx, 'tools')
  }

  public register(tool: ToolDefinition): () => void {
    if (this.tools.has(tool.name)) {
      console.warn(`[ToolRegistry] Tool '${tool.name}' is being overwritten.`)
    }
    this.tools.set(tool.name, tool)
    return () => {
      this.tools.delete(tool.name)
    }
  }

  public get(name: string): ToolDefinition | undefined {
    return this.tools.get(name)
  }

  public list(): ToolDefinition[] {
    return Array.from(this.tools.values())
  }

  public async execute(name: string, args: any, executionCtx: Context): Promise<{ content: string; isError?: boolean }> {
    const tool = this.get(name)
    if (!tool) {
      return {
        content: `Error: Tool '${name}' not found.`,
        isError: true
      }
    }

    try {
      const result = await tool.execute(args, executionCtx)
      return {
        content: typeof result === 'string' ? result : JSON.stringify(result, null, 2)
      }
    } catch (err: any) {
      return {
        content: `Error executing ${name}: ${err?.message || String(err)}`,
        isError: true
      }
    }
  }
}
