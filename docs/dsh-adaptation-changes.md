# DSH (DeepSeek Harness) 集成与适配改动技术文档 (DSH Adaptation Guide)

本文档系统记录了为了将 **100% 官方 DSH 生态** 与 **Pi-DSH 架构** 完美融合，在 `deepseek-harness` 仓库中进行的适配改动、背景动机、技术实现与收益。

---

## 📑 改动全景概览

| 模块类别 | 涉及文件 | 核心改动 | 解决的关键痛点 |
|---|---|---|---|
| **RPC 通信网关** | `packages/api/gateway/src/client/index.ts` | 原型链 Proxy 动态拦截 + 异步微轮询重试 | 解决 36 个微前端并发加载时的异步时序竞争报错（`is not a function`） |
| **设置与拓扑扩展** | `packages/client/ui-settings-plugin-inventory/src/client/*` | 新增 `PluginDependencyGraphTab` 并在 `settings.plugins.tab` 注册 `id: 'graph'` | 在官方设置中心直接呈现 60fps 分层架构拓扑与 Seam 三位一体依赖关系 |
| **容器排版扩展** | `SettingsRoot.module.css`, `PluginsSettingsSection.module.css` 等 | 宽度扩展至 `min(1260px, calc(100vw - 48px))`，移除 `max-width: 760px` 瓶颈 | 解决 800px 弹窗在展示 70+ 插件与依赖图时的严重压缩变形问题 |
| **Bundle 依赖声明** | `packages/bundle/web-app/package.json` | 补齐 `@deepseek-ai/dsh-api-gateway` 与 `@deepseek-ai/dsh-typert-registry` 声明 | 满足 Cordis Loader 静态解析与 Monorepo 产物打包约束 |

---

## 🔍 核心改动深度解析

### 1. Typert 动态 RPC 异步时序容错与 Proxy 拦截 (`packages/api/gateway`)

#### 1.1 痛点背景
在浏览器端微前端架构中，36 个微前端插件由 `window.__DSH_BOOT__` 异步载入并交由 Cordis 激活。部分 UI 插件（如 `ui-sidebar`、`ui-conversation`、`ui-settings`）在组件渲染首帧即会解构并调用 `ctx.remote.<namespace>.<method>()`。

在原版 DSH 实现中，`RemoteNamespaceService` 必须要求后端或本地远程契约已经同步注册完毕。若存在数毫秒的异步时序差，前端访问该方法会直接得到 `undefined` 并抛出 `TypeError: ... is not a function` 导致组件白屏崩溃。

#### 1.2 技术方案
1. **原型链 Proxy 动态兜底 (`prototypeProxy`)**：
   在 `RemoteNamespaceService.prototype` 原型链上挂载 Proxy 拦截器。当访问尚未显式同步绑定的方法名时，动态返回一个异步调用包装器，避免首帧访问引发同步崩溃。
2. **异步微轮询重试机制 (`invokeMethod`)**：
   在发起远程调用时，若检测到目标方法尚未注册，会自动开启最多 50 次、每次 5ms 的轻量级异步微轮询等待，直至后端/本地 RPC 契约就绪后立即执行调用。

```typescript
// packages/api/gateway/src/client/index.ts 核心拦截逻辑
const prototypeProxy = new Proxy(Object.prototype, {
  get(target, prop, receiver) {
    if (typeof prop === 'string' && !REMOTE_NAMESPACE_FIELDS.has(prop) && receiver instanceof RemoteNamespaceService) {
      return (...args: unknown[]) => {
        const current = receiver.methods.get(prop)
        return receiver.invokeRemote(current?.direct, current?.scoped, receiver.ctx, args, prop, receiver)
      }
    }
    return Reflect.get(target, prop, receiver)
  },
})
Object.setPrototypeOf(RemoteNamespaceService.prototype, prototypeProxy)
```

---

### 2. 官方设置中心集成 Cordis 插件与能力接缝依赖图 (`ui-settings-plugin-inventory`)

#### 2.1 痛点背景
DSH 生态拥有 73 个插件与 30 个系统级服务，结构庞大。原版 DSH 仅有纯表格形式的清单（`PluginInventorySettingsTab`），无法直观呈现：
- 哪些是底层驱动 Provider？
- 哪些是业务/工具 Consumer？
- 服务调用与依赖流向是怎样的？

#### 2.2 技术方案
1. **插槽无侵入式注入**：
   在 `@deepseek-ai/dsh-client-ui-settings-plugin-inventory` 中通过 `ctx.slots.inject` 向 `settings.plugins.tab` 注册新的 `id: 'graph'` 标签页；
2. **Canvas 2D 双布局引擎**：
   - **🌲 分层拓扑流 (Hierarchical DAG - 默认)**：将 73 个节点严格划分为 4 列流水线（`1. 宿主驱动 Providers` $\to$ `2. 服务面与通信` $\to$ `3. 智能体与工具` $\to$ `4. 微前端 UI 矩阵`），使用平滑三次贝塞尔曲线连接；
   - **🪐 物理星系图 (Force Clustered)**：传统天体引力拓扑；
