# Changelog (更新日志)

所有对 **Pi-DSH** 项目的重要技术变更与修复历史均记录在本文档中。

格式遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，并严格遵循 [语义化版本规范 (SemVer)](https://semver.org/lang/zh-CN/)。

---

## [0.4.0] - 2026-08-19

### 🌐 核心特性：Cordis 插件与能力接缝可视化依赖图 (Interactive Capability Seam Dependency Graph)

- **Koishi 风格交互式插件拓扑依赖图 (`PluginDependencyGraphTab`)**：
  - 在「设置」->「插件」中新增 **「🌐 依赖图」** Tab，基于 Canvas 2D 物理与分层渲染引擎，提供 60fps 丝滑的缩放、平移、节点拖拽与搜索高亮。
  - **支持双布局引擎**：
    - **🌲 分层拓扑流 (Hierarchical DAG)**（默认）：采用四列结构化流水线（`1. 宿主底层驱动 Providers` $\to$ `2. 服务面与通信网关` $\to$ `3. 智能体与工具` $\to$ `4. 浏览器微前端 UI 矩阵`），使用平滑三次贝塞尔曲线连接依赖，彻底消除 70+ 节点的杂乱感。
    - **🪐 物理星系图 (Force Clustered)**：传统力导向天体引力拓扑，支持自由拉扯探索。

- **深度集成 DSH 能力接缝三位一体 (Capability Seam Roles)**：
  - 自动识别并标注每个插件的 Seam 角色：
    - **⚡ 驱动实现 (Provider)**：底层 OS / 沙箱执行能力提供方（`fs-local`, `subprocess-local`, `shell-env`, `llm-deepseek` 等）。
    - **🔨 业务消费 (Consumer)**：面向大模型的工具插件与前端微前端组件（`tool-fs`, `tool-bash`, `client-ui-*` 等）。
    - **📐 服务契约 (Definition)**：纯 TypeScript 接口契约与抽象基类（`dsh-fs`, `dsh-shell`, `dsh-llm` 等）。
    - **🧩 框架编排 (Framework)**：容器、Profile 加载与通信总线。
  - 工具栏提供 **能力接缝视角**（`全部` / `⚡ 驱动实现` / `🔨 业务消费`）与 **功能分类药丸标签** 一键过滤高亮。
  - **右侧检查器抽屉 (Inspector Drawer)**：点击任意节点即时展示其 Seam 角色定位、职责说明、导出的 `ctx.serviceName`、消费的 `inject` 依赖与 YAML 配置快照。

- **浅色与深色双主题原生适配 (Adaptive Dual Theme)**：
  - 挂载 `useIsDarkMode` 监听器，通过 `MutationObserver` 毫秒级动态感知宿主主题切换。
  - 浅色模式下提供清爽马卡龙淡彩卡片与柔和网格，深色模式下提供幽邃夜间配色与极光霓虹光晕。

### 🐛 运行态缺陷修复与 RPC 路由补齐 (Bugfixes & RPC Gateways)

- **官方插件列表数据空白修复 (`PluginInventorySettingsTab`)**：
  - 在 `apps/cli/src/index.ts` 中为 `loader.entries` 绑定生成器迭代器，解决后端 `pluginInventory/list` 返回空数组的问题，使「插件列表」面板完整展示 73 个已加载插件与其运行态光纤阶段（`fiberPhase: 'active'`）。
- **Slash Commands 远程 RPC 路由修复 (`/api/commands/list` 404)**：
  - 在 `profiles/web.yml` 中挂载官方 `@deepseek-ai/dsh-commands` 插件，打通前端 `ui-commands` 的 Slash 命令注册与自动补全。
- **动态插件运行器 RPC 路由补齐 (`dynamicCordisRunner/*` 404)**：
  - 在 `profiles/web.yml` 中挂载 `@deepseek-ai/dsh-cordis-host-runner` 与 `@deepseek-ai/dsh-message-feedback`，解决前端 `dsh-cordis-client-runner` 启动时调用自检接口报 404 的问题。
- **Canvas 被动事件监听警告消除 (`passive event listener`)**：
  - 将画布滚轮缩放监听改为原生 `{ passive: false }` 事件绑定，消除控制台 `Unable to preventDefault inside passive event listener` 警告。

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
