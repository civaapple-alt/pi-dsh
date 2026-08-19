# DSH (DeepSeek Harness) 集成与适配改动技术文档 (DSH Adaptation Guide)

本文档系统记录了为了将 **100% 官方 DSH 生态** 与 **Pi-DSH 架构** 完美融合，在 `deepseek-harness` 仓库中进行的适配改动、背景动机、技术实现与收益。

> ⚠️ **重要提示**：如果用户直接从官方 upstream（`https://github.com/deepseek-ai/deepseek-harness`）克隆源码，由于官方原版存在 **微前端并发加载时的首帧 RPC 时序竞争崩溃** 以及 **Bundle 依赖遗漏** 问题，配合 Pi-DSH 启动时会导致组件报错或无法构建。
> 
> 请按照本文档 **[第三章：官方仓库克隆用户必备代码调整 (Exact Patch & Diff)](#三-针对官方仓库-clone-用户的代码调整清单-exact-patch--diff)** 进行精准的代码修改。

---

## 📖 目录

- [一、 改动全景概览](#一-改动全景概览)
- [二、 核心改动深度解析与原理](#二-核心改动深度解析与原理)
- [三、 针对官方仓库 clone 用户的代码调整清单 (Exact Patch & Diff)](#三-针对官方仓库-clone-用户的代码调整清单-exact-patch--diff)
  - [1. 【必选修复】Typert RPC 时序竞态容错 (`packages/api/gateway`)](#1-必选修复typert-rpc-时序竞态容错-packagesapigateway)
  - [2. 【必选补齐】Web App Bundle 依赖声明 (`packages/bundle/web-app`)](#2-必选补齐web-app-bundle-依赖声明-packagesbundleweb-app)
  - [3. 【界面优化】设置弹窗大屏 1260px 宽度扩展 (`ui-settings-*`)](#3-界面优化设置弹窗大屏-1260px-宽度扩展-ui-settings-)
  - [4. 【功能增强】可视化能力接缝与拓扑依赖图 (可选)](#4-功能增强可视化能力接缝与拓扑依赖图-可选)
- [四、 插件扫描发现机制与跨仓库构建协同](#四-插件扫描发现机制与跨仓库构建协同)

---

## 一、 改动全景概览

| 模块类别 | 涉及文件 | 调整等级 | 解决的关键痛点 |
|---|---|---|---|
| **RPC 通信网关** | `packages/api/gateway/src/client/index.ts` | 🔴 **必选修复** | 解决 36 个微前端并发加载时的异步时序竞争报错（`TypeError: ... is not a function`） |
| **Bundle 依赖声明** | `packages/bundle/web-app/package.json` | 🔴 **必选补齐** | 满足 Cordis Loader 静态解析与 Monorepo 产物打包约束 |
| **容器排版扩展** | `SettingsRoot.module.css`, `PluginsSettingsSection.module.css` 等 | 🟡 **推荐优化** | 解决 800px 弹窗在展示 70+ 插件与依赖图时的严重压缩变形问题 |
| **设置与拓扑扩展** | `packages/client/ui-settings-plugin-inventory/src/client/*` | 🟢 **功能增强** | 在官方设置中心直接呈现 60fps 分层架构拓扑与 Seam 三位一体依赖关系 |

---

## 二、 核心改动深度解析与原理

### 1. Typert 动态 RPC 异步时序容错机制
在浏览器端微前端架构中，36 个微前端插件由 `window.__DSH_BOOT__` 异步载入并交由 Cordis 激活。部分 UI 插件（如 `ui-sidebar`、`ui-conversation`、`ui-settings`）在组件渲染首帧即会解构并调用 `ctx.remote.<namespace>.<method>()`。

在原版 DSH 实现中，`RemoteNamespaceService` 必须要求后端或本地远程契约已经同步注册完毕。若存在数毫秒的异步时序差，前端访问该方法会直接得到 `undefined` 并抛出 `TypeError: ... is not a function` 导致组件白屏崩溃。

**解决方案**：挂载 `prototypeProxy` 原型链拦截，并提供最多 50 次、每次 5ms 的轻量级异步微轮询等待，直至后端/本地 RPC 契约就绪后立即执行调用。

---

## 三、 针对官方仓库 clone 用户的代码调整清单 (Exact Patch & Diff)

如果你本地使用的是官方原版 `deepseek-harness` 仓库，请依次修改以下文件：

### 1. 【必选修复】Typert RPC 时序竞态容错 (`packages/api/gateway`)

📄 **修改文件**：`packages/api/gateway/src/client/index.ts`

```diff
--- a/packages/api/gateway/src/client/index.ts
+++ b/packages/api/gateway/src/client/index.ts
@@ -301,7 +301,8 @@ class ClientRemoteService extends Service implements TypertClientRemote {
         service = new RemoteNamespaceService(
           ctx,
           name,
-          (direct, scoped, caller, args) => this.invokeMethod(direct, scoped, caller, args),
+          (direct, scoped, caller, args, methodName, namespaceService) =>
+            this.invokeMethod(direct, scoped, caller, args, methodName, namespaceService),
         )
       },
     })
@@ -324,12 +325,24 @@ class ClientRemoteService extends Service implements TypertClientRemote {
     await namespace.dispose()
   }
 
-  private invokeMethod(
+  private async invokeMethod(
     direct: DirectMethod | undefined,
     scoped: ScopedMethod | undefined,
     callerCtx: Context,
     values: readonly unknown[],
+    methodName?: string,
+    namespaceService?: RemoteNamespaceService,
   ): Promise<RemoteResult<unknown>> {
+    if (direct === undefined && scoped === undefined && methodName && namespaceService) {
+      for (let i = 0; i < 50 && direct === undefined && scoped === undefined; i++) {
+        const current = namespaceService.methods.get(methodName)
+        direct = current?.direct
+        scoped = current?.scoped
+        if (direct === undefined && scoped === undefined) {
+          await new Promise(r => setTimeout(r, 5))
+        }
+      }
+    }
     if (scoped !== undefined) {
       const binder = this.ownerCtx.typert.contexts.getClient(scoped.projection.context)
       const identity = binder?.identity(callerCtx)
@@ -420,11 +433,14 @@ type InvokeRemote = (
   scoped: ScopedMethod | undefined,
   callerCtx: Context,
   args: readonly unknown[],
+  methodName?: string,
+  namespaceService?: RemoteNamespaceService,
 ) => Promise<RemoteResult<unknown>>
 
 class RemoteNamespaceService extends Service {
-  private readonly methods = new Map<string, RemoteMethodRecord>()
-  private readonly namespace: string
+  readonly methods = new Map<string, RemoteMethodRecord>()
+  readonly namespace: string
+  readonly invokeRemote: InvokeRemote
 
   static assertMethodAvailable(namespace: string, method: string): void {
     if (REMOTE_NAMESPACE_FIELDS.has(method) || method in RemoteNamespaceService.prototype) {
@@ -435,10 +451,11 @@ class RemoteNamespaceService extends Service {
   constructor(
     ctx: Context,
     name: string,
-    private readonly invokeRemote: InvokeRemote,
+    invokeRemote: InvokeRemote,
   ) {
     super(ctx, remoteServiceKey(name))
     this.namespace = name
+    this.invokeRemote = invokeRemote
   }
 
   assertMethodAvailable(method: string): void {
@@ -481,7 +498,7 @@ class RemoteNamespaceService extends Service {
           const direct = current?.direct
           const scoped = current?.scoped
           return (...args: unknown[]) => {
-            return this.invokeRemote(direct, scoped, callerCtx, args)
+            return this.invokeRemote(direct, scoped, callerCtx, args, method, this)
           }
         },
       })
@@ -504,6 +521,19 @@ class RemoteNamespaceService extends Service {
   }
 }
 
+const prototypeProxy = new Proxy(Object.prototype, {
+  get(target, prop, receiver) {
+    if (typeof prop === 'string' && !REMOTE_NAMESPACE_FIELDS.has(prop) && receiver instanceof RemoteNamespaceService) {
+      return (...args: unknown[]) => {
+        const current = receiver.methods.get(prop)
+        return receiver.invokeRemote(current?.direct, current?.scoped, receiver.ctx, args, prop, receiver)
+      }
+    }
+    return Reflect.get(target, prop, receiver)
+  },
+})
+Object.setPrototypeOf(RemoteNamespaceService.prototype, prototypeProxy)
+
 const REMOTE_NAMESPACE_FIELDS = new Set(['ctx', 'empty', 'invokeRemote', 'methods', 'name', 'namespace'])
 
 function remoteServiceKey(namespace: string): string {
```

---

### 2. 【必选补齐】Web App Bundle 依赖声明 (`packages/bundle/web-app`)

📄 **修改文件**：`packages/bundle/web-app/package.json`

在 `dependencies` 中添加 `@deepseek-ai/dsh-api-gateway` 与 `@deepseek-ai/dsh-typert-registry`：

```diff
--- a/packages/bundle/web-app/package.json
+++ b/packages/bundle/web-app/package.json
@@ -45,6 +45,7 @@
   },
   "dependencies": {
     "@deepseek-ai/dsh-agent-presets": "workspace:^",
+    "@deepseek-ai/dsh-api-gateway": "workspace:^",
     "@deepseek-ai/dsh-api-remotes": "workspace:^",
     "@deepseek-ai/dsh-app-boot": "workspace:^",
     "@deepseek-ai/dsh-client-connection": "workspace:^",
@@ -100,6 +101,7 @@
     "@deepseek-ai/dsh-storage": "workspace:^",
     "@deepseek-ai/dsh-storage-domain": "workspace:^",
     "@deepseek-ai/dsh-storage-json": "workspace:^",
+    "@deepseek-ai/dsh-typert-registry": "workspace:^",
     "@deepseek-ai/dsh-workspace": "workspace:^",
     "@deepseek-ai/schemastery": "workspace:^",
     "commander": "^15.0.0"
```

---

### 3. 【界面优化】设置弹窗大屏 1260px 宽度扩展 (`ui-settings-*`)

#### 3.1 弹窗根容器尺寸
📄 **修改文件**：`packages/client/ui-settings-general/src/client/SettingsRoot.module.css`

```diff
--- a/packages/client/ui-settings-general/src/client/SettingsRoot.module.css
+++ b/packages/client/ui-settings-general/src/client/SettingsRoot.module.css
@@ -74,8 +74,8 @@
   position: relative;
   z-index: 1;
   display: flex;
-  width: 800px;
-  height: min(800px, calc(100vh - 48px));
+  width: min(1260px, calc(100vw - 48px));
+  height: min(880px, calc(100vh - 48px));
   max-width: calc(100vw - 48px);
   border-radius: 24px;
   overflow: hidden;
```

#### 3.2 插件清单与分类列表容器解除 760px 瓶颈
📄 **修改文件**：`packages/client/ui-settings-plugin-inventory/src/client/PluginInventorySettingsTab.module.css`

```diff
--- a/packages/client/ui-settings-plugin-inventory/src/client/PluginInventorySettingsTab.module.css
+++ b/packages/client/ui-settings-plugin-inventory/src/client/PluginInventorySettingsTab.module.css
@@ -3,7 +3,7 @@
   flex-direction: column;
   gap: 14px;
   width: 100%;
-  max-width: 760px;
+  max-width: 100%;
   color: var(--dsw-alias-label-primary);
 }
```

📄 **修改文件**：`packages/client/ui-settings-plugins/src/client/PluginsSettingsSection.module.css`

```diff
--- a/packages/client/ui-settings-plugins/src/client/PluginsSettingsSection.module.css
+++ b/packages/client/ui-settings-plugins/src/client/PluginsSettingsSection.module.css
@@ -4,7 +4,8 @@
   display: flex;
   flex-direction: column;
   gap: 12px;
-  max-width: 760px;
+  width: 100%;
+  max-width: 100%;
   color: var(--dsw-alias-label-primary);
 }
```

---

### 4. 【功能增强】可视化能力接缝与拓扑依赖图 (可选)

如需在设置中心开启「🌐 依赖图」：
1. 复制组件代码至：`packages/client/ui-settings-plugin-inventory/src/client/PluginDependencyGraphTab.tsx`；
2. 在 `packages/client/ui-settings-plugin-inventory/src/client/index.ts` 注册插槽：
```typescript
ctx.slots.inject('settings.plugins.tab', () => ctx.slots.register({
  name: 'settings.plugins.tab',
  id: 'graph',
  order: 20,
  label: () => '🌐 依赖图',
  locale: NS,
}, PluginDependencyGraphTab))
```

---

## 四、 插件扫描发现机制与跨仓库构建协同

在 `deepseek-harness` 完成上述代码修改后，请在 `deepseek-harness` 目录下执行构建以生成最新的 `lib/` 产物：

```bash
# 1. 在 deepseek-harness 目录下执行构建
cd ../deepseek-harness
pnpm run build

# 2. 返回 pi-dsh 启动体验
cd ../pi-dsh
pnpm start
```
