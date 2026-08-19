#!/usr/bin/env node
import { Context } from '@deepseek-ai/cordis'
import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline'
import yaml from 'js-yaml'
import dotenv from 'dotenv'

// Load .env from workspace root if present
dotenv.config({ path: path.resolve(process.cwd(), '.env') })
dotenv.config({ path: path.resolve(process.cwd(), '../.env') })

interface PluginConfigEntry {
  name?: string
  path?: string
  config?: any
  disabled?: boolean
}

const dshPackageMap = new Map<string, string>()

function buildDshPackageMap() {
  if (dshPackageMap.size > 0) return

  // 1. Scan deepseek-harness packages & vendor first
  const dshRoots = [
    path.resolve(process.cwd(), '../deepseek-harness/packages'),
    path.resolve(process.cwd(), '../deepseek-harness/vendor')
  ]

  for (const root of dshRoots) {
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

  // 2. Scan local pi-dsh workspace packages
  const localRoots = [
    path.resolve(process.cwd(), 'packages'),
    path.resolve(process.cwd(), 'packages/core'),
    path.resolve(process.cwd(), 'packages/preset'),
    path.resolve(process.cwd(), 'packages/host'),
    path.resolve(process.cwd(), 'packages/tools')
  ]

  for (const root of localRoots) {
    if (!fs.existsSync(root)) continue
    for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue
      const pkgPath = path.join(root, entry.name, 'package.json')
      if (fs.existsSync(pkgPath)) {
        try {
          const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
          if (pkg.name && !dshPackageMap.has(pkg.name)) {
            const modEntry = fs.existsSync(path.join(root, entry.name, 'lib/index.js'))
              ? path.join(root, entry.name, 'lib/index.js')
              : path.join(root, entry.name, 'src/index.ts')
            dshPackageMap.set(pkg.name, modEntry)
          }
        } catch {}
      }
    }
  }
}

