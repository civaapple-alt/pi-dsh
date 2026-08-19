# Pi-DSH (🥧) — 基于 Cordis 与 100% 官方 DSH 插件生态的 AI Coding Agent

<p align="center">
  <b>融合 Pi 敏捷极简的 Coding 核心能力，赋能 DeepSeek Harness (DSH) 工业级微内核与微前端生态</b>
</p>

<p align="center">
  <a href="docs/pi-feature-parity-matrix.md"><img src="https://img.shields.io/badge/Pi%20Parity-80%25%2B%20(100%25%20Tools)-success?style=flat-square" alt="Pi Parity" /></a>
  <a href="docs/dsh-adaptation-changes.md"><img src="https://img.shields.io/badge/Official%20DSH%20Plugins-73%20Loaded-blue?style=flat-square" alt="DSH Plugins" /></a>
  <a href="docs/cordis-dsh-integration-guide.md"><img src="https://img.shields.io/badge/Micro--Frontend-36%20UI%20Slots-purple?style=flat-square" alt="Micro-Frontend" /></a>
  <a href="CHANGELOG.md"><img src="https://img.shields.io/badge/Release-v0.4.0-orange?style=flat-square" alt="Release" /></a>
</p>

---

## 📖 目录 (Table of Contents)

- [一、 项目初心与核心愿景](#一-项目初心与核心愿景)
- [二、 ⚡ 30 秒极速开箱 (Quickstart)](#二--30-秒极速开箱-quickstart)
- [三、 🎯 对标 Pi 80%+ 核心能力全景](#三--对标-pi-80-核心能力全景)
- [四、 🧩 场景化预设矩阵 (Presets for Developers)](#四--场景化预设矩阵-presets-for-developers)
- [五、 🏗️ Cordis 微内核与两级配置架构](#五-️-cordis-微内核与两级配置架构)
- [六、 🌐 交互式能力接缝与拓扑依赖图](#六--交互式能力接缝与拓扑依赖图)
- [七、 📚 深度文档中心 (Documentation Hub)](#七--深度文档中心-documentation-hub)

---

## 一、 项目初心与核心愿景

在开源自主 AI 编码领域，[`earendil-works/pi`](https://github.com/earendil-works/pi) 凭借极简的设计、可靠的文件编辑工具集（`read`/`write`/`edit`/`bash`/`grep`/`find`）和高信噪比的 Agent 循环机制广受赞誉。

**Pi-DSH** 的初心，是**以现代微内核架构对标并复现 Pi 80%+ 的核心编码能力**，并借助 **DeepSeek Harness (DSH)** 与 **Cordis (v4.0.1)** 微内核的“Everything is a plugin”设计哲学，赋予 AI 编码助手以下关键进化：

1. **100% 官方 DSH 插件矩阵 (73 个插件)**：彻底废弃玩具级 Mock 存根，直接运行官方纯正的 37 个宿主插件与 36 个浏览器端微前端 UI 插槽插件；
2. **全功能 Web GUI 与 Headless 双模态**：在保留命令行自动化与 REPL 的同时，提供包含思维链流式展示、工作区目录选择器、Diff 对比与设置中心的现代 Web 界面；
3. **能力接缝（Capability Seam）三位一体**：严格解耦 `⚡ 驱动实现 (Provider)`、`🔨 业务消费 (Consumer)` 与 `📐 契约定义 (Definition)`，保证系统高内聚、低耦合与安全可控；
4. **两级配置治理 (Profile vs Preset)**：将“基础设施环境配置”与“会话级智能体预设”彻底分离，实现跨环境一键无缝切换。

---

## 二、 ⚡ 30 秒极速开箱 (Quickstart)

### 1. 安装依赖

```bash
git clone https://github.com/civaapple-alt/pi-dsh.git
cd pi-dsh
pnpm install
```

### 2. 配置环境变量

在项目根目录下配置 `.env` 文件（或继承系统全局环境变量）：

```env
DEEPSEEK_API_KEY=sk-your-deepseek-api-key
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
```

### 3. 一键启动体验

#### 🌟 方式 A：启动现代 Web GUI 工作台 (推荐)
```bash
pnpm start
# 浏览器访问 http://localhost:3000
```

#### ⚡ 方式 B：执行单任务 Headless 自动化 (CLI 批处理)
```bash
pnpm headless "检查当前仓库的 Git 状态并列出修改的文件"
```

#### 💻 方式 C：启动终端交互式 REPL
```bash
pnpm pi --profile headless --preset standard
```

---

## 三、 🎯 对标 Pi 80%+ 核心能力全景

Pi-DSH 完整复刻并超集实现了 [`earendil-works/pi`](https://github.com/earendil-works/pi) 的核心工具链与智能体循环：

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Pi-DSH 核心能力对标全景 (Pi Parity)                       │
├───────────────────┬───────────────────────────────────┬─────────────────────┤
│ Pi 原生能力        │ Pi-DSH 官方插件实现                │ 对标达成率 / 特性    │
├───────────────────┼───────────────────────────────────┼─────────────────────┤
│ 📖 文件读取 (read)  │ @deepseek-ai/dsh-tool-fs          │ 100% (按行切片/截断) │
│ ✍️ 文件写入 (write) │ @deepseek-ai/dsh-tool-fs          │ 100% (原子覆写/自建) │
│ ✂️ 精确编辑 (edit)  │ @deepseek-ai/dsh-tool-str-replace │ 100% (多块精准替换)  │
│ 💻 终端执行 (bash)  │ @deepseek-ai/dsh-tool-bash        │ 100% (跨平台进程池)  │
│ 🔍 正则检索 (grep)  │ @deepseek-ai/dsh-tool-fs-search   │ 100% (Ripgrep 高速)  │
│ 📂 文件查找 (find)  │ @deepseek-ai/dsh-tool-fs-search   │ 100% (Glob 递归匹配) │
│ 🌲 目录结构 (ls)    │ @deepseek-ai/dsh-tool-fs          │ 100% (元数据树状列举)│
│ 📋 任务跟踪 (Todo)  │ @deepseek-ai/dsh-tool-todo        │ 120% (超集原生看板)  │
│ 🤖 Agent 循环/CoT   │ @deepseek-ai/dsh-agent-loop       │ 100% (流式思维链)    │
│ 💾 会话存储/压缩    │ @deepseek-ai/dsh-session + SQLite │ 100% (JSONL + 压缩)  │
│ 🌐 交互界面         │ 36 个官方微前端 UI 矩阵           │ 200% (Web GUI 赋能)  │
└───────────────────┴───────────────────────────────────┴─────────────────────┘
```

> 详细参数对照与源码解析详见：📄 [**Pi vs Pi-DSH 功能对标矩阵与源码解析**](docs/pi-feature-parity-matrix.md)

---

## 四、 🧩 场景化预设矩阵 (Presets for Developers)

在 Pi-DSH 中，**Preset（预设）** 决定了 Agent 在特定会话中的能力集与权限边界。我们提炼了 3 种面向真实开发场景的预设：

```text
                                  【选择你的开发场景】
                                         │
        ┌────────────────────────────────┼────────────────────────────────┐
        ▼                                ▼                                ▼
【场景 1：全能编码助手】            【场景 2：安全代码审查】          【场景 3：极简运维终端】
 需要写代码、改文件、跑测试          只看不改、安全审计、排查 Bug       执行脚本、容器构建、环境检查
        │                                │                                │
        ▼                                ▼                                ▼
 🌟 standard (标准全能模式)        🛡️ reviewer (代码审查模式)        ⚡ minimal (极简终端模式)
 包含 Pi 全套 6 核心工具           仅只读搜索，禁写禁终端            仅注入 Bash，极省 Token
```

1. 🌟 **`standard`（标准全能模式 —— 默认推荐）**：配备文件读写、精准块替换、Bash 终端、Ripgrep 全局检索与 Todo 看板，适合日常全栈编码与功能开发。
2. 🛡️ **`reviewer`（代码审查与审计模式）**：仅开放 `view_file` 与 `grep_search`。**完全移除了文件写回与终端执行工具，100% 杜绝误改线上代码**，专用于 PR Review 与安全审计。
3. ⚡ **`minimal`（极简终端运维模式）**：仅保留 `run_command`（Bash）。**大幅精简 System Prompt 与工具声明，将单轮 Token 消耗降至最低**，适合 CI/CD 与自动化脚本。

---

## 五、 🏗️ Cordis 微内核与两级配置架构

Pi-DSH 采用先进的 **两级解耦配置模型**，确保系统在保持微内核高内聚的同时灵活支持各种定制需求：

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. 基础设施层：Profiles (profiles/*.yml)                                     │
│    负责装载系统底层服务：WebServer、RPC 网关、存储引擎、微前端 Bundle 清单     │
├─────────────────────────────────────────────────────────────────────────────┤
│ 2. 会话能力层：Presets (presets/*/agent.cordis.yml)                          │
│    负责在运行时向特定 Agent 作用域动态注入工具集与 System Prompt              │
└─────────────────────────────────────────────────────────────────────────────┘
```

* **动态本地 Monorepo 直连**：启动器自动扫描相邻的 `deepseek-harness` 仓库物理路径，无需发布 npm，修改代码后热联动即时生效；
* **零硬编码绝对路径**：所有 Profile 与 Preset 配置均采用跨平台相对路径，随处克隆即可直接运行。

---

## 六、 🌐 交互式能力接缝与拓扑依赖图

打开 Web GUI「设置」->「插件」->「**🌐 依赖图**」，即可体验 60fps 的交互式架构拓扑流：

* **🌲 四列分层拓扑流 (Hierarchical DAG)**：
  - `第 1 列`：⚡ 宿主底层驱动 (Providers: `fs-local`, `subprocess-local` 等)
  - `第 2 列`：📐 服务面与通信网关 (Services & RPC: `typert`, `gateway` 等)
  - `第 3 列`：🤖 智能体内核与工具 (Agent & Tools: `tool-fs`, `agent-loop` 等)
  - `第 4 列`：🌐 浏览器微前端 UI 矩阵 (Micro-Frontends: `ui-sidebar`, `ui-conversation` 等)
* **DSH 能力接缝三位一体辨析**：直观过滤 `⚡ 驱动实现`、`🔨 业务消费` 与 `📐 契约定义`；
* **双主题原生自适应**：深色模式与浅色模式实时无缝切换。

---

## 七、 📚 深度文档中心 (Documentation Hub)

为了满足不同阶段开发者的探索需求，Pi-DSH 建立了分层递进的文档体系：

| 文档名称 | 适合读者 | 核心内容 |
|---|---|---|
| 🎯 [**Pi vs Pi-DSH 核心能力对标矩阵**](docs/pi-feature-parity-matrix.md) | 想了解功能覆盖度的开发者 | 逐项对比 Pi 原生工具链、智能体循环与预设场景划分 |
| 🛠️ [**DSH 官方生态集成与适配改动技术文档**](docs/dsh-adaptation-changes.md) | 想了解底层补丁与构建机制的开发者 | 详解 Typert RPC 异步微轮询代理、依赖图插槽注入与跨仓库构建工作流 |
| 📖 [**Cordis 微内核全链路集成与排障实战指南**](docs/cordis-dsh-integration-guide.md) | 深入微内核架构的开发者 | 深度解剖 Cordis 隐式依赖注入、双端微内核同构与 5 大关键突破战役 |
| 📋 [**版本更新日志 (CHANGELOG.md)**](CHANGELOG.md) | 关注版本迭代的开发者 | 记录 v0.1.0 ~ v0.4.0 的完整架构跃迁与 Commit 追溯 |
| 📝 [**架构决策记录 (ADR / Agent Notes)**](.agents/notes/README.zh.md) | 架构师与核心贡献者 | 记录能力接缝图、微前端路由分发等关键技术决策与权衡 |

---

<p align="center">
  <b>Pi-DSH</b> — 现代微内核与工业级 Agent 运行时的卓越结合。
</p>
