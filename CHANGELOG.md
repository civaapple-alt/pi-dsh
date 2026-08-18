# Changelog (更新日志)

所有对 **Pi-DSH** 项目的重要技术变更与修复历史均记录在本文档中。

格式遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，并严格遵循 [语义化版本规范 (SemVer)](https://semver.org/lang/zh-CN/)。

---

## [0.3.0] - 2026-08-18

### 🐛 关键缺陷修复与微前端生态全链路闭环 (Bugfixes & Micro-Frontend Polish)

- **微前端 Bundle 静态路由与分发修复 (`/plugins/*` 404 彻底解决)**：
  - **问题根因**：官方 `@deepseek-ai/dsh-client-modules` 在服务启动时通过 `serveBundle` 处理 `/plugins/<id>/client.js`，其内部强依赖 `this.table` 映射表定位物理产物路径。CLI 在单体启动阶段未将本地与 Monorepo 包的物理 `lib/client.js` 路径注册至 `table`，导致路由未命中返回 404。
  - **解决方案**：在 [`apps/cli/src/index.ts`](apps/cli/src/index.ts) 中自动深度扫描并提取所有声明 `dsh.client.platform: "web"` 的 39 个插件，将其物理路径与动态 `rev` 写入 `clientModules.table`，使 `/plugins` 路由服务 100% 返回 `200 OK` 并正确携带 `text/javascript` MIME 类型。

- **36 个微前端模块启动清单注入修复 (`window.__DSH_BOOT__` 占位覆盖)**：
  - **问题根因**：`dsh-client-modules` 初始化时在 `index.html` 注入了空的 `window.__DSH_BOOT__` 引导清单。CLI 后续的 `tapIndex` 拦截器检测到占位符后跳过了覆盖，导致前端缺失由 36 个微前端模块组成的完整拓扑图，阻断了 `dsh-client-app-shell` 对 `slots`、`sessions`、`layout` 的激活。
  - **解决方案**：重构 `tapIndex` 正则匹配替换逻辑，将完整构建的 36 个微前端 Bundle 清单强制覆盖替换注入到 `<head>` 顶部，保证浏览器端按严格拓扑时序加载并激活。

- **Cordis Loader 原生服务实例接入与会话预设挂载修复 (输入框激活与标准预设)**：
  - **问题根因**：
    1. 点击选择工作区后输入框因 `sessionId === undefined` 处于 `inert: true` 保护锁定状态。
    2. `session.create` 默认请求挂载 `standard` 预设，原配置缺少 `presets` 扫描根目录，报错 `agent-preset-not-found`。
    3. `dsh-agent-presets` 内部 `Include` 类需要调用 `this.loader.ctx.extend` 和 `this.loader.getTasks`，CLI 的简易 mock 对象无法满足。
    4. 预设内工具缺失底层宿主提供的 `fs-local`、`subprocess-local`、`shell-env`、`shell` 核心能力 Seam。
  - **解决方案**：
    1. 在 `apps/cli/src/index.ts` 引入官方 `vendor/loader` 的原生 `Loader` 实例，劫持 `internal.import` 实现无缝动态映射。
    2. 新增 [`presets/standard/`](presets/standard/) 标准全功能编码预设（文件读写、正则替换、Bash 终端、Ripgrep 搜索、Todo 任务），并在 `profiles/web.yml` 中注册 `roots: presets`。
    3. 在 `profiles/web.yml` 中补齐 `dsh-fs-local`、`dsh-subprocess-local`、`dsh-shell-env`、`dsh-shell`，`session.create` 成功返回 `sessionId`，输入框完美解锁。

- **Typert 远程类型 RPC 网关与通信链路补齐 (`typert` & `remote` 依赖解决)**：
  - **问题根因**：浏览器端微前端插件 `dsh-client-runtime` 等需注入 `typert` 与 `remote` 服务，原配置缺失浏览器端注册器导致 33 个插件等待激活挂起。
  - **解决方案**：在 `profiles/web.yml` 第 4 节加入 `@deepseek-ai/dsh-typert-registry` 与 `@deepseek-ai/dsh-api-gateway`，并在 `bundle/web-app` 声明依赖，打通浏览器端与宿主端 Typert RPC 双向网关。

- **工作区选择器单插槽冲突修复 (`single slot collision`)**：
  - **问题根因**：同时引入 `ui-directory-picker-native` 与 `ui-directory-picker-browse` 导致在优先级 0 的单插槽 `conversation.hero.workspace.directoryFlow` 发生冲突报错。
  - **解决方案**：统一采用应用内置式 `dsh-client-ui-directory-picker-browse`（前端）与 `dsh-host-directory-picker-browse`（后端），实现跨平台纯 Web 的文件夹浏览与创建体验。

---

## [0.2.0] - 2026-08-18

### 🚀 重大架构演进：100% 官方 DSH 插件生态与微前端矩阵 (Official DSH Micro-Frontend Matrix)

- **全面拥抱 DSH 官方插件生态**：彻底废弃并移除 9 个自建的本地存根插件（`packages/core/*`、`packages/host/*`、`packages/preset/*`、`packages/tools/*`），将项目底座全面切换为官方 50+ 个 `@deepseek-ai/dsh-*` 正式插件，运行于 `@deepseek-ai/cordis` (v4.0.1) 微内核之上。
- **34 个官方微前端插件全矩阵集成 (`@deepseek-ai/dsh-client-ui-*`)**：
  - **全局外壳与框架**：`ui-layout`、`ui-sidebar`、`ui-workspace`、`ui-theme`、`ui-locale`、`ui-settings`。
  - **会话流与输入通道**：`ui-conversation`、`ui-trajectory`、`ui-input-trigger`、`ui-commands`、`ui-model-selection`。
  - **高阶工具呈现**：`ui-tool`（Diff、Bash 终端）、`ui-cordis`、`ui-deliverables`、`ui-workflow-run`。
  - **智能体生态**：`ui-agent-preset`、`ui-subagent`、`ui-skill`、`ui-plan`、`ui-goal`、`ui-jobs`、`ui-user-questions`、`ui-permission-presets`。
  - **设置中心**：`ui-settings-general`、`ui-settings-models`、`ui-settings-plugins`、`ui-settings-plugin-inventory`。
- **拓扑排序与动态缓存版本号 (`rev` Cache-Busting)**：
  - 在 `apps/cli/src/index.ts` 自动根据产物 `mtime` 生成短哈希版本号并追加到 Bundle URL 中，杜绝浏览器端静态资源强缓存。
- **完善宿主 ApiProxy 服务网格**：
  - 成功组装并提供 `/api/llm.providers`、`/api/llm.models`、`/api/pluginInventory/list`、`/api/workspace.list`、`/api/session.list` 等全套 RESTful API。
- **纯净定制化 Workspace**：保留 `packages/` 作为开发者编写自定义业务插件的专属工作区，`pnpm install` 提速至 500ms 内。

---

## [0.1.0] - 2026-08-18

### 🌟 初始版本发布 (Initial Release)

- **Cordis 微内核底座**：初始化 `@deepseek-ai/cordis` v4 容器与 `cosmokit` 工具库。
- **双层配置架构体系**：
  - `profiles/*.yml`：宿主基础设施与运行配置（`web.yml`、`headless.yml`）。
  - `presets/*/agent.cordis.yml`：智能体角色人设与能力组合预设（`coder`、`reviewer`、`minimal`）。
- **双运行模式**：Web GUI 模式（端口 3000）与 Headless CLI / REPL 命令行模式。
- **DeepSeek 官方大模型接入**：支持流式生成、Thinking 思考块实时提取与工具链执行。
