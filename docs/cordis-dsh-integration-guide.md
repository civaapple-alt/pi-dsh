# Cordis 微内核与 DeepSeek Harness (DSH) 官方插件生态全链路集成与架构实践总结

---

## 📖 目录

- [一、 背景与工程定位](#一-背景与工程定位)
- [二、 为什么集成难度远超预期？五大核心复杂度解剖](#二-为什么集成难度远超预期五大核心复杂度解剖)
  - [1. 运行时 IoC 依赖注入带来的「隐式拓扑雪崩」](#1-运行时-ioc-依赖注入带来的隐式拓扑雪崩)
  - [2. 双端双微内核同构（Host + Browser）与微前端总线](#2-双端双微内核同构host--browser与微前端总线)
  - [3. Capability Seam（能力缝）三位一体分层模型](#3-capability-seam能力缝三位一体分层模型)
  - [4. 动态会话作用域隔离（Preset Scopes & Include 引擎）](#4-动态会话作用域隔离preset-scopes--include-引擎)
  - [5. 官方设计哲学：「极限解耦」优于「开箱即用」](#5-官方设计哲学极限解耦优于开箱即用)
- [三、 关键攻坚战与实战解决方案 (Battle-Tested Solutions)](#三-关键攻坚战与实战解决方案-battle-tested-solutions)
  - [突破点 1：微前端 Bundle 404 静态路由分发](#突破点-1微前端-bundle-404-静态路由分发)
  - [突破点 2：App Shell 挂起与启动清单原子覆盖](#突破点-2app-shell-挂起与启动清单原子覆盖)
  - [突破点 3：输入框锁定（inert: true）与会话预设装配](#突破点-3输入框锁定inert-true与会话预设装配)
  - [突破点 4：Typert 远程类型 RPC 网关链路打通](#突破点-4typert-远程类型-rpc-网关链路打通)
  - [突破点 5：单占用插槽冲突（Slot Collision）治理](#突破点-5单占用插槽冲突slot-collision治理)
- [四、 工业级沉淀：Pi-DSH 架构资产与最佳实践](#四-工业级沉淀pi-dsh-架构资产与最佳实践)

---

## 一、 背景与工程定位

在 **Pi-DSH** 的演进过程中，项目从最初“自建简易 Mock 插件”跨越到了 **“100% 官方 DeepSeek Harness (DSH) 插件生态 + 全量官方微前端矩阵”**（装载 50+ 个后端插件与 36 个浏览器端微前端插件）。

在这个过程中，我们深刻体会到：**使用 Cordis + DSH 官方插件体系，并不是在调用普通第三方库的 API，而是在手工装配一套横跨 Node.js 宿主与浏览器沙箱的「分布式微内核操作系统 + 微前端总线系统」。**

---

## 二、 为什么集成难度远超预期？五大核心复杂度解剖

### 1. 运行时 IoC 依赖注入带来的「隐式拓扑雪崩」

- **常规框架（编译期显式依赖）**：通过 `import { x } from '...'` 引入，缺失依赖在编译阶段直接拦截，调试链路为一维。
- **Cordis 架构（运行时隐式注入）**：组件通过 `static inject = ['slots', 'sessions', 'layout', 'remote', 'typert']` 声明需求。
- **隐式挂起与级联雪崩**：如果插件池中缺少任何一个底层 Service Provider（例如漏配了 `dsh-typert-registry` 或 `dsh-shell-env`），Cordis 不会抛出 Fatal 异常，而是让下游插件**静默进入 `pending` 挂起状态**。单一底层节点的缺失会级联导致 30+ 个微前端插件整体卡死。

### 2. 双端双微内核同构（Host + Browser）与微前端总线

DSH 采用独特的双端双内核架构：

```text
┌─────────────────────────────────────────────────────────────┐
│ 宿主端 (Node.js Cordis Kernel)                              │
│ ├── 宿主基础设施: fs-local, subprocess-local, shell-env...   │
│ └── 传输网关: host-webserver, apiproxy, client-modules       │
└──────────────────────────┬──────────────────────────────────┘
                           │ WebSocket / HTTP Mux / Typert RPC
┌──────────────────────────┴──────────────────────────────────┐
│ 浏览器端 (Browser Cordis Kernel: __DSH_BOOT__)              │
│ ├── 核心运行时: client-runtime (slots, sessions)            │
│ ├── 微前端矩阵: 36+ client.js 动态按需下载装配              │
│ └── 声明式插槽: Single / Multi Slot 状态机渲染              │
└─────────────────────────────────────────────────────────────┘
```

- **引导清单时序**：前端内核启动强依赖宿主注入的 `window.__DSH_BOOT__`。清单中模块的声明顺序必须与浏览器端依赖拓扑严格一致。
- **插槽排他性约束**：微前端插槽（如 `directoryFlow`）属于 `kind: 'single'` 单占插槽，在优先级 0 下出现多个注册者会直接触发崩溃。

### 3. Capability Seam（能力缝）三位一体分层模型

官方 DSH 严格推行 **Capability Seam** 架构模式，任何系统能力均被解耦为 3 个正交角色：

```text
[Service Definition] 接口与契约定义 (如 @deepseek-ai/dsh-fs)
         ▲
         │ 实现 (implements)
[Service Provider]   底层驱动提供者 (如 @deepseek-ai/dsh-fs-local)
         ▲
         │ 消费 (injects)
[Consumer]           模型/业务工具插件 (如 @deepseek-ai/dsh-tool-fs, tool-str-replace-editor)
```

- **不能少配**：缺少 Provider，工具无法消费底层能力。
- **不能重复配置**：同名 Provider 重复加载会触发 Cordis 服务重名冲突报错。

### 4. 动态会话作用域隔离（Preset Scopes & Include 引擎）

智能体人设与工具集不是全局单例，而是**会话级（Session-level）动态隔离**：
- 每次用户在 UI 上新建会话，`dsh-agent-presets` 都会读取 `agent.cordis.yml`，使用 Cordis `Include` 引擎通过 `ctx.isolate()` 派生出专属的子上下文。
- `Include` 引擎深度依赖原生 `Loader` 的 `this.loader.ctx.extend` 与 `this.loader.getTasks()` 等高级反射方法，浅层 Mock 无法满足其运行时断言。

### 5. 官方设计哲学：「极限解耦」优于「开箱即用」

| 维度 | 常规 Agent 框架 (如 LangChain) | Cordis + DSH 官方插件架构 |
|---|---|---|
| **耦合度** | 高内聚，几行代码实例化 Agent | 极度解耦，连输入框、模型切换器都是独立插件 |
| **可替换性** | 差（换底层沙箱需深度修改源码） | 极致（换沙箱只需在 yml 中替换 Provider） |
| **调试难度** | 堆栈浅，错误直接定位 | 依赖运行时事件与拓扑网格，需理解完整状态机 |

---

## 三、 关键攻坚战与实战解决方案 (Battle-Tested Solutions)

### 突破点 1：微前端 Bundle 404 静态路由分发

- **问题**：浏览器加载 `/plugins/@deepseek-ai/<pkgName>/client.js` 时返回 404。
- **原因**：官方 `dsh-client-modules` 的 `serveBundle` 依赖内部 `this.table`，CLI 启动未注册本地 Monorepo 物理产物路径。
- **解决方案**：在 [`apps/cli/src/index.ts`](../apps/cli/src/index.ts) 中自动深度扫描全部声明 `dsh.client.platform: "web"` 的 39 个 Web 插件，将其真实物理绝对路径与基于 `mtime` 的短哈希 `rev` 注册至 `clientModules.table`。

### 突破点 2：App Shell 挂起与启动清单原子覆盖

- **问题**：`app-shell: pending (waiting for services: slots, sessions, layout)`。
- **原因**：`dsh-client-modules` 初始化时在 `index.html` 注入了空占位清单，CLI 原 `tapIndex` 检测到占位符后跳过了覆盖，导致浏览器缺少 36 个微前端模块清单。
- **解决方案**：重写 `tapIndex` 正则匹配替换逻辑，将经过拓扑排序的 36 个微前端 Bundle 清单强制覆盖写入 `<head>` 顶部，确保浏览器端按正确时序激活所有核心 UI 服务。

### 突破点 3：输入框锁定（inert: true）与会话预设装配

- **问题**：添加工作区后，底部 Composer 依然显示“选择工作区以开始”且无法打字。
- **原因**：
  1. `session.create` 请求由于找不到 `standard` 预设而失败（报错 `agent-preset-not-found`）；
  2. 预设挂载时 `Include` 类找不到 `this.loader.ctx.extend`；
  3. 预设内的 `tool-bash`、`tool-fs-search` 缺少宿主底层 `subprocess-local`、`shell-env`、`shell` 支持。
- **解决方案**：
  1. 接入 `vendor/loader` 的原生 `Loader` 实例，劫持 `internal.import`；
  2. 新增 [`presets/standard/`](../presets/standard/) 标准预设目录，并在 `web.yml` 中配置 `roots: presets`；
  3. 在 `web.yml` 中补齐底层 `fs-local`、`subprocess-local`、`shell-env`、`shell` 驱动 Seam。

### 突破点 4：Typert 远程类型 RPC 网关链路打通

- **问题**：`dsh-api-gateway: pending (waiting for service: typert)`。
- **原因**：微前端运行时与上层插件（如 `dsh-client-ui-skill`）需要浏览器端 Typert 注册表与 API 网关。
- **解决方案**：在 `profiles/web.yml` 中挂载 `@deepseek-ai/dsh-typert-registry` 与 `@deepseek-ai/dsh-api-gateway`，并在 `bundle/web-app` 声明依赖。

### 突破点 5：单占用插槽冲突（Slot Collision）治理

- **问题**：`single slot "conversation.hero.workspace.directoryFlow" already has a registration at priority 0`。
- **原因**：同时加载了 `ui-directory-picker-native` 与 `ui-directory-picker-browse` 抢占同一单占插槽。
- **解决方案**：统一采用内置式 `@deepseek-ai/dsh-client-ui-directory-picker-browse`（前端）与 `@deepseek-ai/dsh-host-directory-picker-browse`（后端），实现纯 Web 跨平台目录浏览与创建。

---

## 四、 工业级沉淀：Pi-DSH 架构资产与最佳实践

经过全链路攻坚，Pi-DSH 沉淀出了一套清晰、稳定、可复用的工程化最佳实践：

1. **两级配置分离原则**：
   - **`profiles/*.yml`**：专注于宿主世界（WebServer、RPC、存储、底层 Seams、浏览器端微前端清单）。
   - **`presets/*/agent.cordis.yml`**：专注于会话世界（模型提示词段落、模型工具消费者）。
2. **微前端按需扩展**：
   - 开发者如需编写新的前端卡片或小部件，只需在 `packages/` 下创建带有 `dsh.client` 的插件，`apps/cli` 会自动扫描并将其动态挂载到对应的 UI 插槽中。
3. **极速构建与轻量化启动**：
   - 彻底移除冗余的本地存根插件，`pnpm install` 耗时压缩至 500ms 内，单命令 `pnpm start` 即可秒级拉起完整的官方 Web GUI。
4. **Monorepo 插件动态直连与跨仓库构建协同**：
   - **动态发现**：`apps/cli` 启动时自动扫描 `../deepseek-harness/packages` 建立物理包映射表（`dshPackageMap`），并拦截 `loader.internal.import`，无需向 npm 发布或全局安装即可热加载。
   - **构建触发时机**：
     - 修改 **浏览器微前端插件**（`packages/client/ui-*`）：**必须构建**（`pnpm --filter <pkg> exec tsdown`）生成 `lib/client.js` 给前端路由分发；
     - 修改 **宿主后端插件**（`packages/core/*` 等）：若包内存在历史 `lib/` 产物，必须重新 `pnpm run build`，若无 `lib/` 产物则 `tsx` 直接热执行 `src/index.ts`。
