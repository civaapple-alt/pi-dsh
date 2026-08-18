import { Context, Service } from '@deepseek-ai/cordis'
import type {} from '@pi-dsh/agent'
import type {} from '@pi-dsh/agent-presets'
import http from 'node:http'

export interface WebServerConfig {
  port?: number
  host?: string
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    server: WebServerService
  }
}

export class WebServerService extends Service {
  public server: http.Server
  public port: number
  public host: string

  constructor(ctx: Context, config: WebServerConfig = {}) {
    super(ctx, 'server')
    this.port = config.port ?? 3000
    this.host = config.host ?? '0.0.0.0'

    this.server = http.createServer((req, res) => {
      this.handleRequest(req, res)
    })

    ctx.effect(() => {
      this.server.listen(this.port, this.host, () => {
        console.log(`\x1b[32m[Pi-DSH Web]\x1b[0m Listening on http://localhost:${this.port}`)
      })

      return () => {
        this.server.close()
        console.log('\x1b[33m[Pi-DSH Web]\x1b[0m Server closed.')
      }
    })
  }

  private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse) {
    const url = new URL(req.url ?? '/', `http://${req.headers.host}`)

    // 1. API: List presets
    if (url.pathname === '/api/presets' && req.method === 'GET') {
      const presetsService: any = this.ctx.get('agentPresets')
      const presets = presetsService ? await presetsService.list() : []
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ presets }))
      return
    }

    // 2. API: Send Chat Message (SSE streaming)
    if (url.pathname === '/api/chat' && req.method === 'POST') {
      let body = ''
      req.on('data', chunk => { body += chunk })
      req.on('end', async () => {
        try {
          const { message, preset = 'coder' } = JSON.parse(body || '{}')
          if (!message) {
            res.writeHead(400, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'Message is required' }))
            return
          }

          const agentsService: any = this.ctx.get('agents')
          if (!agentsService) {
            res.writeHead(500, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'Agents service not found' }))
            return
          }

          res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
          })

          const sendEvent = (event: string, data: any) => {
            res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          }

          // Create or retrieve agent
          let agent = agentsService.get('web-session')
          if (!agent) {
            agent = await agentsService.create({
              id: 'web-session',
              preset,
              cwd: process.cwd()
            })
          }

          // Hook temporary event listeners
          const offChunk = this.ctx.on('agent/chunk', (a, chunk) => {
            if (a.id === agent.id) sendEvent('chunk', { text: chunk })
          })
          const offThinking = this.ctx.on('agent/thinking', (a, thinking) => {
            if (a.id === agent.id) sendEvent('thinking', { text: thinking })
          })
          const offToolCall = this.ctx.on('agent/tool-call', (a, call) => {
            if (a.id === agent.id) sendEvent('tool_call', call)
          })
          const offToolResult = this.ctx.on('agent/tool-result', (a, call, result) => {
            if (a.id === agent.id) sendEvent('tool_result', { id: call.id, result })
          })

          try {
            await agent.followup(message)
          } finally {
            offChunk()
            offThinking()
            offToolCall()
            offToolResult()
            sendEvent('done', {})
            res.end()
          }
        } catch (err: any) {
          res.writeHead(500, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: err.message }))
        }
      })
      return
    }

    // 3. Serve Frontend Web GUI HTML
    if (url.pathname === '/' || url.pathname === '/index.html') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      res.end(this.renderHtml())
      return
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' })
    res.end('Not Found')
  }

  private renderHtml(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pi-DSH | AI Coding Agent</title>
  <style>
    :root {
      --bg: #0d1117;
      --card-bg: #161b22;
      --border: #30363d;
      --text: #c9d1d9;
      --text-muted: #8b949e;
      --primary: #238636;
      --primary-hover: #2ea043;
      --accent: #58a6ff;
      --thinking-bg: #1c2128;
      --tool-bg: #0e1726;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
      background: var(--bg);
      color: var(--text);
      display: flex;
      flex-direction: column;
      height: 100vh;
    }
    header {
      background: var(--card-bg);
      border-bottom: 1px solid var(--border);
      padding: 0.8rem 1.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    header h1 { font-size: 1.15rem; color: var(--accent); display: flex; align-items: center; gap: 0.5rem; }
    .badge {
      font-size: 0.75rem;
      padding: 0.2rem 0.5rem;
      border-radius: 9999px;
      background: #1f6feb22;
      border: 1px solid var(--accent);
      color: var(--accent);
    }
    .preset-selector select {
      background: var(--bg);
      color: var(--text);
      border: 1px solid var(--border);
      padding: 0.4rem 0.8rem;
      border-radius: 6px;
      font-size: 0.85rem;
    }
    main {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      max-width: 1000px;
      width: 100%;
      margin: 0 auto;
      padding: 1rem;
    }
    #chat-log {
      flex: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 1.2rem;
      padding-right: 0.5rem;
    }
    .msg {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      line-height: 1.5;
    }
    .msg-user {
      align-self: flex-end;
      background: #1f6feb33;
      border: 1px solid #1f6feb66;
      border-radius: 8px;
      padding: 0.8rem 1.2rem;
      max-width: 80%;
    }
    .msg-assistant {
      align-self: flex-start;
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 1rem 1.2rem;
      max-width: 90%;
      width: 100%;
    }
    .thinking-block {
      background: var(--thinking-bg);
      border-left: 3px solid #d29922;
      padding: 0.6rem 0.8rem;
      font-size: 0.85rem;
      color: var(--text-muted);
      border-radius: 4px;
      margin-bottom: 0.8rem;
      white-space: pre-wrap;
    }
    .tool-call-block {
      background: var(--tool-bg);
      border: 1px solid #388bfd44;
      border-radius: 6px;
      padding: 0.6rem 0.8rem;
      font-size: 0.82rem;
      font-family: monospace;
      margin: 0.5rem 0;
    }
    .tool-call-title { color: #58a6ff; font-weight: bold; margin-bottom: 0.3rem; }
    .tool-result-block {
      background: #0d1117;
      border: 1px solid var(--border);
      padding: 0.5rem;
      border-radius: 4px;
      color: #7ee787;
      max-height: 200px;
      overflow-y: auto;
      white-space: pre-wrap;
    }
    .input-dock {
      margin-top: 1rem;
      display: flex;
      gap: 0.8rem;
    }
    textarea {
      flex: 1;
      background: var(--card-bg);
      border: 1px solid var(--border);
      color: var(--text);
      border-radius: 8px;
      padding: 0.8rem;
      resize: none;
      height: 60px;
      font-size: 0.95rem;
      outline: none;
    }
    textarea:focus { border-color: var(--accent); }
    button#send-btn {
      background: var(--primary);
      color: white;
      border: none;
      border-radius: 8px;
      padding: 0 1.5rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }
    button#send-btn:hover { background: var(--primary-hover); }
    button#send-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  </style>
</head>
<body>
  <header>
    <h1>🥧 Pi-DSH <span class="badge">Cordis Agent Web GUI</span></h1>
    <div class="preset-selector">
      <label for="preset-select" style="font-size: 0.85rem; margin-right: 0.4rem; color: var(--text-muted);">Active Preset:</label>
      <select id="preset-select">
        <option value="coder">Coder (FS + Bash + Search)</option>
        <option value="reviewer">Reviewer (Read-Only FS + Search)</option>
        <option value="minimal">Minimal (Bash-Only)</option>
      </select>
    </div>
  </header>

  <main>
    <div id="chat-log">
      <div class="msg msg-assistant">
        <div>👋 Hello! I am <strong>Pi-DSH</strong>, your Cordis-based AI coding assistant. Ask me to inspect your codebase, edit files, or run commands!</div>
      </div>
    </div>

    <div class="input-dock">
      <textarea id="prompt-input" placeholder="Type a message or instruction... (Enter to send, Shift+Enter for newline)"></textarea>
      <button id="send-btn">Send</button>
    </div>
  </main>

  <script>
    const chatLog = document.getElementById('chat-log');
    const promptInput = document.getElementById('prompt-input');
    const sendBtn = document.getElementById('send-btn');
    const presetSelect = document.getElementById('preset-select');

    promptInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    sendBtn.addEventListener('click', sendMessage);

    async function sendMessage() {
      const text = promptInput.value.trim();
      if (!text) return;

      promptInput.value = '';
      promptInput.disabled = true;
      sendBtn.disabled = true;

      // 1. Render User Message
      const userDiv = document.createElement('div');
      userDiv.className = 'msg msg-user';
      userDiv.textContent = text;
      chatLog.appendChild(userDiv);

      // 2. Render Assistant Message container
      const assistantDiv = document.createElement('div');
      assistantDiv.className = 'msg msg-assistant';

      const thinkingBox = document.createElement('div');
      thinkingBox.className = 'thinking-block';
      thinkingBox.style.display = 'none';

      const contentBox = document.createElement('div');
      contentBox.className = 'content-block';

      assistantDiv.appendChild(thinkingBox);
      assistantDiv.appendChild(contentBox);
      chatLog.appendChild(assistantDiv);
      chatLog.scrollTop = chatLog.scrollHeight;

      // 3. Initiate SSE connection
      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text, preset: presetSelect.value })
        });

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\\n');
          buffer = lines.pop() || '';

          let currentEvent = 'message';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            if (trimmed.startsWith('event:')) {
              currentEvent = trimmed.replace(/^event:\s*/, '');
              continue;
            }

            if (trimmed.startsWith('data:')) {
              const dataStr = trimmed.replace(/^data:\s*/, '');
              try {
                const data = JSON.parse(dataStr);

                if (currentEvent === 'thinking') {
                  thinkingBox.style.display = 'block';
                  thinkingBox.textContent += data.text;
                } else if (currentEvent === 'chunk') {
                  contentBox.textContent += data.text;
                } else if (currentEvent === 'tool_call') {
                  const toolDiv = document.createElement('div');
                  toolDiv.id = 'tool-' + data.id;
                  toolDiv.className = 'tool-call-block';
                  toolDiv.innerHTML = '<div class="tool-call-title">⚡ Calling Tool: ' + data.name + '</div><pre style="margin-bottom: 0.3rem;">' + JSON.stringify(data.arguments, null, 2) + '</pre>';
                  assistantDiv.appendChild(toolDiv);
                } else if (currentEvent === 'tool_result') {
                  const toolDiv = document.getElementById('tool-' + data.id);
                  if (toolDiv) {
                    const resDiv = document.createElement('div');
                    resDiv.className = 'tool-result-block';
                    resDiv.textContent = 'Observation:\\n' + (data.result.content || '');
                    toolDiv.appendChild(resDiv);
                  }
                }
                chatLog.scrollTop = chatLog.scrollHeight;
              } catch {}
            }
          }
        }
      } catch (err) {
        contentBox.textContent += '\\n[Error]: ' + err.message;
      } finally {
        promptInput.disabled = false;
        sendBtn.disabled = false;
        promptInput.focus();
      }
    }
  </script>
</body>
</html>`
  }
}

export function apply(ctx: Context, config?: WebServerConfig) {
  ctx.plugin(WebServerService, config)
}
