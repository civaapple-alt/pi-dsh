import fs from 'node:fs'
import path from 'node:path'
import yaml from 'js-yaml'
import type { Context } from '@deepseek-ai/cordis'

export type SeamRole = 'definition' | 'provider' | 'consumer' | 'framework'

export interface GraphNode {
  id: string
  label: string
  fullName: string
  category: 'host-core' | 'client-ui' | 'tool-seam' | 'storage' | 'agent-loop' | 'extension'
  seamRole: SeamRole
  isClient: boolean
  status: 'active' | 'pending' | 'failed'
  provides: string[]
  injects: string[]
  description: string
  config?: any
}

export interface GraphLink {
  source: string
  target: string
  service: string
  label: string
  type: 'service' | 'hierarchy'
}

export interface PluginGraphData {
  nodes: GraphNode[]
  links: GraphLink[]
  services: Array<{ name: string; providerId: string; consumers: string[] }>
  stats: {
    totalPlugins: number
    hostPlugins: number
    clientPlugins: number
    totalServices: number
    totalLinks: number
    activeCount: number
    pendingCount: number
    definitionsCount: number
    providersCount: number
    consumersCount: number
  }
}

/**
 * Build the full Cordis Plugin & Service Dependency Graph data with Capability Seam Roles
 */
export function buildPluginGraph(
  ctx: Context,
  profileFile: string,
  dshPackageMap: Map<string, string>
): PluginGraphData {
  const profileContent = fs.readFileSync(profileFile, 'utf8')
  const entries = (yaml.load(profileContent) as any[]) || []

  const nodes: GraphNode[] = []
  const serviceProviders = new Map<string, string>()
  const serviceConsumers = new Map<string, Set<string>>()

  // Helper to determine category
  function getCategory(name: string, isClient: boolean): GraphNode['category'] {
    if (isClient) return 'client-ui'
    if (name.includes('tool-') || name.includes('fs') || name.includes('bash') || name.includes('subprocess') || name.includes('shell')) return 'tool-seam'
    if (name.includes('storage')) return 'storage'
    if (name.includes('agent')) return 'agent-loop'
    if (name.includes('cordis') || name.includes('workflow') || name.includes('deliverables')) return 'extension'
    return 'host-core'
  }

  // Helper to determine Capability Seam Role
  function getSeamRole(name: string, isClient: boolean, provides: string[], injects: string[]): SeamRole {
    if (isClient) return 'consumer'
    if (name.includes('tool-') || name.includes('apiproxy') || name.includes('agent-loop')) return 'consumer'
    if (
      name.includes('-local') ||
      name.includes('shell-env') ||
      name.includes('llm-deepseek') ||
      name.includes('storage-json') ||
      name.includes('settings-file') ||
      name.includes('session-query') ||
      name.includes('host-webserver') ||
      name.includes('token-meter') ||
      name.includes('compaction')
    ) {
      return 'provider'
    }
    if (
      name === '@deepseek-ai/dsh-fs' ||
      name === '@deepseek-ai/dsh-subprocess' ||
      name === '@deepseek-ai/dsh-shell' ||
      name === '@deepseek-ai/dsh-llm' ||
      name === '@deepseek-ai/dsh-storage' ||
      name === '@deepseek-ai/dsh-session' ||
      name === '@deepseek-ai/dsh-subagent' ||
      name === '@deepseek-ai/dsh-attachment' ||
      name === '@deepseek-ai/dsh-tools'
    ) {
      return 'definition'
    }
    if (provides.length > 0) return 'provider'
    return 'framework'
  }

  // 1. Process all plugins from Profile
  for (const entry of entries) {
    const name = entry.name || entry.path
    if (!name) continue

    let pkg: any = null
    const entryPath = dshPackageMap.get(name)
    if (entryPath) {
      const pkgDir = path.dirname(path.dirname(entryPath))
      const pkgJsonFile = path.join(pkgDir, 'package.json')
      if (fs.existsSync(pkgJsonFile)) {
        try {
          pkg = JSON.parse(fs.readFileSync(pkgJsonFile, 'utf8'))
        } catch {}
      }
    }

    const isClient = pkg?.dsh?.client?.platform === 'web'
    const shortName = name
      .replace(/^@deepseek-ai\/dsh-/, '')
      .replace(/^@deepseek-ai\/cordis-plugin-/, 'plugin-')

    // Collect provided services
    const provides: string[] = []
    if (name.includes('webserver')) provides.push('webServer')
    if (name.includes('fs-local')) provides.push('fs')
    if (name.includes('subprocess-local') || name.includes('dsh-subprocess')) provides.push('subprocess')
    if (name.includes('shell-env')) provides.push('shellEnv')
    if (name.includes('dsh-shell') && !name.includes('env')) provides.push('shell')
    if (name.includes('llm-deepseek') || name.includes('dsh-llm')) provides.push('llm')
    if (name.includes('dsh-session') && !name.includes('query') && !name.includes('stats') && !name.includes('projection') && !name.includes('persistence')) provides.push('sessions')
    if (name.includes('dsh-tools')) provides.push('tools')
    if (name.includes('dsh-subagent') && !name.includes('tool-')) provides.push('subagents')
    if (name.includes('user-questions') && !isClient) provides.push('userQuestions')
    if (name.includes('dsh-workspace') && !isClient) provides.push('workspaceRegistry')
    if (name.includes('client-runtime')) provides.push('slots', 'sessions', 'workspaces')
    if (name.includes('client-locale')) provides.push('locale')
    if (name.includes('ui-theme')) provides.push('theme')
    if (name.includes('ui-layout')) provides.push('layout')
    if (name.includes('ui-sidebar')) provides.push('sidebar')
    if (name.includes('api-remotes')) provides.push('remote')
    if (name.includes('typert-registry')) provides.push('typert')
    if (name.includes('agent-default-model')) provides.push('agentDefaultModel')
    if (name.includes('agent-presets')) provides.push('agentPresets')
    if (name.includes('dsh-agent') && !name.includes('preset') && !name.includes('loop') && !name.includes('default')) provides.push('agents')
    if (name.includes('token-meter')) provides.push('tokenMeter')
    if (name.includes('input-trigger')) provides.push('inputTriggers')
    if (name.includes('ui-commands')) provides.push('commands')
    if (name.includes('dsh-storage') && !name.includes('json') && !name.includes('domain')) provides.push('storage')
    if (name.includes('settings-file')) provides.push('settings')
    if (name.includes('credentials-local')) provides.push('credentials')
    if (name.includes('directory-picker-browse') && !isClient) provides.push('directoryPicker')
    if (name.includes('attachment-local')) provides.push('attachments')

    for (const p of provides) {
      serviceProviders.set(p, name)
    }

    // Collect injected services
    const injects: string[] = []
    if (isClient && Array.isArray(pkg?.dsh?.client?.inject)) {
      injects.push(...pkg.dsh.client.inject)
    } else {
      if (name.includes('apiproxy')) {
        injects.push('agentDefaultModel', 'agents', 'attachments', 'directoryPicker', 'llm', 'sessions', 'subagents', 'tools', 'userQuestions', 'workspaceRegistry')
      } else if (name.includes('tool-fs-search')) {
        injects.push('tools', 'subprocess')
      } else if (name.includes('tool-fs') || name.includes('str-replace')) {
        injects.push('tools', 'fs')
      } else if (name.includes('tool-bash')) {
        injects.push('tools', 'shell', 'shellEnv')
      } else if (name.includes('tool-subagent')) {
        injects.push('tools', 'subagents')
      } else if (name.includes('tool-todo')) {
        injects.push('tools')
      } else if (name.includes('client-modules')) {
        injects.push('webServer', 'loader')
      } else if (name.includes('agent-loop')) {
        injects.push('agents', 'llm', 'tools', 'sessions')
      } else if (name.includes('agent-presets')) {
        injects.push('loader')
      }
    }

    for (const inj of injects) {
      if (!serviceConsumers.has(inj)) {
        serviceConsumers.set(inj, new Set())
      }
      serviceConsumers.get(inj)!.add(name)
    }

    const seamRole = getSeamRole(name, isClient, provides, injects)

    nodes.push({
      id: name,
      label: shortName,
      fullName: name,
      category: getCategory(name, isClient),
      seamRole,
      isClient,
      status: entry.disabled ? 'pending' : 'active',
      provides,
      injects,
      description: pkg?.description || '',
      config: entry.config,
    })
  }

  // 2. Build directed links (Consumer Plugin -> Provider Plugin)
  const links: GraphLink[] = []
  const linkSet = new Set<string>()

  for (const node of nodes) {
    for (const inj of node.injects) {
      const providerId = serviceProviders.get(inj)
      if (providerId && providerId !== node.id) {
        const linkKey = `${node.id}->${providerId}:${inj}`
        if (!linkSet.has(linkKey)) {
          linkSet.add(linkKey)
          links.push({
            source: node.id,
            target: providerId,
            service: inj,
            label: inj,
            type: 'service',
          })
        }
      }
    }
  }

  // 3. Assemble service metadata
  const services: Array<{ name: string; providerId: string; consumers: string[] }> = []
  for (const [sName, pId] of serviceProviders.entries()) {
    const consumers = Array.from(serviceConsumers.get(sName) || [])
    services.push({ name: sName, providerId: pId, consumers })
  }

  const hostPlugins = nodes.filter(n => !n.isClient).length
  const clientPlugins = nodes.filter(n => n.isClient).length

  return {
    nodes,
    links,
    services,
    stats: {
      totalPlugins: nodes.length,
      hostPlugins,
      clientPlugins,
      totalServices: services.length,
      totalLinks: links.length,
      activeCount: nodes.filter(n => n.status === 'active').length,
      pendingCount: nodes.filter(n => n.status !== 'active').length,
      definitionsCount: nodes.filter(n => n.seamRole === 'definition').length,
      providersCount: nodes.filter(n => n.seamRole === 'provider').length,
      consumersCount: nodes.filter(n => n.seamRole === 'consumer').length,
    },
  }
}
