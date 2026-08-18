import { Context, Service } from '@deepseek-ai/cordis'

export interface PromptSection {
  id: string
  priority?: number
  content: string | (() => string | Promise<string>)
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    systemPrompt: SystemPromptRegistry
  }
}

export class SystemPromptRegistry extends Service {
  private sections = new Map<string, PromptSection>()

  constructor(ctx: Context) {
    super(ctx, 'systemPrompt')
  }

  public register(section: PromptSection): () => void {
    this.sections.set(section.id, section)
    return () => {
      this.sections.delete(section.id)
    }
  }

  public async render(): Promise<string> {
    const list = Array.from(this.sections.values()).sort(
      (a, b) => (b.priority ?? 0) - (a.priority ?? 0)
    )

    const rendered: string[] = []
    for (const item of list) {
      if (typeof item.content === 'function') {
        rendered.push(await item.content())
      } else {
        rendered.push(item.content)
      }
    }
    return rendered.filter(Boolean).join('\n\n')
  }
}

export function apply(ctx: Context) {
  ctx.plugin(SystemPromptRegistry)
}
