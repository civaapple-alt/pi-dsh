# profiles/ — 基础设施配置 Profile 目录

[English](README.md) | 中文

`profiles/` 目录下存放宿主进程启动时加载的基础设施配置文件（Profile YAML）。

---

## 现有 Profiles 概览

| Profile 文件 | 启动命令 | 加载插件 | 适用场景 |
|---|---|---|---|
| [**`web.yml`**](web.yml) | `pnpm start` | `host-webserver`, `agent`, `agent-presets`, `agent-loop` | 启动 Web GUI 交互界面（监听 `http://localhost:3000`）。 |
| [**`headless.yml`**](headless.yml) | `pnpm headless "<task>"` | `agent`, `agent-presets`, `agent-loop` | 单任务自动化脚本调用或交互式终端 REPL。 |
