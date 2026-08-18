# Pi-DSH (🥧) — 基于 Cordis 与 100% 官方 DSH 插件矩阵的 AI Coding Agent

[English](README.md) | 中文

**Pi-DSH** 是一个基于 **Cordis 微内核架构**（Everything is a plugin）与 **DeepSeek Harness (DSH)** 官方生态规范构建的 AI 编码智能体脚手架。它以 `@deepseek-ai/cordis` (v4.0.1) 作为统一容器底座，直连 **50+ 官方 `@deepseek-ai/dsh-*` 插件**，支持官方 **34 套浏览器微前端插槽 UI 矩阵**、Typert 远程 RPC 网关与应用内工作区选择器，提供全栈 **Web GUI** 与 **Headless CLI / REPL** 双模式。

---

## 🌟 核心特性

- **100% 官方 DSH 插件全家桶**：无任何自制或阉割版本，直接接入官方 `@deepseek-ai/dsh-agent`、`@deepseek-ai/dsh-agent-loop`、`@deepseek-ai/dsh-tools`、`@deepseek-ai/dsh-llm-deepseek` 等 50+ 核心插件；
- **官方浏览器微前端插槽矩阵（34 UI 插件）**：
  - **全局外壳与框架**：`ui-layout`（向 `root` 插槽注入 AppFrame）、`ui-sidebar`、`ui-workspace`、`ui-theme`（暗色/亮色切换）、`ui-locale`（国际化）；
  - **应用内文件/目录浏览器**：`ui-directory-picker-browse` + `host-directory-picker-browse` 驱动面包屑导航与多级目录选择；
  - **会话与工具视图**：流式思维链（Thinking）、Diff 对比、终端仿真、产物交付、计划模式与目标看板；
  - **设置中心**：常规偏好、模型配置、插件清单（Plugin Inventory）实时查看；
- **两级解耦配置治理体系**：
  - **Profiles (`profiles/*.yml`)**：基础设施层组合，支持 `web`（图形交互）与 `headless`（单任务 / 命令行 REPL）；
  - **Presets (`presets/*/agent.cordis.yml`)**：Agent 角色与能力预设，支持 `coder`（完整开发）、`reviewer`（代码审查）与 `minimal`（极简终端）；
- **动态模块拓扑引导器（`apps/cli`）**：
  - 自动扫描解析 Monorepo 模块并按依赖拓扑注入 `window.__DSH_BOOT__`；
  - 内置动态文件修改短哈希（`rev`）缓存失效机制。

---

## 📂 仓库目录结构

```text
pi-dsh/
├── apps/
│   └── cli/                          # 轻量级独立入口与 Cordis 容器调度引擎
│
├── packages/                         # 用户私有/定制插件开发空间 (Custom Plugins Workspace)
│   └── README.md
│
├── profiles/                         # 基础设施层 Profile 声明
│   ├── web.yml                       # Web 图形交互模式 Profile (装配 50+ 官方 DSH 插件)
│   ├── headless.yml                  # Headless 自动化 / CLI 模式 Profile
│   └── README.md
│
├── presets/                          # Agent 角色与能力预设
│   ├── coder/                        # Coder 预设 (挂载 FS + Bash + Search + Prompt)
│   ├── reviewer/                     # Reviewer 预设 (只读 FS + Search)
│   ├── minimal/                      # Minimal 预设 (仅挂载 Bash)
│   └── README.md
│
├── .agents/notes/                    # 中英文架构决策笔记 (Agent Notes)
├── CHANGELOG.md                      # 版本发布与变更日志
├── AGENTS.md                         # 开发与架构设计规范
└── README.md                         # 项目主页与快速入门指南
```

---

## 🚀 快速启动

### 1. 安装与构建

```bash
# 安装依赖
pnpm install
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
