# presets/ — Agent 角色与能力预设目录

[English](README.md) | 中文

`presets/` 目录下存放系统中所有的 Agent 角色与能力预设。每个预设为一个独立子目录，包含两份文件：
1. **`preset.yml`**：预设的展示名称与描述元数据；
2. **`agent.cordis.yml`**：该角色在创建时**独占挂载到该 Agent 上下文**中的插件列表（如各种工具插件与提示词）。

---

## 现有 Presets 概览

| 预设名称 | 目录路径 | 挂载插件列表 | 适用场景 |
|---|---|---|---|
| **Coder** | [`presets/coder/`](coder/) | `system-prompt`, `tools`, `tool-fs`, `tool-bash`, `tool-search` | 完整能力 AI 编码开发助手（支持读写文件、运行命令、搜索代码）。 |
| **Reviewer** | [`presets/reviewer/`](reviewer/) | `system-prompt`, `tools`, `tool-fs` (只读), `tool-search` | 代码审查与诊断（禁用命令执行与写入，只读安全）。 |
| **Minimal** | [`presets/minimal/`](minimal/) | `system-prompt`, `tools`, `tool-bash` | 极简终端执行 Agent。 |
