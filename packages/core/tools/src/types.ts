import type { Context } from '@deepseek-ai/cordis'

export interface ToolParameterProperty {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array'
  description?: string
  enum?: string[]
  items?: any
}

export interface ToolParametersSchema {
  type: 'object'
  properties: Record<string, ToolParameterProperty>
  required?: string[]
}

export interface ToolDefinition<TParams = any> {
  name: string
  description: string
  parameters: ToolParametersSchema
  execute: (args: TParams, ctx: Context) => Promise<string> | string
}
