# 架构决策记录：100% 官方 DSH 插件生态与微前端插槽矩阵接入

- **状态**：已实现 (Implemented)
- **日期**：2026-08-18
- **作者**：DeepSeek Harness / Pi-DSH 架构组
- **领域**：微内核架构、Web 微前端、Cordis 容器、Typert RPC 网关、插槽矩阵

---

## 一、 背景与诉求

在项目初期，Pi-DSH 采用了一套简化的本地过渡插件包进行原型验证。然而，为了释放 DeepSeek Harness (DSH) 完整的工业级能力——包括官方 34+ 前端 UI 微前端插槽矩阵、Typert Remote 远程类型网关、持久化工作区选择、多会话隔离及设置中心——架构全面升级为 **100% 直连官方 `@deepseek-ai/dsh-*` 插件体系**。

---

## 二、 核心架构决策与实现细节

### 1. 100% 接入官方 DSH 插件全家桶
- 废弃所有本地简化实现，全面挂载 DSH Monorepo 中的 50+ 个官方插件。
- 完整装配基础服务网格：`dsh-system-prompt`、`dsh-storage-domain`、`dsh-host-apiproxy`、`dsh-session-stats` 以及 `dsh-host-plugin-inventory`。

### 2. 官方浏览器端 Cordis 微前端插槽矩阵（34 个 UI 插件）
- 前端界面基于 Cordis 插槽系统组织：
  1. **底座服务**：`dsh-client-ui-settings`（提供 `ctx.settingsScope`）；
  2. **上下文与主题**：`dsh-client-locale`（提供语言包与 `locale` 服务）、`dsh-client-ui-theme`（提供多主题引擎与 `theme` 服务）；
  3. **全局布局外壳**：`dsh-client-ui-layout`（提供 `layout` 并向 `root` 插槽注入 AppFrame）、`dsh-client-ui-sidebar`、`dsh-client-ui-workspace`；
  4. **目录选择器能力切面（Directory Picker Seam）**：挂载 `@deepseek-ai/dsh-client-ui-directory-picker-browse`（前端）与 `@deepseek-ai/dsh-host-directory-picker-browse`（后端），填充 `directoryFlow` 单占用插槽，实现纯浏览器端跨平台工作区目录浏览与新建；
  5. **会话流与高阶工具视图**：Diff 对比、终端仿真、产物预览、计划模式、目标管理与设置中心分项。

### 3. 按拓扑序编译的 `window.__DSH_BOOT__` 模块清单
- 在 `apps/cli/src/index.ts` 中修正 `ctx.baseUrl` 锚点至 Monorepo 配置树，确保 `createRequire` 正确解析各插件包及其 `lib/client.js`；
- 通过 `clientModules.flush()` 确保所有 34 个前端微前端插件按严格依赖拓扑注入至 HTML 的 `window.__DSH_BOOT__.entries` 中；
- 引入基于文件 `mtimeMs` 的动态短哈希 `rev`，彻底解决浏览器端静态资源缓存失效问题。

### 4. 单占用插槽（Single Slot）优先级冲突纪律
- 遵循 Cordis 插槽设计规范：声明为 `kind: 'single'` 的插槽（如 `directoryFlow`）在优先级 0 下只允许一个占用者；针对 Web 场景，选定 `-browse` 现代化应用内文件浏览器作为标准实现。

### 5. 清爽的代码库边界
- 彻底清理了 9 个已被官方取代的本地临时包，将 `pi-dsh/packages/` 明确保留为用户自研定制插件（Custom Plugins Workspace）的扩展区。

---

## 三、 验证结果

- **控制台日志**：浏览器启动 0 报错，`app-shell` 与全套 34 个微前端插件在 100ms 内瞬间完成初始化与视图装配；
- **RPC 网关通信**：`/api/llm.providers`、`/api/llm.models`、`/api/pluginInventory/list`、`/api/commands` 均正常返回 200 OK；
- **交互体验**：点击「选择工作区」流畅唤出应用内多级目录浏览器与新建文件夹对话框，支持完整的智能体交互。