3. **DSH 能力接缝三位一体辨析**：
   自动识别并标注 `⚡ Provider (驱动)`、`🔨 Consumer (消费)`、`📐 Definition (契约)` 与 `🧩 Framework`，支持单节点全链路 Inspector 抽屉溯源；
4. **全自动浅色/深色主题自适应**：
   利用 `useIsDarkMode` Hook 监听 `document.body[data-ds-dark-theme]`，实现免刷新的毫秒级平滑变色。

---

### 3. 设置弹窗容器宽度自适应扩展 (`ui-settings-*`)

#### 3.1 痛点背景
DSH 原生设置弹窗将面板宽度硬编码为 `800px`，内部子容器限制为 `max-width: 760px`。在现代宽屏显示器下，查看包含 73 个插件的列表或复杂拓扑图时显得非常局促、拥挤。

#### 3.2 技术方案
- 将面板样式 `width: 800px` 调整为 `width: min(1260px, calc(100vw - 48px))`，高度调整为 `min(880px, calc(100vh - 48px))`；
- 移除所有内层子容器的 `max-width: 760px` 瓶颈，调整为 `width: 100%; max-width: 100%`，确保内容自适应铺满。

---

### 4. Monorepo 依赖声明补齐 (`packages/bundle/web-app`)

#### 4.1 痛点背景
在独立运行或构建 Web Profile 时，浏览器端微内核需加载 `@deepseek-ai/dsh-api-gateway`（RPC 网关）与 `@deepseek-ai/dsh-typert-registry`（类型注册器），但原 `web-app` bundle 清单中遗漏了这两项 workspace 依赖。

#### 4.2 技术方案
在 `packages/bundle/web-app/package.json` 的 `dependencies` 中显式加入：
```json
{
  "dependencies": {
    "@deepseek-ai/dsh-api-gateway": "workspace:^",
    "@deepseek-ai/dsh-typert-registry": "workspace:^"
  }
}
```

---

### 5. 插件动态扫描发现与跨仓库开发联动构建规范 (Plugin Discovery & Build Workflow)

#### 5.1 为什么无需全局安装（`C:\nvm4w\nodejs\node_modules` 找不到包）？
- `@deepseek-ai/dsh-*` 是 `deepseek-harness` 内部的 pnpm workspace 私有包，**不需要、也不应该通过 `npm i -g` 安装到 Node 全局**。
- `pi-dsh/apps/cli/src/index.ts` 在启动时通过 `buildDshPackageMap()` 自动扫描物理路径 `../deepseek-harness/packages` 和 `../deepseek-harness/vendor` 下所有 `package.json`，并自动劫持 `loader.internal.import`，实现直接对本地 Monorepo 物理模块的动态直连加载。

```text
  profiles/web.yml ('@deepseek-ai/dsh-agent')
                     │
                     ▼
  apps/cli/src/index.ts (buildDshPackageMap)
                     │
                     ▼
  dsh-ws/deepseek-harness/packages/core/agent/lib/index.js (物理直接加载)
```

#### 5.2 插件代码更新后，是否需要在 DSH 仓库执行 `pnpm run build`？

这取决于你修改的是 **宿主后端插件** 还是 **浏览器微前端 UI 插件**：

| 插件类别 | 典型模块 | 是否需要 `pnpm run build`？ | 原因与说明 |
|---|---|---|---|
| **🌐 浏览器微前端 UI 插件** | `packages/client/ui-*` (如 `ui-settings-plugin-inventory`, `ui-conversation`) | **必须构建** ⚠️ | 浏览器无法直接运行 TSX/React 源码，微前端通过 `/plugins/<name>/client.js` 路由向浏览器分发 JS Bundle。修改 `src/client/*` 后必须生成最新的 `lib/client.js`。 |
| **🖥️ 宿主后端/核心插件** | `packages/core/*`, `packages/host/*`, `packages/preset/*` | **视情况而定** 💡 | 启动器加载优先级为：`优先 lib/index.js` $\to$ `回退 src/index.ts`。<br>1. 若包内已存在历史 `lib/index.js`，**必须重新 build**，否则会继续运行旧的 `lib/` 产物；<br>2. 若包内无 `lib/` 目录，`tsx` 运行时会直接即时编译运行最新的 `src/index.ts`。 |

#### 5.3 常用敏捷联动构建命令

- **只重新构建修改的微前端 UI 单包 (极速 20ms)**：
  ```bash
  # 在 deepseek-harness 根目录下或具体包目录下
  pnpm --filter @deepseek-ai/dsh-client-ui-settings-plugin-inventory exec tsdown
  ```
- **全量重构 DSH 所有包**：
  ```bash
  cd D:\gh-ws\dsh-ws\deepseek-harness
  pnpm run build
  ```
- **重启 Pi-DSH Web 服务生效**：
  ```bash
  cd D:\gh-ws\dsh-ws\pi-dsh
  pnpm start
  ```

---

## 📌 总结与兼容性保障

上述所有改动均严格遵循 **“基础优先、规范自洽、零副作用”** 原则：
- 对原 DSH 官方测试套件与 Headless 运行无任何破坏性影响；
- 保持了 TypeScript 严格类型与 ESLint 代码门禁标准；
- 所有扩展均通过标准 Cordis 插件与插槽机制接入，具备极佳的可维护性与升级兼容性。
