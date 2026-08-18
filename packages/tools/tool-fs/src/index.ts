import { Context } from '@deepseek-ai/cordis'
import type {} from '@pi-dsh/tools'
import fs from 'node:fs'
import path from 'node:path'

export interface FsConfig {
  cwd?: string
}

export function apply(ctx: Context, config: FsConfig = {}) {
  const cwd = config.cwd || process.cwd()

  ctx.inject(['tools'], (ctx) => {
    ctx.effect(() => {
      // 1. read_file
      const unRead = ctx.tools.register({
        name: 'read_file',
        description: 'Read content from a file in the workspace.',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Relative or absolute path of the file to read' },
            offset: { type: 'number', description: 'Line offset to start reading from (1-indexed)' },
            limit: { type: 'number', description: 'Maximum number of lines to read' }
          },
          required: ['path']
        },
        execute: async (args: { path: string; offset?: number; limit?: number }) => {
          const target = path.resolve(cwd, args.path)
          if (!fs.existsSync(target)) {
            throw new Error(`File not found: ${args.path}`)
          }
          const content = fs.readFileSync(target, 'utf8')
          const lines = content.split('\n')
          const offset = Math.max(1, args.offset || 1)
          const limit = args.limit || 500
          const slice = lines.slice(offset - 1, offset - 1 + limit)

          return slice.map((l, i) => `${offset + i}: ${l}`).join('\n')
        }
      })

      // 2. write_file
      const unWrite = ctx.tools.register({
        name: 'write_file',
        description: 'Write entire content to a file (creates directories if missing).',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Target file path' },
            content: { type: 'string', description: 'Content to write into the file' }
          },
          required: ['path', 'content']
        },
        execute: async (args: { path: string; content: string }) => {
          const target = path.resolve(cwd, args.path)
          fs.mkdirSync(path.dirname(target), { recursive: true })
          fs.writeFileSync(target, args.content, 'utf8')
          return `Successfully wrote ${args.content.length} bytes to ${args.path}`
        }
      })

      // 3. edit_file
      const unEdit = ctx.tools.register({
        name: 'edit_file',
        description: 'Replace an exact target substring with replacement content.',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'File path to edit' },
            target: { type: 'string', description: 'Exact string to search and replace' },
            replacement: { type: 'string', description: 'New string to substitute in' }
          },
          required: ['path', 'target', 'replacement']
        },
        execute: async (args: { path: string; target: string; replacement: string }) => {
          const targetPath = path.resolve(cwd, args.path)
          if (!fs.existsSync(targetPath)) {
            throw new Error(`File not found: ${args.path}`)
          }
          const content = fs.readFileSync(targetPath, 'utf8')
          if (!content.includes(args.target)) {
            throw new Error(`Target substring not found in ${args.path}`)
          }
          const updated = content.replace(args.target, args.replacement)
          fs.writeFileSync(targetPath, updated, 'utf8')
          return `Successfully replaced target content in ${args.path}`
        }
      })

      // 4. list_dir
      const unList = ctx.tools.register({
        name: 'list_dir',
        description: 'List contents of a directory.',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Directory path (defaults to current workspace)' }
          }
        },
        execute: async (args: { path?: string }) => {
          const target = path.resolve(cwd, args.path || '.')
          if (!fs.existsSync(target)) {
            throw new Error(`Directory not found: ${args.path || '.'}`)
          }
          const entries = fs.readdirSync(target, { withFileTypes: true })
          return entries.map(e => `${e.isDirectory() ? '[DIR] ' : '[FILE]'} ${e.name}`).join('\n')
        }
      })

      return () => {
        unRead()
        unWrite()
        unEdit()
        unList()
      }
    })
  })
}
