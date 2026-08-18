# AGENTS.md — Pi-DSH 开发与架构规范

[English](AGENTS.md) | 中文

**Pi-DSH** 是基于 **Cordis 微内核框架**（`@deepseek-ai/cordis`）与 **DeepSeek Harness**（`dsh`）官方插件生态规范构建的 AI 编码智能体脚手架。

---

## 一、 核心架构原则

1. **Everything is a Plugin（一切皆插件）**：
   - 所有的功能单元（Agent 注册表、Agent Loop、系统提示词、工具集、Presets 发现、微前端 UI 插槽）均为自治的 Cordis 插件。
2. **100% 官方 DSH 生态直连**：
   - 系统全面装载官方 `@deepseek-ai/dsh-*` 系列包（50+ 核心插件 + 34 个 Client UI 微前端插件），不使用任何非官方阉割实现。
3. **两级配置治理体系**：
   - **Profiles (`profiles/*.yml`)**：基础设施层组合。定义宿主进程加载哪些全局服务与微前端插件（如 `web.yml`、`headless.yml`）。
   - **Presets (`presets/*/agent.cordis.yml`)**：智能体能力层预设。定义具体 Agent 实例拥有的工具链、系统提示词段落与模型参数（如 `standard`、`coder`、`reviewer`、`minimal`）。
4. **Cordis Loader 原生实例与动态映射**：
   - 宿主容器使用官方 `vendor/loader` 的原生 `Loader` 实例，提供标准的 `ctx.loader.entries()` 与 `getTasks()` 支持。
   - 动态拦截 `loader.internal.import`，自动解析并无缝载入 Monorepo 下各插件包。
5. **微前端 Bundle 分发与启动清单规范**：
   - 宿主通过 `clientModules.table` 维护全部 39 个 Web 客户端插件的物理产物路径映射，由 `/plugins` 路由服务提供 `200 OK` 静态分发。
   - 模块引导清单通过 `tapIndex` 强制原子覆盖注入至 `window.__DSH_BOOT__`，包含动态短哈希版本号 `rev`，防范静态资源强缓存。
6. **Capability Seam 契约分层**：
   - **宿主基础设施层（Host Seams）**：由 Profile 统一提供 `fs-local`、`subprocess-local`、`shell-env`、`shell`、`llm` 等底层执行与驱动服务。
   - **能力预设层（Agent Presets）**：由 `agent.cordis.yml` 装配面向模型的工具消费者插件（`tool-fs`、`tool-str-replace-editor`、`tool-bash`、`tool-fs-search`、`tool-todo` 等）。
7. **用户定制扩展区（Custom Plugins Workspace）**：
   - `pi-dsh/packages/` 保留为用户开发定制/私有 Cordis 插件的独立工作区。

---

## 二、 仓库结构与目录说明

```text
pi-dsh/
├── apps/
│   └── cli/                          # CLI 启动器与微前端引导调度容器 (Loader & WebServer)
│
├── packages/                         # 用户私有/定制插件空间 (Custom Plugins Workspace)
│   └── README.md
│
├── profiles/                         # 基础设施层 Profile 声明 (装配官方 DSH 插件)
│   ├── web.yml                       # Web 图形交互模式 Profile (含 36 微前端矩阵)
│   ├── headless.yml                  # Headless 自动化 / CLI 模式 Profile
│   └── README.md
│
├── presets/                          # Agent 角色与能力预设
│   ├── standard/                     # 标准全功能编码预设 (FS + Edit + Bash + Search + Todo)
│   ├── coder/                        # Coder 预设 (挂载 FS + Bash + Search + Todo)
│   ├── reviewer/                     # Reviewer 预设 (只读 FS + Search)
│   ├── minimal/                      # Minimal 预设 (精简 Bash)
│   └── README.md
│
├── .agents/notes/                    # 中英文架构决策笔记 (Agent Notes & ADR)
│   ├── implemented/architecture/     # 已实现的架构设计与修复决策
│   ├── README.md                     # 决策目录英文索引
│   └── README.zh.md                  # 决策目录中文索引
│
├── CHANGELOG.md                      # 版本发布与详细变更修复历史
├── AGENTS.md                         # 开发与架构设计规范
└── README.md                         # 项目主页与快速入门指南
```

---

## 三、 常用命令速查

```bash
pnpm install            # 安装工作区依赖 (<500ms 快速完成)
pnpm start              # 启动 Web GUI 交互界面 (监听 http://localhost:3000)
pnpm headless "<task>"  # 运行单任务 Headless 自动化命令
pnpm pi --profile headless --preset standard  # 启动终端交互式 REPL 模式
```

---

## 四、 环境变量配置

在根目录 `.env` 中配置：
```env
DEEPSEEK_API_KEY=sk-your-api-key
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
```
