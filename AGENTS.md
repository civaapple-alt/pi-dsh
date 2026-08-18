# AGENTS.md — Pi-DSH 开发与架构规范

[English](AGENTS.md) | 中文

**Pi-DSH** 是基于 **Cordis 微内核框架**（`@deepseek-ai/cordis`）与 **DeepSeek Harness**（`dsh`）生态规范构建的 AI 编码智能体脚手架。

---

## 一、 核心架构原则

1. **Everything is a Plugin（一切皆插件）**：
   - 所有的功能单元（Agent 注册表、Agent Loop、提示词管理、工具集、Presets 发现、Web 宿主）均为自治的 Cordis 插件。
2. **两级配置治理体系**：
   - **Profiles (`profiles/*.yml`)**：基础设施层组合。定义宿主进程加载哪些全局服务（如 WebServer、AgentRegistry、AgentLoop、PresetRoster）。
   - **Presets (`presets/*/agent.cordis.yml`)**：智能体能力层预设。定义具体 Agent 实例拥有的工具链、系统提示词段落与模型参数（如 `coder`、`reviewer`、`minimal`）。
3. **严格的生命周期与依赖隔离**：
   - 跨插件依赖声明：使用 `ctx.inject(['serviceName'], callback)` 或 `public static readonly inject = [...]`；
   - 动态可选依赖：使用 `ctx.get('serviceName')` 避免未声明注入时抛错；
   - 生命周期注销：在 `ctx.effect(() => { return () => disposer() })` 中统一释放资源；
   - 作用域隔离：Agent 实例通过 `ctx.isolate('tools')` / `ctx.isolate('systemPrompt')` 拥有独立的作用域，互不串扰。
4. **编译与产物规范**：
   - 全面采用 ESM（`"type": "module"`）；
   - 所有包与插件的编译产物统一输出至 **`lib/`** 目录（与 DSH 官方生态 100% 对齐）。

---

## 二、 仓库结构与目录说明

```text
pi-dsh/
├── apps/
│   └── cli/                          # CLI 启动器 (解析 --profile 和 --preset，引导 Cordis)
│
├── packages/
│   ├── core/
│   │   ├── agent/                    # @pi-dsh/agent (Agent 注册表 ctx.agents 与生命周期事件)
│   │   ├── agent-loop/               # @pi-dsh/agent-loop (Turn 轮次流引擎与 Tool 调用循环)
│   │   ├── system-prompt/            # @pi-dsh/system-prompt (提示词段落动态组装)
│   │   └── tools/                    # @pi-dsh/tools (工具注册表 ctx.tools 与参数校验)
│   ├── preset/
│   │   └── agent-presets/            # @pi-dsh/agent-presets (Preset 发现与作用域动态挂载)
│   ├── host/
│   │   └── webserver/                # @pi-dsh/host-webserver (Web GUI 交互界面与 SSE API)
│   └── tools/
│       ├── tool-fs/                  # @pi-dsh/tool-fs (read_file, write_file, edit_file, list_dir)
│       ├── tool-bash/                # @pi-dsh/tool-bash (run_command 终端命令执行)
│       └── tool-search/              # @pi-dsh/tool-search (grep_search, find_by_name)
│
├── profiles/
│   ├── web.yml                       # Web 图形交互模式 Profile
│   └── headless.yml                  # Headless 自动化 / CLI 模式 Profile
│
├── presets/
│   ├── coder/                        # Coder 预设 (挂载 FS + Bash + Search + Prompt)
│   ├── reviewer/                     # Reviewer 预设 (只读 FS + Search)
│   └── minimal/                      # Minimal 预设 (仅挂载 Bash)
│
├── .agents/notes/                    # 中英文架构决策笔记 (Agent Notes)
├── AGENTS.md                         # 规范文档
└── README.md                         # 项目主页与快速入门指南
```

---

## 三、 常用命令速查

```bash
pnpm install            # 安装工作区依赖
pnpm run build          # 全量编译所有 packages 到 lib/
pnpm start              # 启动 Web GUI 交互界面 (默认加载 coder preset)
pnpm headless "<task>"  # 运行单任务 Headless 自动化命令
pnpm pi --profile headless --preset coder  # 启动终端交互式 REPL 模式
```

---

## 四、 环境变量配置

在根目录 `.env` 中配置：
```env
DEEPSEEK_API_KEY=sk-your-api-key
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
```
