import { Context } from '@deepseek-ai/cordis'
import type {} from '@pi-dsh/tools'
import fs from 'node:fs'
import path from 'node:path'

export interface SearchConfig {
  cwd?: string
}

export function apply(ctx: Context, config: SearchConfig = {}) {
  const cwd = config.cwd || process.cwd()

  ctx.inject(['tools'], (ctx) => {
    ctx.effect(() => {
      // 1. find_by_name
      const unFind = ctx.tools.register({
        name: 'find_by_name',
        description: 'Recursively search for files matching a pattern in the workspace.',
        parameters: {
          type: 'object',
          properties: {
            pattern: { type: 'string', description: 'Substring or filename pattern to search for' },
            dir: { type: 'string', description: 'Directory to search within (defaults to workspace root)' }
          },
          required: ['pattern']
        },
        execute: async (args: { pattern: string; dir?: string }) => {
          const rootDir = path.resolve(cwd, args.dir || '.')
          const matched: string[] = []

          function scan(current: string) {
            if (matched.length >= 50) return
            const entries = fs.readdirSync(current, { withFileTypes: true })
            for (const entry of entries) {
              if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist' || entry.name === 'lib') continue
              const full = path.join(current, entry.name)
              const rel = path.relative(cwd, full)

              if (entry.name.toLowerCase().includes(args.pattern.toLowerCase())) {
                matched.push(rel)
              }
              if (entry.isDirectory()) {
                scan(full)
              }
            }
          }

          scan(rootDir)
          return matched.length > 0 ? matched.join('\n') : `No files matching pattern '${args.pattern}'`
        }
      })

      // 2. grep_search
      const unGrep = ctx.tools.register({
        name: 'grep_search',
        description: 'Search for text matches within workspace files.',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search term or query' },
            dir: { type: 'string', description: 'Directory to search in (defaults to workspace root)' }
          },
          required: ['query']
        },
        execute: async (args: { query: string; dir?: string }) => {
          const rootDir = path.resolve(cwd, args.dir || '.')
          const results: string[] = []

          function scan(current: string) {
            if (results.length >= 50) return
            const entries = fs.readdirSync(current, { withFileTypes: true })
            for (const entry of entries) {
              if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist' || entry.name === 'lib') continue
              const full = path.join(current, entry.name)
              if (entry.isDirectory()) {
                scan(full)
              } else if (entry.isFile()) {
                try {
                  const content = fs.readFileSync(full, 'utf8')
                  const lines = content.split('\n')
                  for (let i = 0; i < lines.length; i++) {
                    if (lines[i].includes(args.query)) {
                      const rel = path.relative(cwd, full)
                      results.push(`${rel}:${i + 1}: ${lines[i].trim()}`)
                      if (results.length >= 50) break
                    }
                  }
                } catch {}
              }
            }
          }

          scan(rootDir)
          return results.length > 0 ? results.join('\n') : `No matches found for '${args.query}'`
        }
      })

      return () => {
        unFind()
        unGrep()
      }
    })
  })
}
