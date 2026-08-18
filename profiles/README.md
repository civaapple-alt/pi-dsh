# profiles/ — 基础设施配置 Profile 目录

[English](README.md) | 中文

`profiles/` 目录下存放宿主进程启动时加载的基础设施配置文件（Profile YAML）。

---

## 现有 Profiles 概览

| Profile 文件 | 启动命令 | 加载插件矩阵 | 适用场景 |
|---|---|---|---|
| [**`web.yml`**](web.yml) | `pnpm start` | **50+ 官方 DSH 插件**：<br>- 核心服务：`dsh-system-prompt`, `dsh-storage-domain`, `dsh-api-gateway`, `dsh-api-remotes`, `dsh-llm-deepseek`<br>- 宿主网关：`dsh-host-webserver`, `dsh-host-frontend-static`, `dsh-host-directory-picker-browse`, `dsh-host-plugin-inventory`<br>- **34 个微前端 UI 插件**：`dsh-client-ui-layout`, `dsh-client-ui-sidebar`, `dsh-client-ui-workspace`, `dsh-client-ui-theme`, `dsh-client-ui-directory-picker-browse` 等 | 官方完整 Web GUI 浏览器交互界面（监听 `http://localhost:3000`）。 |
| [**`headless.yml`**](headless.yml) | `pnpm headless "<task>"` | `dsh-system-prompt`, `dsh-tools`, `dsh-agent`, `dsh-agent-presets`, `dsh-agent-loop`, `dsh-llm-deepseek` 等 | 单任务自动化脚本调用或交互式终端 REPL。 |
