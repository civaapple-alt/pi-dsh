export interface PresetMetadata {
  name?: string
  description?: string
}

export interface AgentPreset {
  id: string
  name: string
  description: string
  path: string
  configPath: string
}
