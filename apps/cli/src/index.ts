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

function parseArgs() {
  const args = process.argv.slice(2)
  let profile = 'web'
  let preset = 'coder'
  const taskParts: string[] = []

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--profile' && i + 1 < args.length) {
      profile = args[++i]
    } else if (arg === '--preset' && i + 1 < args.length) {
      preset = args[++i]
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Usage: pi-dsh [options] [task...]

Options:
  --profile <name>   Profile name to load (web | headless) [default: web]
  --preset <name>    Agent capability preset (coder | reviewer | minimal) [default: coder]
  --help, -h         Show help

Examples:
  pnpm start                                       # Launch Web GUI
  pnpm headless "List all files in this project"   # Run one-shot headless task
  pnpm pi --profile headless                       # Launch interactive CLI REPL
`)
      process.exit(0)
    } else {
      taskParts.push(arg)
    }
  }

  return {
    profile,
    preset,
    task: taskParts.join(' ').trim()
  }
}

async function main() {
  buildDshPackageMap()
  const { profile, preset, task } = parseArgs()

  console.log('\x1b[36m============================================================\x1b[0m')
  console.log(`🥧 \x1b[1mPi-DSH Agent Starting\x1b[0m | Profile: "\x1b[32m${profile}\x1b[0m" | Preset: "\x1b[35m${preset}\x1b[0m"`)
  console.log('\x1b[36m============================================================\x1b[0m')

  // 1. Resolve Profile YAML file
  const profileFile = path.resolve(process.cwd(), `profiles/${profile}.yml`)
  if (!fs.existsSync(profileFile)) {
    console.error(`\x1b[31m[Error]\x1b[0m Profile configuration not found at ${profileFile}`)
    process.exit(1)
  }

  const profileContent = fs.readFileSync(profileFile, 'utf8')
  const pluginEntries = yaml.load(profileContent) as PluginConfigEntry[]

  // 2. Initialize Cordis Root Context
  const ctx = new Context()

  // 3. Apply Plugins declared in Profile
  for (const entry of pluginEntries) {
    if (entry.disabled) continue
    const target = entry.name || entry.path
    if (!target) continue

    try {
      let mod: any
      if (dshPackageMap.has(target)) {
        mod = await import(dshPackageMap.get(target)!)
      } else if (target.startsWith('.') || path.isAbsolute(target)) {
        mod = await import(path.resolve(process.cwd(), target))
      } else {
        mod = await import(target)
      }
      const plugin = mod.default || mod
      await ctx.plugin(plugin, entry.config)
      console.log(`\x1b[34m[Cordis Loader]\x1b[0m Loaded plugin: ${target}`)
    } catch (err: any) {
      console.error(`\x1b[31m[Cordis Loader]\x1b[0m Failed to load plugin '${target}':`, err?.message || err)
    }
  }

  // 4. Handle Execution Mode
  if (profile === 'web') {
    console.log('\x1b[32m============================================================\x1b[0m')
    console.log('✨ Web GUI is active at \x1b[1;34mhttp://localhost:3000\x1b[0m')
    console.log('\x1b[32m============================================================\x1b[0m')
    // Keep alive for web server
  } else if (task) {
    // One-shot headless execution
    console.log(`\n\x1b[33m[Task]\x1b[0m ${task}\n`)
    const agent = await ctx.agents.create({
      id: 'cli-agent',
      preset,
      cwd: process.cwd()
    })

    ctx.on('agent/thinking', (a, thinking) => {
      process.stdout.write(`\x1b[90m${thinking}\x1b[0m`)
    })

    ctx.on('agent/chunk', (a, chunk) => {
      process.stdout.write(chunk)
    })

    ctx.on('agent/tool-call', (a, call) => {
      console.log(`\n\x1b[36m⚡ Tool Call: ${call.name}\x1b[0m (${JSON.stringify(call.arguments)})`)
    })

    ctx.on('agent/tool-result', (a, call, res) => {
      console.log(`\x1b[32m✔ Observation:\x1b[0m ${res.content.slice(0, 300)}${res.content.length > 300 ? '...' : ''}\n`)
    })

    await agent.followup(task)
    console.log('\n\x1b[32m============================================================\x1b[0m')
    console.log('✨ Task completed.')
    process.exit(0)
  } else {
    // Interactive CLI REPL
    console.log(`\x1b[32mInteractive REPL Mode. Type your instructions below (or 'exit' to quit):\x1b[0m\n`)
    const agent = await ctx.agents.create({
      id: 'repl-agent',
      preset,
      cwd: process.cwd()
    })

    ctx.on('agent/thinking', (a, thinking) => {
      process.stdout.write(`\x1b[90m${thinking}\x1b[0m`)
    })

    ctx.on('agent/chunk', (a, chunk) => {
      process.stdout.write(chunk)
    })

    ctx.on('agent/tool-call', (a, call) => {
      console.log(`\n\x1b[36m⚡ Tool Call: ${call.name}\x1b[0m (${JSON.stringify(call.arguments)})`)
    })

    ctx.on('agent/tool-result', (a, call, res) => {
      console.log(`\x1b[32m✔ Observation:\x1b[0m ${res.content.slice(0, 300)}${res.content.length > 300 ? '...' : ''}\n`)
    })

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: '\x1b[35m(pi-dsh)>\x1b[0m '
    })

    rl.prompt()

    rl.on('line', async (line) => {
      const input = line.trim()
      if (input === 'exit' || input === 'quit') {
        rl.close()
        process.exit(0)
      }

      if (input) {
        await agent.followup(input)
        console.log('\n')
      }
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