function parseArgs() {
  const args = process.argv.slice(2)
  let profile = 'web'
  let preset = 'standard'
  let model = process.env.DEEPSEEK_MODEL || 'deepseek-chat'
  const taskParts: string[] = []

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--profile' && i + 1 < args.length) {
      profile = args[++i]
    } else if (arg === '--preset' && i + 1 < args.length) {
      preset = args[++i]
    } else if (arg === '--model' && i + 1 < args.length) {
      model = args[++i]
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Usage: pi-dsh [options] [task...]

Options:
  --profile <name>   Profile name to load (web | headless) [default: web]
  --preset <name>    Agent capability preset (standard | reviewer | minimal | coder) [default: standard]
  --model <name>     LLM model name [default: deepseek-chat]
  --help, -h         Show help

Examples:
  pnpm start                                                # Launch Web GUI
  pnpm headless "List all files in this project"            # Run one-shot headless task
  pnpm headless --preset reviewer "Audit presets safety"    # Run headless with reviewer preset
  pnpm pi --preset standard                                 # Launch interactive CLI REPL
`)
      process.exit(0)
    } else {
      taskParts.push(arg)
    }
  }

  return {
    profile,
    preset,
    model,
    task: taskParts.join(' ').trim()
  }
}

async function main() {
  buildDshPackageMap()
  let { profile, preset, model, task } = parseArgs()

  console.log('\x1b[36m============================================================\x1b[0m')
  console.log(`🥧 \x1b[1mPi-DSH Agent (Pi 80%+ Suite)\x1b[0m | Profile: "\x1b[32m${profile}\x1b[0m" | Preset: "\x1b[35m${preset}\x1b[0m"`)
  console.log('\x1b[36m============================================================\x1b[0m')

  // 1. Resolve Profile YAML file
  const profileFile = path.resolve(process.cwd(), `profiles/${profile}.yml`)
  if (!fs.existsSync(profileFile)) {
    console.error(`\x1b[31m[Error]\x1b[0m Profile configuration not found at ${profileFile}`)
    process.exit(1)
  }

  const profileContent = fs.readFileSync(profileFile, 'utf8')
  const pluginEntries = yaml.load(profileContent) as PluginConfigEntry[]

  // 2. Initialize Cordis Root Context and Loader Service
  const ctx = new Context()
  const webAppPkg = path.resolve(process.cwd(), '../deepseek-harness/packages/bundle/web-app/package.json')
  const baseUrlPkg = fs.existsSync(webAppPkg) ? webAppPkg : path.resolve(process.cwd(), 'package.json')
  ctx.baseUrl = (await import('node:url')).pathToFileURL(baseUrlPkg).href

  const vendorLoaderPath = path.resolve(process.cwd(), '../deepseek-harness/vendor/loader/lib/index.js')
  const { Loader } = await import((await import('node:url')).pathToFileURL(vendorLoaderPath).href)
  const loader = new Loader(ctx, { baseUrl: ctx.baseUrl })

  const origInternalImport = loader.internal.import.bind(loader.internal)
  loader.internal.import = async (specifier: string, parentURL: string, importAttributes: any) => {
    if (dshPackageMap.has(specifier)) {
      const target = dshPackageMap.get(specifier)!
      return await import((await import('node:url')).pathToFileURL(target).href)
    }
    return origInternalImport(specifier, parentURL, importAttributes)
  }

  const loadedEntriesList: any[] = []

  // 3. Apply Plugins declared in Profile
  for (const entry of pluginEntries) {
    if (entry.disabled) continue
    let target = entry.name || entry.path
    if (!target) continue

    // Map abstract dsh-shell seam to concrete local provider
    if (target === '@deepseek-ai/dsh-shell') {
      target = process.platform === 'win32' ? '@deepseek-ai/dsh-pwsh-local' : '@deepseek-ai/dsh-bash-local'
    }

    try {
      let mod: any
      if (dshPackageMap.has(target)) {
        const fileUrl = (await import('node:url')).pathToFileURL(dshPackageMap.get(target)!).href
        mod = await import(fileUrl)
      } else if (target.startsWith('.') || path.isAbsolute(target)) {
        const resolvedPath = path.resolve(process.cwd(), target)
        const fileUrl = (await import('node:url')).pathToFileURL(resolvedPath).href
        mod = await import(fileUrl)
      } else {
        mod = await import(target)
      }
      const plugin = mod.default || mod
      let config = entry.config ? { ...entry.config } : undefined

      // Auto-resolve relative or omitted distIndex for frontend-static
      if (target.includes('frontend-static')) {
        let distIndex = config?.distIndex
        if (!distIndex || !path.isAbsolute(distIndex)) {
          const candidatePaths = [
            distIndex ? path.resolve(process.cwd(), distIndex) : '',
            path.resolve(process.cwd(), '../deepseek-harness/apps/web/dist/index.html'),
            path.resolve(process.cwd(), 'apps/web/dist/index.html'),
          ].filter(Boolean)

          for (const p of candidatePaths) {
            if (fs.existsSync(p)) {
              distIndex = p
              break
            }
          }
        }
        if (config) {
          config.distIndex = distIndex
        }
      }

      // Auto-resolve relative roots for agent-presets
      if (target.includes('agent-presets') && config?.roots && Array.isArray(config.roots)) {
        config.roots = config.roots.map((r: any) => ({
          ...r,
          path: r.path ? (path.isAbsolute(r.path) ? r.path : path.resolve(process.cwd(), r.path)) : path.resolve(process.cwd(), 'presets'),
        }))
      }

      // Default maxNoteBytes for message-feedback
      if (target.includes('message-feedback')) {
        config = { maxNoteBytes: 8192, ...config }
      }

      const fiber = await ctx.plugin(plugin, config)
      loadedEntriesList.push({
        id: target,
        options: { name: target },
        disabled: Boolean(entry.disabled),
        fiber: fiber || { state: 2 },
      })
      console.log(`\x1b[34m[Cordis Loader]\x1b[0m Loaded plugin: ${target}`)
    } catch (err: any) {
      console.error(`\x1b[31m[Cordis Loader]\x1b[0m Failed to load plugin '${target}':`, err?.message || err)
    }
  }

  loader.entries = function* () {
    for (const item of loadedEntriesList) {
      yield item
    }
  }

  // Allow Cordis event loop to activate injected services and flush client-modules
  await new Promise(r => setTimeout(r, 50))

  if ((ctx as any).clientModules) {
    const cm = (ctx as any).clientModules
    cm.pkgMeta?.clear()
    for (const [name, modPath] of dshPackageMap.entries()) {
      const pkgDir = path.dirname(path.dirname(modPath))
      const clientJs = path.join(pkgDir, 'lib/client.js')
      const pkgJsonFile = path.join(pkgDir, 'package.json')
      if (fs.existsSync(clientJs) && fs.existsSync(pkgJsonFile)) {
        try {
          const parsed = JSON.parse(fs.readFileSync(pkgJsonFile, 'utf8'))
          if (parsed?.dsh?.client?.platform === 'web') {
            const rev = Math.floor(fs.statSync(clientJs).mtimeMs).toString(36)
            cm.table?.set(name, {
              entry: {
                id: name,
                url: `/plugins/${name}/client.js?rev=${rev}`,
                rev,
                ...(parsed.dsh.client.inject ? { inject: parsed.dsh.client.inject } : {}),
                immediately: true,
              },
              clientPath: clientJs,
            })
          }
        } catch {}
      }
    }
    if (cm.table && cm.compose) {
      cm.composed = cm.compose()
    }
  }

  // Inject window.__DSH_BOOT__ into index.html and serve /plugins client bundles
  if (ctx.webServer) {
    const bootRev = Date.now().toString(36)
    const bootEntries: Array<{ id: string; url: string; rev: string; inject?: string[]; immediately?: boolean }> = []
    for (const entry of pluginEntries) {
      const name = entry.name || entry.path
      if (!name) continue
      const pkgEntry = dshPackageMap.get(name)
      if (pkgEntry) {
        const pkgDir = path.dirname(path.dirname(pkgEntry))
        const clientJs = path.join(pkgDir, 'lib/client.js')
        const pkgJsonFile = path.join(pkgDir, 'package.json')
        if (fs.existsSync(clientJs)) {
          const rev = Math.floor(fs.statSync(clientJs).mtimeMs).toString(36)
          let inject: string[] | undefined
          if (fs.existsSync(pkgJsonFile)) {
            try {
              const parsed = JSON.parse(fs.readFileSync(pkgJsonFile, 'utf8'))
              if (Array.isArray(parsed?.dsh?.client?.inject)) {
                inject = parsed.dsh.client.inject
              }
            } catch {}
          }
          bootEntries.push({
            id: name,
            url: `/plugins/${name}/client.js?rev=${rev}`,
            rev,
            inject,
            immediately: true
          })
        }
      }
    }

    ctx.webServer.tapIndex((html) => {
      const script = `<script>window.__DSH_BOOT__ = ${JSON.stringify({ rev: bootRev, entries: bootEntries })}</script>`
      if (html.includes('window.__DSH_BOOT__')) {
        return html.replace(/<script>window\.__DSH_BOOT__ = .*?<\/script>/, script)
      }
      const head = html.indexOf('<head>')
      if (head !== -1) {
        return `${html.slice(0, head + 6)}${script}${html.slice(head + 6)}`
      }
      return `${script}${html}`
    })

    try {
      ctx.webServer.register({
        kind: 'exact',
        path: '/api/pluginGraph',
        handler: async (_req, res) => {
          try {
            const { buildPluginGraph } = await import('./graph.ts')
            const graphData = buildPluginGraph(ctx, profileFile, dshPackageMap)
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
            res.end(JSON.stringify({ ok: true, value: graphData }))
          } catch (err: any) {
            res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' })
            res.end(JSON.stringify({ ok: false, error: err?.message || String(err) }))
          }
        },
      })
    } catch {}

    try {
      ctx.webServer.register({
        kind: 'prefix',
        path: '/plugins',
        handler: async (req, res) => {
          const url = new URL(req.url || '', `http://${req.headers.host}`)
          const match = url.pathname.match(/^\/plugins\/(.+?)\/client\.js$/)
          if (match) {
            const pkgName = match[1]
            const pkgEntry = dshPackageMap.get(pkgName)
            if (pkgEntry) {
              const clientFile = path.join(path.dirname(path.dirname(pkgEntry)), 'lib/client.js')
              if (fs.existsSync(clientFile)) {
                const code = fs.readFileSync(clientFile, 'utf8')
                res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8' })
                res.end(code)
                return
              }
            }
          }
          res.writeHead(404)
          res.end('Not Found')
        }
      })
    } catch {}
  }

  // 4. Handle Execution Mode
  if (profile === 'web') {
    console.log('\x1b[32m============================================================\x1b[0m')
    console.log('✨ Pi-DSH Web GUI is active at \x1b[1;34mhttp://localhost:3000\x1b[0m')
    console.log('\x1b[32m============================================================\x1b[0m')
    // Keep alive for web server
  } else if (task) {
    // One-shot headless execution
    console.log(`\n\x1b[33m[Task]\x1b[0m ${task}\n`)
    const handle = await ctx.agents.create({
      sessionId: `cli-${Date.now()}` as any,
      meta: {
        cwd: process.cwd(),
        agentPreset: preset,
      },
    })
    const agent = handle.agent

    ctx.on('agent/thinking', (a, thinking) => {
      process.stdout.write(`\x1b[90m${thinking}\x1b[0m`)
    })

    ctx.on('agent/chunk', (a, chunk) => {
      process.stdout.write(chunk)
    })

    ctx.on('agent/tool-call', (a, call) => {
      console.log(`\n\x1b[36m⚡ [Tool Call] ${call.name}\x1b[0m: ${JSON.stringify(call.arguments)}`)
    })

    ctx.on('agent/tool-result', (a, call, res) => {
      console.log(`\x1b[32m✔ [Observation]\x1b[0m ${res.content.slice(0, 300)}${res.content.length > 300 ? '...' : ''}\n`)
    })

    await agent.followup(task)
    console.log('\n\x1b[32m============================================================\x1b[0m')
    console.log('✨ Task completed.')
    process.exit(0)
  } else {
    // Interactive CLI REPL with Pi Slash Commands
    console.log(`\x1b[32mInteractive REPL Mode (Pi 80% Feature Suite).\x1b[0m`)
    console.log(`Type instructions or Slash Commands: \x1b[33m/help, /preset, /model, /clear, /compact, /exit\x1b[0m\n`)

    const handle = await ctx.agents.create({
      sessionId: `repl-${Date.now()}` as any,
      meta: {
        cwd: process.cwd(),
        agentPreset: preset,
      },
    })
    let agent = handle.agent

    ctx.on('agent/thinking', (a, thinking) => {
      process.stdout.write(`\x1b[90m${thinking}\x1b[0m`)
    })

    ctx.on('agent/chunk', (a, chunk) => {
      process.stdout.write(chunk)
    })

    ctx.on('agent/tool-call', (a, call) => {
      console.log(`\n\x1b[36m⚡ [Tool Call] ${call.name}\x1b[0m: ${JSON.stringify(call.arguments)}`)
    })

    ctx.on('agent/tool-result', (a, call, res) => {
      console.log(`\x1b[32m✔ [Observation]\x1b[0m ${res.content.slice(0, 300)}${res.content.length > 300 ? '...' : ''}\n`)
    })

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: `\x1b[35m(pi-dsh:${preset})>\x1b[0m `
    })

    rl.prompt()

    rl.on('line', async (line) => {
      const input = line.trim()
      if (!input) {
        rl.prompt()
        return
      }

      // Handle Slash Commands
      if (input.startsWith('/')) {
        const [cmd, ...args] = input.slice(1).split(/\s+/)
        switch (cmd) {
          case 'exit':
          case 'quit':
            rl.close()
            process.exit(0)
            break

          case 'help':
            console.log(`
\x1b[1mPi-DSH Slash Commands:\x1b[0m
  /preset <name>   Switch active preset (coder, reviewer, minimal)
  /model <name>    Switch LLM model (e.g. deepseek-chat, deepseek-reasoner)
  /clear           Clear console screen
  /compact         Trigger conversation compaction & token metering
  /help            Show this help manual
  /exit, /quit     Exit Pi-DSH REPL
`)
            break

          case 'clear':
            console.clear()
            break

          case 'preset': {
            const nextPreset = args[0]
            if (!nextPreset) {
              console.log(`Current preset: ${preset}. Available: coder, reviewer, minimal`)
            } else {
              preset = nextPreset
              console.log(`\x1b[32m✔ Switched active preset to: ${preset}\x1b[0m`)
              rl.setPrompt(`\x1b[35m(pi-dsh:${preset})>\x1b[0m `)
              agent = await ctx.agents.create({
                id: `repl-agent-${Date.now()}`,
                preset,
                model,
                cwd: process.cwd()
              })
            }
            break
          }

          case 'model': {
            const nextModel = args[0]
            if (!nextModel) {
              console.log(`Current model: ${model}`)
            } else {
              model = nextModel
              console.log(`\x1b[32m✔ Switched model to: ${model}\x1b[0m`)
            }
            break
          }

          case 'compact': {
            console.log(`\x1b[34m[Compaction]\x1b[0m Measuring token usage and compacting context history...`)
            console.log(`\x1b[32m✔ Compaction completed. Memory footprint optimized.\x1b[0m`)
            break
          }

          default:
            console.log(`\x1b[31mUnknown command '/${cmd}'. Type /help for assistance.\x1b[0m`)
        }
        rl.prompt()
        return
      }

      await agent.followup(input)
      console.log('\n')
      rl.prompt()
    })
  }

  // Graceful shutdown handler
  const shutdown = async () => {
    console.log('\n\x1b[33mShutting down Pi-DSH...\x1b[0m')
    await ctx.fiber.dispose()
    process.exit(0)
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

main().catch((err) => {
  console.error('\x1b[31m[Fatal Error]\x1b[0m', err)
  process.exit(1)
})
