# Pi-DSH 文档中心 (Documentation)

欢迎查阅 **Pi-DSH** 技术文档。本文档库整理了项目在微内核架构设计、官方插件矩阵装配与实际工程落地中的核心指南与实战总结。

---

## 📚 核心文档索引

| 文档名称 | 核心主题 | 说明 |
| ⚖️ [**Pi-DSH 与原生 DeepSeek Harness (DSH) 深度对比与架构解析**](pi-dsh-vs-dsh-comparison.md) | 对比解析 / 架构与生产力评估 | 全面解剖 Pi-DSH 与官方 DSH 底座在定位、上手门槛、三合一模式、Windows 终端适配与模型对齐维度的异同 |
| 🎯 [**Pi (earendil-works/pi) vs Pi-DSH 功能对标矩阵与预设体系**](pi-feature-parity-matrix.md) | 对标分析 / 预设能力场景解析 | 逐项比对 Pi 原生 6 大工具与内核循环，详述 Standard / Reviewer / Minimal 预设场景划分与权限特征 |
| 📖 [**Cordis 微内核与 DSH 官方生态全链路集成与架构实践总结**](cordis-dsh-integration-guide.md) | 架构集成总结 / 实战排障指南 | 深度解剖 Cordis 隐式依赖注入、双端微内核同构、Capability Seam 三位一体分层、会话隔离与关键突破解决方案 |
| 🛠️ [**DSH (DeepSeek Harness) 集成与适配改动技术文档**](dsh-adaptation-changes.md) | DSH 适配改动 / 源码补丁解析 | 详解 Typert RPC 异步微轮询代理、依赖图插槽注入、设置弹窗大屏适配与 Monorepo 依赖补齐 |
| 📋 [**更新日志与版本历史 (CHANGELOG)**](../CHANGELOG.md) | 版本发布记录 / 缺陷修复履历 | 详细记录 v0.1.0 ~ v0.4.0 的架构跃迁、Bug 修复及 Commit 追溯 |
| 🛡️ [**开发与架构规范 (AGENTS.md)**](../AGENTS.md) | 开发规范 / 架构约束 | 阐明两级配置规范（Profile vs Preset）、Cordis 原生 Loader 契约与微前端规范 |
| 📝 [**架构决策记录 (ADR / Agent Notes)**](../.agents/notes/README.zh.md) | 技术决策分析 / 架构演进 | 包含各阶段核心设计权衡、状态机转换与架构演进记录 |
