import { Context, Service } from '@deepseek-ai/cordis'
import fs from 'node:fs'
import path from 'node:path'
import yaml from 'js-yaml'
import type { AgentPreset, PresetMetadata } from './types.js'

export interface AgentPresetsConfig {
  default?: string
  roots?: string[]
}

const dshPackageMap = new Map<string, string>()

function buildDshPackageMap() {
  if (dshPackageMap.size > 0) return
  const roots = [
    path.resolve(process.cwd(), '../deepseek-harness/packages'),
    path.resolve(process.cwd(), '../deepseek-harness/vendor')
  ]

  for (const root of roots) {
    if (!fs.existsSync(root)) continue
    for (const group of fs.readdirSync(root, { withFileTypes: true })) {
      if (!group.isDirectory()) continue
      const groupPath = path.join(root, group.name)
      if (fs.existsSync(path.join(groupPath, 'package.json'))) {
        try {
          const pkg = JSON.parse(fs.readFileSync(path.join(groupPath, 'package.json'), 'utf8'))
          if (pkg.name) {
            const entry = fs.existsSync(path.join(groupPath, 'lib/index.js'))
              ? path.join(groupPath, 'lib/index.js')
              : path.join(groupPath, 'src/index.ts')
            dshPackageMap.set(pkg.name, entry)
          }
        } catch {}
      } else {
        for (const sub of fs.readdirSync(groupPath, { withFileTypes: true })) {
          if (!sub.isDirectory()) continue
          const subPath = path.join(groupPath, sub.name)
          const pkgFile = path.join(subPath, 'package.json')
          if (fs.existsSync(pkgFile)) {
            try {
              const pkg = JSON.parse(fs.readFileSync(pkgFile, 'utf8'))
              if (pkg.name) {
                const entry = fs.existsSync(path.join(subPath, 'lib/index.js'))
                  ? path.join(subPath, 'lib/index.js')
                  : path.join(subPath, 'src/index.ts')
                dshPackageMap.set(pkg.name, entry)
              }
            } catch {}
          }
        }
      }
    }
  }
}

export class AgentPresetsService extends Service {
  public defaultId: string
  private roots: string[]

  constructor(ctx: Context, config: AgentPresetsConfig = {}) {
    super(ctx, 'agentPresets')
    this.defaultId = config.default || 'coder'
    this.roots = (config.roots && config.roots.length > 0)
      ? config.roots
      : [path.resolve(process.cwd(), 'presets')]
    buildDshPackageMap()
  }

  public async list(): Promise<AgentPreset[]> {
    const results: AgentPreset[] = []

    for (const root of this.roots) {
      if (!fs.existsSync(root)) continue
      const entries = fs.readdirSync(root, { withFileTypes: true })
      for (const entry of entries) {
        if (!entry.isDirectory()) continue
        const presetDir = path.join(root, entry.name)
        const configFile = path.join(presetDir, 'agent.cordis.yml')
        const metaFile = path.join(presetDir, 'preset.yml')

        if (fs.existsSync(configFile)) {
          let meta: PresetMetadata = {}
          if (fs.existsSync(metaFile)) {
            try {
              meta = (yaml.load(fs.readFileSync(metaFile, 'utf8')) as PresetMetadata) || {}
            } catch {}
          }

          results.push({
            id: entry.name,
            name: meta.name || entry.name,
            description: meta.description || `Agent preset '${entry.name}'`,
            path: presetDir,
            configPath: configFile
          })
        }
      }
    }

    return results
  }

  public async resolve(id?: string): Promise<AgentPreset> {
    const targetId = id || this.defaultId
    const list = await this.list()
    const found = list.find(p => p.id === targetId)
    if (!found) {
      throw new Error(`[AgentPresets] Preset '${targetId}' not found. Available presets: [${list.map(p => p.id).join(', ')}]`)
    }
    return found
  }

  public async mount(agentCtx: Context, id?: string): Promise<AgentPreset> {
    const preset = await this.resolve(id)
    const content = fs.readFileSync(preset.configPath, 'utf8')
    const parsed = yaml.load(content) as Array<{ name?: string; path?: string; config?: any; disabled?: boolean }>

    if (Array.isArray(parsed)) {
      for (const item of parsed) {
        if (item.disabled) continue
        const pluginTarget = item.name || item.path
        if (!pluginTarget) continue

        let mod: any
        try {
          if (dshPackageMap.has(pluginTarget)) {
            mod = await import(dshPackageMap.get(pluginTarget)!)
          } else if (pluginTarget.startsWith('.') || path.isAbsolute(pluginTarget)) {
            const resolvedPath = path.resolve(preset.path, pluginTarget)
            mod = await import(resolvedPath)
          } else {
            mod = await import(pluginTarget)
          }

          const plugin = mod.default || mod
          await agentCtx.plugin(plugin, item.config)
        } catch (err: any) {
          console.error(`\x1b[31m[AgentPresets]\x1b[0m Failed to mount plugin '${pluginTarget}' in preset '${preset.id}':`, err?.message || err)
        }
      }
    }

    return preset
  }
}
