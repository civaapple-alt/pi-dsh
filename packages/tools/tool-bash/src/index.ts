import { Context } from '@deepseek-ai/cordis'
import type {} from '@pi-dsh/tools'
import { exec } from 'node:child_process'

export interface BashConfig {
  cwd?: string
  timeoutMs?: number
}

export function apply(ctx: Context, config: BashConfig = {}) {
  const cwd = config.cwd || process.cwd()
  const timeout = config.timeoutMs || 60000

  ctx.inject(['tools'], (ctx) => {
    ctx.effect(() => {
      const unRegister = ctx.tools.register({
        name: 'run_command',
        description: 'Execute a terminal command on the host system.',
        parameters: {
          type: 'object',
          properties: {
            command: { type: 'string', description: 'Command line string to run in shell' }
          },
          required: ['command']
        },
        execute: async (args: { command: string }) => {
          return new Promise<string>((resolve) => {
            exec(args.command, { cwd, timeout, maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
              if (err) {
                resolve(`Command exited with error: ${err.message}\nSTDOUT:\n${stdout}\nSTDERR:\n${stderr}`)
              } else {
                const out = stdout.trim() || stderr.trim() || '(No output)'
                resolve(out)
              }
            })
          })
        }
      })

      return () => {
        unRegister()
      }
    })
  })
}
