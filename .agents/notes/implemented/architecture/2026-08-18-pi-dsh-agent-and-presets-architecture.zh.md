# Agent Note: Pi-DSH 架构与两级配置体系 (Pi-DSH Architecture & Profile/Preset Model)

Status: implemented

[English](2026-08-18-pi-dsh-agent-and-presets-architecture.md) | 中文

> 范围：记录 Pi-DSH 的 Cordis 核心微内核架构、Agent 轮次流引擎、两级配置体系（Profiles & Presets）、工具链设计与双端运行机制。

---

## 1. 架构目标与背景

Pi-DSH 旨在提供一个干净、功能完备且直接对标 DeepSeek Harness (`dsh`) 规范的 AI Coding Agent 脚手架：
1. **完全采用 `@deepseek-ai/cordis` 微内核**；
2. **两级配置治理**：
   - **Profiles** (`profiles/*.yml`) 负责加载系统级基础设施；
   - **Presets** (`presets/*/agent.cordis.yml`) 负责为 Agent 动态挂载专属的工具与提示词；
3. **提供全套 Pi Coding Agent 核心工具**（文件读写/替换、终端执行、代码与文件搜索）；
4. **同时支持 Web GUI 与 Headless CLI / REPL 运行模式**。

---

## 2. 核心架构设计

```text
┌─────────────────────────────────────────────────────────────┐
│ 1. 启动入口 (apps/cli)                                      │
│    解析 --profile (web / headless) 和 --preset (coder / ...)│
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
               ▼                              ▼
┌──────────────────────────────┐ ┌────────────────────────────┐
│ 2. Profile 基础设施层        │ │ 3. Preset 智能体角色预设   │
│    @pi-dsh/host-webserver    │ │    presets/coder/          │
│    @pi-dsh/agent (Registry)  │ │    ├── @pi-dsh/tool-fs     │
│    @pi-dsh/agent-presets     │ │    ├── @pi-dsh/tool-bash   │
│    @pi-dsh/agent-loop        │ │    └── @pi-dsh/tool-search │
└──────────────┬───────────────┘ └─────────────┬──────────────┘
               │                               │
               └───────────────┬───────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. 运行时驱动 (AgentLoop & SSE / REPL)                      │
│    大模型流式推理 + 工具调用拦截 + 递归轮次观测闭环          │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. 验证保证

1. **Headless 单任务验证**：`pnpm headless "List files"` 成功通过大模型流式推理并调用 `list_dir` 观测结果输出；
2. **Web GUI 交互验证**：`pnpm start` 启动在 `http://localhost:3000`，支持 SSE 实时打字机推流与 Preset 动态切换；
3. **TypeScript 强类型保证**：所有 9 个内部模块均已通过 `pnpm run build` 成功输出至 `lib/` 目录。
