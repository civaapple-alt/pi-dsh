# 架构决策笔记：微前端静态路由分发、Cordis 原生 Loader 实例与会话预设动态装配

**日期**：2026-08-18  
**状态**：已实现 (Implemented)  
**作者**：Pi-DSH Architecture Team  

---

## 1. 背景与问题描述

在 Pi-DSH 集成官方 100% DeepSeek Harness (DSH) 插件矩阵与浏览器端 Cordis 微前端套件的过程中，遇到了三个核心链路断裂问题：

1. **微前端 Bundle 404 资源未找到**：
   - 浏览器端加载 `/plugins/@deepseek-ai/<pkgName>/client.js` 时大量返回 404。
   - 官方 `@deepseek-ai/dsh-client-modules` 的 `serveBundle` 路由依赖内部 `this.table`，在 CLI 自定义加载流中未能自动索引到物理构建产物。

2. **App Shell 等待基础服务挂起 (`waiting for services: slots, sessions, layout`)**：
   - 宿主端 `dsh-client-modules` 在启动之初注入了空的 `window.__DSH_BOOT__` 占位符；CLI 的 `tapIndex` 检测到占位符未执行覆盖，导致前端缺失 36 个微前端模块的完整拓扑图，阻断了 `dsh-client-app-shell` 依赖激活。

3. **创建工作区后底部输入框处于禁用锁定状态 (`inert: true`)**：
   - 会话创建请求 `POST /api/session.create` 报错 `agent-preset-not-found: preset "standard" not found`。
   - `dsh-agent-presets` 内部依赖原生 `Include` 类与 `this.loader.ctx.extend`、`this.loader.getTasks()` 等 Loader 核心方法；此前简易 mock 的 loader 对象无法满足。
   - 预设工具依赖底层宿主提供的 `fs`、`subprocess`、`shell-env`、`shell` 核心能力 Seam 未就绪，导致 Session 组装失败回退。

---

## 2. 核心架构设计与决策

### 决策一：自动构建 `clientModules.table` 物理微前端产物路由表

为了让 `dsh-client-modules` 的 `serveBundle` 能够无感知服务所有微前端 Bundle，我们在 `apps/cli/src/index.ts` 中引入全量客户端包深度扫描机制：
- 扫描包含 `dsh.client.platform: "web"` 声明的 39 个 Web 插件包。
- 提取各包的 `lib/client.js` 物理绝对路径，并以文件修改时间（`mtime`）生成短哈希版本号 `rev`。
- 将元数据直接注入至 `clientModules.table`，使官方 `/plugins` 路由服务 100% 正常响应 `200 OK`，并携带标准的 `Content-Type: text/javascript; charset=utf-8`。

### 决策二：重构 `tapIndex` 正则匹配实现微前端启动清单的原子覆盖

- 在 `apps/cli/src/index.ts` 中改进 `tapIndex`：无论 `client-modules` 是否已提前插入了初始占位符，均使用正则 `/ <script>window\.__DSH_BOOT__ = .*?<\/script> /` 将经过完整拓扑排序的 36 个微前端模块清单替换写入 `<head>` 顶部。
- 浏览器在渲染首屏前即可获取完整的微前端依赖拓扑，`app-shell` 能够按序等待 `slots`、`sessions`、`layout` 全部就绪后平滑挂载全局 UI。

### 决策三：引入 Cordis 原生 `Loader` 实例并打通宿主能力 Seam

- **原生 Loader 接入**：直接引入官方 `vendor/loader` 中的 `Loader` 类，为全局根上下文注册真正的 `ctx.loader`，并劫持 `loader.internal.import` 映射 Monorepo 模块路径。
- **预设生态完备化**：创建 [`presets/standard/`](../../../../presets/standard/) 标准全功能编码预设（文件读写、正则替换、Bash 终端、Ripgrep 搜索、Todo 任务），并在 `dsh-agent-presets` 配置中注册 `roots: presets`。
- **宿主 Seam 服务补齐**：在 `profiles/web.yml` 中补齐 `@deepseek-ai/dsh-fs-local`、`@deepseek-ai/dsh-subprocess-local`、`@deepseek-ai/dsh-shell-env`、`@deepseek-ai/dsh-shell`，满足 Agent 预设运行所需的所有底层驱动。

---

## 3. 验证与状态机转换

通过端到端 API 与浏览器验证：
1. `GET /plugins/@deepseek-ai/dsh-client-connection/client.js` 等 36 个资源均返回 `200 OK`。
2. `POST /api/workspace.create` $\to$ `POST /api/session.create` 成功生成活跃会话 `sessionId`。
3. `POST /api/session.models` 返回 `routable: true`，输入机状态由 `inert: true` 转为激活可编辑状态，输入框打字交互完全畅通。
