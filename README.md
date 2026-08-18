# Pi-DSH (🥧) — 基于 Cordis 与 DSH 插件架构的 AI Coding Agent

[English](README.md) | 中文

**Pi-DSH** 是一个基于 **Cordis** 微内核架构（Everything is a plugin）与 **DeepSeek Harness** 规范构建的 AI 编码智能体脚手架。它完全采用 `@deepseek-ai/cordis` 作为容器底座，通过 **Profiles**（系统基础设施编排）与 **Presets**（Agent 角色能力预设）两级机制组织，提供全栈 **Web GUI** 与 **Headless CLI / REPL** 双模式。

---

## 🌟 核心特性

- **微内核插件底座**：基于 `@deepseek-ai/cordis` (v4.0.1) 与 `@deepseek-ai/cosmokit`，所有系统能力（Agent Loop、Tools、Prompt、Presets、Web）均为自治插件；
- **两级解耦配置**：
  - **Profiles (`profiles/*.yml`)**：基础设施层组合，支持 `web`（图形交互）与 `headless`（单任务 / 命令行 REPL）；
  - **Presets (`presets/*/agent.cordis.yml`)**：Agent 角色与能力预设，支持 `coder`（完整开发）、`reviewer`（代码审查）与 `minimal`（极简终端）；
- **全套 Pi Agent 核心工具**：
  - `tool-fs`：`read_file`, `write_file`, `edit_file`, `list_dir`
  - `tool-bash`：终端命令执行（`run_command`）
  - `tool-search`：文件与内容搜索（`find_by_name`, `grep_search`）
- **流式思考与工具调用**：支持大模型实时流式输出、Thinking（推理过程）渲染、Tool Call 动画与执行结果观测。

---

## 📂 仓库目录结构

```text
pi-dsh/
├── apps/
│   └── cli/                          # CLI 启动器 (支持 Web GUI、单任务与交互 REPL)
│
├── packages/
│   ├── core/
│   │   ├── agent/                    # @pi-dsh/agent (Agent 注册表、会话与生命周期事件)
│   │   ├── agent-loop/               # @pi-dsh/agent-loop (Turn 轮次流引擎、Tool 循环驱动)
│   │   ├── system-prompt/            # @pi-dsh/system-prompt (提示词段落动态组装)
│   │   └── tools/                    # @pi-dsh/tools (工具注册表与执行管道)
│   ├── preset/
│   │   └── agent-presets/            # @pi-dsh/agent-presets (Preset 发现与作用域动态挂载)
│   ├── host/
│   │   └── webserver/                # @pi-dsh/host-webserver (Web GUI 交互界面与 SSE API)
│   └── tools/
│       ├── tool-fs/                  # @pi-dsh/tool-fs (文件读写与局部替换)
│       ├── tool-bash/                # @pi-dsh/tool-bash (命令行终端执行)
│       └── tool-search/              # @pi-dsh/tool-search (Grep 与文件名搜索)
│
├── profiles/
│   ├── web.yml                       # Web 图形交互模式 Profile
│   └── headless.yml                  # Headless 自动化 / CLI 模式 Profile
│
└── presets/
    ├── coder/                        # Coder 预设 (挂载 FS + Bash + Search + Prompt)
    ├── reviewer/                     # Reviewer 预设 (只读 FS + Search)
    └── minimal/                      # Minimal 预设 (仅挂载 Bash)
```

---

## 🚀 快速启动

### 1. 安装与构建

```bash
# 1. 安装依赖
pnpm install

# 2. 全量编译
pnpm run build
```

### 2. 配置环境变量

在根目录下创建 `.env` 文件（或继承全局环境变量）：
```env
DEEPSEEK_API_KEY=sk-your-deepseek-api-key
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
```

### 3. 运行体验

#### 方式 A：启动 Web GUI 交互界面
```bash
pnpm start
# 浏览器打开 http://localhost:3000
```

#### 方式 B：执行单任务 Headless 自动化
```bash
pnpm headless "List the files in the current directory"
```

#### 方式 C：启动终端交互式 REPL
```bash
pnpm pi --profile headless --preset coder
```
