# Pi-DSH 与原生 DeepSeek Harness (DSH) 深度对比与架构解析

本文档全面对比 **Pi-DSH** 与 **原生 DeepSeek Harness (DSH)** 在架构设计、上手成本、交互模式、跨平台终端适配、模型对齐及工程落地等维度的异同与各自优势。

---

## 📊 一、 核心特性对比总览矩阵

| 评估维度 | 原生 DeepSeek Harness (DSH) | Pi-DSH (本框架) |
| :--- | :--- | :--- |
| **定位与目标** | 官方插件化智能体基础框架与底座引擎 | 面向日常开发者的开箱即用生产力套件与轻量化宿主 |
| **上手门槛** | 较复杂（70+ Monorepo 子包，需全量编译与深度依赖环境） | 极简（`pnpm install && pnpm start` 一键起跑） |
| **架构底座** | Vendored Cordis 4.x 微内核 + Typert RPC | 完整继承 DSH 官方 Cordis 微内核与插件矩阵 |
| **Web GUI 面板** | 官方微前端插槽 UI 矩阵（对话、设置、工作区） | 完整继承官方 Web UI + **新增 Koishi 风格交互式依赖图** |
| **插件依赖可视化** | 无可视化拓扑图（仅有纯文本列表） | **60fps 交互式拓扑依赖图**（分层 DAG 流 & 力导向星系图） |
| **CLI 交互终端** | 基础启动器与无头命令 | **Pi 风格交互式 REPL**（支持 `/model`, `/preset`, `/compact`） |
| **Headless 自动化** | 支持内部 Profile 加载 | **一键单任务自动化**（`pnpm headless "<task>"`，实时流式输出） |
| **Windows 兼容性** | 需适配调整（默认 Bash，存在路径与权限断言门禁） | **原生深度适配**（PowerShell 动态映射、ACL 权限保护、0 硬编码） |
| **跨平台终端驱动** | 依赖抽象 Seam 加载 | **双向自动映射**（Win 注入 `pwsh`，Linux/macOS 注入 `bash`） |
| **模型后训练对齐** | 官方标准提示词与人设基准 | **100% 保持官方 Persona 标准**，最大化发挥 V3/R1/V4 性能 |
| **Prompt Cache 监控** | 依赖底盘会话投影计算 | **全量装配 `session-projection`**，实时展示缓存命中率与 Token 消耗 |
| **配置组织形式** | 多层 Patch 叠加（`base.patch` + `web-app.patch`） | **直观两级模型**（`profiles/` 基础设施 + `presets/` 能力清单） |
| **工作区数据隔离** | 混合存放在全局 `~/.dsh` 与局部缓存 | **`.sessions/` 与 `.storage/` 隔离**，Git 树 100% 纯净 |

---

## 🏛️ 二、 核心架构与设计哲学差异

### 1. 原生 DSH：庞大而严密的“学术与企业级插件底座”

```
┌─────────────────────────────────────────────────────────────┐
│                 原生 DeepSeek Harness (DSH)                  │
├─────────────────────────────────────────────────────────────┤
│ 📦 70+ 个细粒度 Monorepo 包 (@deepseek-ai/dsh-*)             │
│ 📐 严格的三位一体能力接缝 (Service Definition / Provider / Consumer) │
│ 🛡️ 极度严苛的质量门禁 (100% 测试覆盖率、Monotonic Schema、ADR 规范) │
│ ⚙️ 依赖复杂编译流水线 (tsc -> tsdown -> publint -> knip -> wine)│
└─────────────────────────────────────────────────────────────┘
```

* **设计初衷**：作为 DeepSeek 官方研发的 Agent 框架，“Everything is a plugin”（一切皆插件），追求极度的解耦、类型安全与理论完备性；
* **使用痛点**：对于普通开发者而言，如果只想拥有一个快速、好用、随叫随到的 DeepSeek 编码助手，直接 Clone 官方仓库的构建和配置门槛极高，且在 Windows 下极易遇到环境摩擦。

### 2. Pi-DSH：轻量、敏捷、开箱即用的“开发者日常生产力利器”

```
┌─────────────────────────────────────────────────────────────┐
│                           Pi-DSH                            │
├─────────────────────────────────────────────────────────────┤
│ 🌐 完整 Web GUI 面板（含独创插件拓扑图）                        │
│ 💬 交互式 CLI REPL（/model, /preset 热切换）                 │
│ ⚡ Headless 单任务自动化（流式 CoT 思考 + 原生 Tool Call）     │
│ 🪟 Windows / Linux / macOS 原生跨平台自适应终端驱动          │
│ 📁 清晰的 profiles/ 与 presets/ 两级配置体系                 │
└─────────────────────────────────────────────────────────────┘
```

* **设计初衷**：在 **100% 保留 DSH 底层强大的 Cordis 微内核与官方插件生态** 的前提下，做减法与体验增强；
* **核心价值**：零多余包袱，开箱即用，兼顾强大的 Web 视觉分析与闪电般的终端命令行操作。

---

## 🔍 三、 关键功能维度深度解析

### 1. 三合一多模态运行模式

