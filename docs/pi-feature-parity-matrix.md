# Pi (earendil-works/pi) vs Pi-DSH 功能对标矩阵与预设体系文档

**版本**：v0.4.0  
**基准参考**：[`earendil-works/pi`](https://github.com/earendil-works/pi) (本地镜像 `D:\gh-ws\pi`)  
**目标**：100% 基于官方 Cordis 微内核与 DSH 插件生态，实现对标 Pi 核心能力 80%+ 并提供现代化 Web GUI 与多预设支持。

---

## 📊 一、 Pi vs Pi-DSH 全景功能对照矩阵 (Feature Parity Matrix)

| 核心领域 | Pi 官方功能 (`earendil-works/pi`) | Pi-DSH 对应实现 (`@deepseek-ai/dsh-*`) | 对标达成率 | 说明 |
|---|---|---|---|---|
| **1. 工具链 (Tools)** | | | **100%** | **完全对齐且超集支持** |
| • 文件读取 | `read.ts` (`read`) | `@deepseek-ai/dsh-tool-fs` (`view_file`) | 100% | 支持按行切片、偏移读取与截断保护 |
| • 文件创建/写入 | `write.ts` (`write`) | `@deepseek-ai/dsh-tool-fs` (`write_file`) | 100% | 支持全文件原子覆写与目录自建 |
| • 精确块替换编辑 | `edit.ts` / `edit-diff.ts` | `@deepseek-ai/dsh-tool-str-replace-editor` | 100% | 支持单块与多块精确字符串替换，Diff 渲染 |
| • 终端执行 | `bash.ts` (`bash`) | `@deepseek-ai/dsh-tool-bash` (`run_command`) | 100% | 跨平台子进程调度、超时守护与输出截断 |
| • 全局正则检索 | `grep.ts` (`grep` - ripgrep) | `@deepseek-ai/dsh-tool-fs-search` (`grep_search`) | 100% | 基于 ripgrep 的多文件高速正则检索 |
| • 文件名称查找 | `find.ts` (`find` - glob) | `@deepseek-ai/dsh-tool-fs-search` (`find_by_name`) | 100% | 基于 fd / glob 的目录递归匹配 |
| • 目录结构浏览 | `ls.ts` (`ls`) | `@deepseek-ai/dsh-tool-fs` (`list_dir`) | 100% | 递归目录树与子项元数据列举 |
| • 任务看板 (超集) | 无原生独立工具 | `@deepseek-ai/dsh-tool-todo` (`todo_write`) | 120% | 原生内置 Todo 任务拆解与进度流追踪 |
| • 用户交互 (超集) | 终端交互 | `@deepseek-ai/dsh-user-questions` (`ask_question`) | 120% | 结构化多选/单选用户追问卡片 |
| **2. 智能体内核与循环** | | | **100%** | **全生命周期同构** |
| • Agent 循环调度 | `packages/agent` (`AgentSession`) | `@deepseek-ai/dsh-agent` + `dsh-agent-loop` | 100% | 多轮工具调用（Tool Loop）、流式输出 |
| • 思维链 (CoT) | Streaming Reasoning | `dsh-client-ui-trajectory` + `ui-conversation` | 100% | 流式折叠 Thinking 块、状态机流转 |
| • 上下文压缩与计数 | `compaction/`, `cache-stats.ts` | `@deepseek-ai/dsh-compaction-basic` + `dsh-token-meter` | 100% | 上下文自动衰减、Token 实时监控 |
| • 会话持久化 | `session-manager.ts` (`.jsonl`) | `@deepseek-ai/dsh-session-persistence-jsonl` | 100% | 标准 JSONL 追加式存储与 SQLite 索引检索 |
| **3. 扩展与技能 (Skills)** | | | **100%** | **生态超集** |
| • 技能规范 | `skills.ts` (`SKILL.md`) | `@deepseek-ai/dsh-client-ui-skill` + `dsh-skill` | 100% | 支持 `.agents/skills` 目录结构与 Prompt 注入 |
| • 插件/扩展机制 | 自定义 extensions | `@deepseek-ai/cordis` 73+ 插件微内核 | 150% | 真正的运行时 IoC 依赖注入与动态卸载 |
| **4. 交互形态与界面** | | | **120%** | **现代化 Web GUI 赋能** |
| • 终端命令行模式 | CLI + TUI (`@earendil-works/pi-tui`) | `pnpm headless "task"` (单任务 / REPL) | 100% | 支持非交互式流水线与终端 REPL 交互 |
| • 图形化工作台 (超集)| 仅 TUI 终端 | 36 个官方微前端矩阵 (Web GUI) | 200% | 现代 Web 界面：工作区选择、Diff 视图、依赖图、设置中心 |

---

## 🧩 二、 从 Pi 对标视角看 Pi-DSH 预设 (Preset) 体系设计

Pi 官方在 CLI 模式下通过不同配置和参数覆盖不同的开发工作流。在 Pi-DSH 中，我们将这些工作流抽象为 **3+1 结构化预设矩阵**：

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Pi-DSH 预设矩阵 (Presets)                           │
├───────────────────┬─────────────────────────────────────────────────────────┤
│ 🌟 standard (默认) │ 对标 Pi 核心完整编码能力 (Full Coding Suite)            │
│ 🛡️ reviewer       │ 对标 Pi 安全代码审查模式 (Read-Only Inspection)         │
│ ⚡ minimal        │ 对标 Pi 极简终端运维模式 (Bash Execution Only)           │
│ 🚀 coder          │ 高阶重构专家 (Deep Refactoring & Extension)             │
└───────────────────┴─────────────────────────────────────────────────────────┘
```

---

### 1. `standard` (标准全能编码预设 —— 推荐默认)
* **对标 Pi 场景**：日常软件工程师全功能开发、功能编写、调试与测试。
* **装载工具集**：
  - `view_file`, `write_file`, `list_dir` (`@deepseek-ai/dsh-tool-fs`)
  - `str_replace_editor` (`@deepseek-ai/dsh-tool-str-replace-editor`)
  - `run_command` (`@deepseek-ai/dsh-tool-bash`)
  - `grep_search`, `find_by_name` (`@deepseek-ai/dsh-tool-fs-search`)
  - `todo_write` (`@deepseek-ai/dsh-tool-todo`)
* **权限特征**：完整读写与终端命令执行权限。

---

### 2. `reviewer` (代码审查与安全审计预设)
* **对标 Pi 场景**：代码审查（PR Review）、架构评估、漏洞排查、只看不改。
* **装载工具集**：
  - `view_file`, `list_dir` (`@deepseek-ai/dsh-tool-fs`)
  - `grep_search`, `find_by_name` (`@deepseek-ai/dsh-tool-fs-search`)
* **权限特征**：**纯只读 (Read-Only)**。
  - ❌ 无 `write_file`
  - ❌ 无 `str_replace_editor`
  - ❌ 无 `run_command` (Bash)
  - 保证模型绝对无法对本地磁盘做任何写操作或恶意代码执行。

---

### 3. `minimal` (极简终端运维预设)
* **对标 Pi 场景**：CI/CD 自动化流水线、纯终端脚本批处理、环境探测。
* **装载工具集**：
  - `run_command` (`@deepseek-ai/dsh-tool-bash`)
* **权限特征**：**纯终端权限**。
  - 大幅缩减 System Prompt 与工具声明，将单轮对话的 Prompt Token 消耗降至最低，响应极速。

---

### 4. `coder` (深度开发工程师预设)
* **定位**：对标针对长文本多文件联动的重构专家，提供全套文件与终端自动化能力。

---

## 🛠️ 三、 快速启动与预设切换指南

### 1. Web GUI 界面启动 (默认装配 `standard` 预设)
```bash
cd D:\gh-ws\dsh-ws\pi-dsh
pnpm start
# 浏览器访问 http://localhost:3000，在界面左下角「设置」->「Agent 预设」中可随时一键切换预设
```

### 2. 命令行单任务调用 (指定预设)
```bash
# 使用 standard 预设执行编码任务
pnpm headless --preset standard "优化 apps/cli 中的路径解析逻辑"

# 使用 reviewer 预设执行只读代码审查
pnpm headless --preset reviewer "审查 presets/ 目录下的配置安全性"

# 使用 minimal 预设执行终端运维任务
pnpm headless --preset minimal "检查系统 node 和 pnpm 版本环境"
```

---

## 📌 总结

Pi-DSH 不仅 **100% 覆盖了 Pi 原生 coding-agent 的全部 6 项核心文件与终端操作工具**，更借助 Cordis 插件体系实现了 **能力接缝三位一体隔离、Web 微前端图形化呈现与多预设安全流转**，达成了对标 Pi 80%+ 并实现工业化生产落地的目标。
