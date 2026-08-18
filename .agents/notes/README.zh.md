# Pi-DSH 架构与设计决策记录 (Agent Notes)

[English](README.md) | 中文

本目录记录了 Pi-DSH 项目的关键架构决策记录（ADR）、技术选型与权衡分析。

---

## 目录索引

| 提出日期 | 决策标题 | 核心主题 |
|---|---|---|
| `2026-08-18` | [微前端静态路由分发、Cordis 原生 Loader 实例与会话预设动态装配](implemented/architecture/2026-08-18-micro-frontend-routing-and-loader-preset-resolution.zh.md) | 基于 `clientModules.table` 彻底解决 `/plugins/*` 404 路由分发、`window.__DSH_BOOT__` 启动清单原子覆盖、Cordis 原生 `Loader` 实例与标准预设 Seam 能力补齐 |
| `2026-08-18` | [100% 官方 DSH 插件生态与微前端插槽矩阵](implemented/architecture/2026-08-18-dsh-official-plugins-and-micro-frontend-matrix.zh.md) | 全量官方 `@deepseek-ai/dsh-*` 套件（50+ 核心插件）、34 个 Client UI 微前端插槽矩阵、Typert 远程 RPC 网关、目录选择器 Seam 与拓扑启动器 |
| `2026-08-18` | [Pi-DSH 微内核与双层配置模型架构设计](implemented/architecture/2026-08-18-pi-dsh-agent-and-presets-architecture.zh.md) | Cordis 微内核架构、Profile 与 Preset 双层配置模型、Turn 轮次执行引擎与 Web/Headless 双模态 |