原生 DSH 的入口主要服务于全量 Web 和自动化集成；Pi-DSH 则将交互形态细化为三大独立场景：

```
┌─────────────────────────────────────────────────────────────────┐
│                      Pi-DSH 运行时入口矩阵                      │
├───────────────────┬─────────────────────────┬───────────────────┤
│    🌐 Web GUI     │       💬 CLI REPL       │    ⚡ Headless     │
│   (`pnpm start`)  │        (`pnpm pi`)      │ (`pnpm headless`) │
├───────────────────┼─────────────────────────┼───────────────────┤
│ • 视觉化 Diff 卡片 │ • 极速终端常驻          │ • 一次性任务执行  │
│ • 插件依赖拓扑图  │ • /model 模型动态热切换 │ • 实时流式思考    │
│ • 多会话管理      │ • /preset 预设热切换    │ • 适合 CI/CD 与   │
│ • 设置与模型配置  │ • 键盘方向键历史翻阅    │   Git Hooks 脚本  │
└───────────────────┴─────────────────────────┴───────────────────┘
```

---

### 2. 独创「Cordis 插件与能力接缝可视化依赖图」

原生 DSH 在「设置」$\to$「插件」中仅提供简单的纯文本条目列表；Pi-DSH 在 Web GUI 中独家研发了 **`PluginDependencyGraphTab` 插件依赖拓扑图**：

* **60fps 交互引擎**：支持全屏缩放、平移画布、悬停高亮关联光纤、拖拽物理排布；
* **双布局算法**：
  * **🌲 分层拓扑流 (Hierarchical DAG)**：按四列清晰流水线展示（`驱动层` $\to$ `服务/通信网关` $\to$ `智能体/工具` $\to$ `微前端 UI 矩阵`）；
  * **🪐 物理星系图 (Force Clustered)**：动态天体引力聚类。
* **DSH 能力接缝 (Capability Seam) 角色标识**：
  * ⚡ **Provider**（驱动实现）：如 `fs-local`、`pwsh-local`、`llm-deepseek`
  * 🔨 **Consumer**（业务消费）：如 `tool-fs`、`client-ui-conversation`
  * 📐 **Definition**（服务契约）：如 `dsh-fs`、`dsh-shell`
* **右侧属性检查器**：点击任意节点即时查看其导出的服务、消费的 `inject` 依赖与运行时配置快照；
* **深浅双色自适应**：无缝跟随系统或界面主题动态切换渲染配色。

---

### 3. Windows 原生环境与跨平台终端深度适配

在 Windows 开发环境下，原生 DSH 往往由于默认假设 POSIX Bash 环境而出现兼容性摩擦。Pi-DSH 进行了端到端针对性加固：

1. **跨平台条件化隔离 (Platform Gating)**：
   在预设 YAML 中运用 Cordis 原生 JavaScript 条件：
   ```yaml
   - name: '@deepseek-ai/dsh-tool-bash'
     disabled: !!js process.platform === 'win32'
   - name: '@deepseek-ai/dsh-tool-pwsh'
     disabled: !!js process.platform !== 'win32'
   ```
   在 Windows 下自动只暴露 `pwsh`，杜绝模型在第 1 轮发出 `ls -la` 报错；在 Linux/macOS 下自动暴露 `bash`。
2. **抽象 Seam 运行时映射**：
   CLI 启动时自动将抽象接口 `@deepseek-ai/dsh-shell` 替换绑定为平台的真实驱动，彻底根治 `ctx.shell.resolve is not a function`。
3. **Windows 特殊系统目录容错**：
   针对 Windows 驱动器根目录下的受保护目录（如 `System Volume Information`），捕获并标记为 `other`，避免权限拒绝抛错中断全局文件浏览。

---

### 4. 严格遵循官方模型后训练 (Post-Training) 对齐规范

DeepSeek-V3 / R1 / V4 等模型在后训练（SFT & RL）阶段对 System Prompt 的格式极其敏感：

* **原生 DSH 标准规范**：
  * 全局身份 (`dsh-system-prompt`) + Slot 0 人设 (`dsh-persona`) + 项目规则 (`dsh-agent-instructions` 自动读取 `AGENTS.md`)；
* **Pi-DSH 的严格遵循**：
  * 不随意加长或私自魔改 Persona 文本，100% 保持官方精炼模板：
    ```text
    You are a coding agent powered by the {{model}} model. Your working directory is {{cwd}}.
    ```
  * **收益**：最大化激发模型的工具调用先验能力，杜绝废话推演，并实现 **85% ~ 95% 的 Prompt Cache 极高缓存命中率**。

---

## 🎯 四、 选型与使用建议

* **如果您需要**：深度参与 DeepSeek 官方底层基础设施研发、编写新的底层 Seam 契约、向官方贡献 Monorepo 核心包 $\to$ **建议使用 原生 DSH 源码仓库**；
* **如果您需要**：日常写代码、做工程重构、终端快速排错、CI/CD 自动化审核、享受丝滑的跨平台交互体验与可视化依赖观测 $\to$ **推荐使用 Pi-DSH**！
