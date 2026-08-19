# AGENTS.md — Pi-DSH 开发与架构规范

[English](AGENTS.md) | 中文

**Pi-DSH** 是基于 **Cordis 微内核框架**（`@deepseek-ai/cordis`）与 **DeepSeek Harness**（`dsh`）官方插件生态规范构建的 AI 编码智能体脚手架，100% 对标 [`earendil-works/pi`](https://github.com/earendil-works/pi) 80%+ 核心编码能力并提供工业级 Web 微前端图形工作台。

---

## 一、 核心架构原则

1. **Everything is a Plugin（一切皆插件）**：
   - 所有的功能单元（Agent 注册表、Agent Loop、系统提示词、工具集、Presets 发现、微前端 UI 插槽）均为自治的 Cordis 插件。
2. **100% 官方 DSH 生态直连**：
   - 系统全面装载官方 `@deepseek-ai/dsh-*` 系列包（50+ 核心插件 + 36 个 Client UI 微前端插件），不使用任何非官方阉割实现。
3. **两级配置治理体系**：
   - **Profiles (`profiles/*.yml`)**：基础设施层组合。定义宿主进程加载哪些全局服务与微前端插件（如 `web.yml`、`headless.yml`）。
   - **Presets (`presets/*/agent.cordis.yml`)**：智能体能力层预设。定义具体 Agent 实例拥有的工具链、系统提示词段落与模型参数（如 `standard`、`coder`、`reviewer`、`minimal`）。
4. **Cordis Loader 原生实例与动态映射**：
   - 宿主容器使用官方 `vendor/loader` 的原生 `Loader` 实例，提供标准的 `ctx.loader.entries()` 与 `getTasks()` 支持。
   - 动态拦截 `loader.internal.import`，自动解析并无缝载入 Monorepo 下各插件包。
5. **微前端 Bundle 分发与启动清单规范**：
   - 宿主通过 `clientModules.table` 维护全部 39 个 Web 客户端插件的物理产物路径映射，由 `/plugins` 路由服务提供 `200 OK` 静态分发。
   - 模块引导清单通过 `tapIndex` 强制原子覆盖注入至 `window.__DSH_BOOT__`，包含动态短哈希版本号 `rev`，防范静态资源强缓存。
6. **Capability Seam 契约与跨平台 Shell 驱动规范**：
   - **宿主基础设施层（Host Seams）**：由 Profile 提供 `fs-local`、`subprocess-local`、`shell-env`、`llm` 等底层执行与驱动服务。
   - **抽象 Shell Seam 自动映射**：CLI 容器自动将抽象契约 `@deepseek-ai/dsh-shell` 映射为对应 OS 的驱动（Windows 平台自动注入 `@deepseek-ai/dsh-pwsh-local`，Linux/macOS 平台自动注入 `@deepseek-ai/dsh-bash-local`）。
   - **能力预设层（Agent Presets）**：由 `agent.cordis.yml` 装配面向模型的工具消费者插件（`tool-fs`、`tool-str-replace-editor`、`tool-bash`、`tool-pwsh`、`tool-fs-search`、`tool-todo` 等）。全预设双向装配 `tool-pwsh` 与 `tool-bash`，确保全平台命令一次性精准执行。
7. **文件系统容错与 Sidecar 伴随记录规范**：
   - 根目录遍历（如 `D:\`）时对受保护系统目录（`System Volume Information`）优雅降级为 `other` 类型，不中断整目录浏览。
   - `messageFeedback` 必须在 Profile 中声明 `maxNoteBytes: 8192`，并通过 `.storage/` 存储域独立持久化。

---

## 二、 仓库结构与目录说明

```text
pi-dsh/
├── apps/
│   └── cli/                          # CLI 启动器、RPC 网关与微前端引导调度容器 (Loader & WebServer)
│
├── packages/                         # 用户私有/定制插件空间 (Custom Plugins Workspace)
│   └── README.md
│
├── profiles/                         # 基础设施层 Profile 声明 (装配官方 DSH 插件)
│   ├── web.yml                       # Web 图形交互模式 Profile (含 36 微前端插槽矩阵)
│   ├── headless.yml                  # Headless 自动化 / CLI 批处理模式 Profile
│   └── README.md
│
├── presets/                          # Agent 角色与能力预设
│   ├── standard/                     # 标准全能编码预设 (FS + Edit + Bash/Pwsh + Search + Todo) [默认推荐]
│   ├── reviewer/                     # 只读审查预设 (只读 FS + Search，禁止写操作与终端)
│   ├── minimal/                      # 极简运维预设 (Bash/Pwsh 终端，超低 Token 开销)
│   ├── coder/                        # 深度开发预设 (复杂长文本工程代码重构)
│   └── README.md
│
├── docs/                             # 深度技术文档与对标矩阵
│   ├── pi-feature-parity-matrix.md   # Pi 80%+ 功能逐项对标矩阵与场景对照表
│   ├── cordis-dsh-integration-guide.md # Cordis 微内核集成与双层设计实战指南
│   ├── dsh-adaptation-changes.md     # 官方 DSH 仓库克隆用户必备代码补丁清单
│   └── README.md
│
├── .agents/notes/                    # 中英文架构决策笔记 (Agent Notes & ADR)
│   ├── implemented/architecture/     # 已实现的架构设计与修复决策
│   ├── README.md                     # 决策目录英文索引
│   └── README.zh.md                  # 决策目录中文索引
│
├── CHANGELOG.md                      # 版本发布与详细变更修复历史 (Keep a Changelog)
├── AGENTS.md                         # 本开发与架构设计规范
└── README.md                         # 渐进式披露主页与快速入门指南
```

---

## 三、 运行模式与命令完整指南

### 1. 🌐 启动 Web GUI 交互工作台 (默认 Standard 模式)
```bash
pnpm start
# 浏览器访问 http://localhost:3000
```

### 2. ⚡ Headless 自动化单任务执行 (CLI 批处理与 CI/CD)
适用于非交互式脚本调用、自动化流水线与代码审查，执行完毕后自动返回进程退出码（`0` 成功，非 `0` 失败）：

```bash
# 默认使用 Standard 标准全能预设执行编码任务
pnpm headless "检查当前仓库的 Git 状态并列出修改的文件"

# 切换为 Reviewer 只读审查预设（严格禁止任何文件修改与终端执行）
pnpm headless --preset reviewer "审查 presets/ 目录下的配置安全性"

# 切换为 Minimal 极简终端运维预设（Token 消耗极低）
pnpm headless --preset minimal "检查当前系统的 node, pnpm 和 git 版本"

# 切换为 Coder 深度开发预设并指定 DeepSeek 推理模型
pnpm headless --preset coder --model deepseek-reasoner "分析并发 RPC 时序竞态问题"
```

### 3. 💻 启动终端交互式 REPL (支持 Pi 原生 Slash Commands)
```bash
pnpm pi --preset standard
# 在终端中支持输入 /help, /preset, /model, /compact, /clear, /exit
```

---

## 四、 环境变量配置

在项目根目录 `.env` 中配置：
```env
DEEPSEEK_API_KEY=sk-your-api-key
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
```
