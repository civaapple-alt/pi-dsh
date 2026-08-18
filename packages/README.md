# packages/ — Pi-DSH 插件与基础能力包

[English](README.md) | 中文

`packages/` 目录下存放系统中所有的 Cordis 插件与共享模块。

---

## 包模块与 DSH 官方包对应关系表

| 包路径 | 注册服务 / 作用 | 对应 `@deepseek-ai/dsh-*` 官方包 | 功能说明 |
|---|---|---|---|
| [`core/agent`](core/agent/README.md) | `ctx.agents` | `@deepseek-ai/dsh-agent` | Agent 实例生命周期、状态维护与事件通知 |
| [`core/agent-loop`](core/agent-loop/README.md) | `AgentFactory` | `@deepseek-ai/dsh-agent-loop` | 驱动 LLM 流式生成与 Tool 递归执行闭环 |
| [`core/system-prompt`](core/system-prompt/README.md) | `ctx.systemPrompt` | `@deepseek-ai/dsh-system-prompt` | 模块化系统提示词注册与渲染 |
| [`core/tools`](core/tools/README.md) | `ctx.tools` | `@deepseek-ai/dsh-tools` | 工具注册表与执行拦截管道 |
| [`preset/agent-presets`](preset/agent-presets/README.md) | `ctx.agentPresets` | `@deepseek-ai/dsh-agent-presets` | 扫描 `presets/` 并动态挂载 `agent.cordis.yml` |
| [`host/webserver`](host/webserver/README.md) | `ctx.server` | `@deepseek-ai/dsh-host-webserver` | Web GUI 静态分发与 SSE 实时推流 API |
| [`tools/tool-fs`](tools/tool-fs/README.md) | 工具插件 | `@deepseek-ai/dsh-tool-fs` | `read_file`, `write_file`, `edit_file`, `list_dir` |
| [`tools/tool-bash`](tools/tool-bash/README.md) | 工具插件 | `@deepseek-ai/dsh-tool-bash` | `run_command`（支持超时与安全隔离） |
| [`tools/tool-search`](tools/tool-search/README.md) | 工具插件 | `@deepseek-ai/dsh-tool-fs-search` | `grep_search`, `find_by_name` |
