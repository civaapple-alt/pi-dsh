# packages/ — 自定义与扩展插件空间 (Custom Plugins Workspace)

[English](README.md) | 中文

`packages/` 目录用于存放用户自定义的 Cordis 插件与扩展模块。

---

## 插件加载机制

1. **官方 DSH 插件**：
   - 所有的 `@deepseek-ai/dsh-*` 基础插件、核心智能体循环、微前端 UI 矩阵等 50+ 个官方包均由 Monorepo 底座直接提供并加载。
2. **用户私有/自定义插件**：
   - 若您需要开发专属工具、私有数据库连接器或自定义微前端组件，可直接在本目录（如 `packages/my-custom-tool`）下创建符合 Cordis 规范的插件包。
   - `apps/cli` 会自动扫描本目录下的插件，并在 `profiles/*.yml` 中声明后无缝挂载。
