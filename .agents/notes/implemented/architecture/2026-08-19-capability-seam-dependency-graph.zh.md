# 架构决策记录：基于 Cordis 的全栈能力接缝与微前端可视化依赖图 (Capability Seam Graph)

**日期**：2026-08-19  
**状态**：已实施 (Implemented)  
**作者**：Pi-DSH 架构团队  
**涉及模块**：`apps/cli/src/graph.ts`, `packages/client/ui-settings-plugin-inventory`, `profiles/web.yml`

---

## 1. 背景与挑战

随着 Pi-DSH 全面接入 100% 官方 DSH 生态（装载 37 个宿主插件 + 36 个微前端 UI 插件，共 73 个插件及 30 个系统级服务），系统的插件网络与服务依赖呈现出极高的复杂度。

在纯粹的微内核架构中，如果缺少直观的可视化工具，用户与开发者将面临以下痛点：
1. **隐式依赖黒盒**：难以快速确认某个底层驱动（如 `fs-local` 或 `subprocess-local`）是否已被正确挂载，以及哪些上层工具（如 `tool-fs`、`tool-bash`）正在消费它；
2. **能力接缝角色模糊**：DSH 架构强调“能力接缝三位一体（Definition 契约 / Provider 实现 / Consumer 消费）”，但缺乏全局拓扑呈现；
3. **传统力导向图的视觉凌乱**：当节点达到 70+ 时，纯物理引力图往往散落重叠，难以形成结构化认知。

---

## 2. 核心架构与技术方案

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                             Pi-DSH Web GUI                                  │
│                                                                             │
│  [设置中心] ──▶ [插件设置] ──▶ [🌐 依赖图 Tab] (PluginDependencyGraphTab)    │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ GET /api/pluginGraph
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           apps/cli/src/graph.ts                             │
│                                                                             │
│  1. 深度解析 Profile YAML & Monorepo package.json 模块定义                  │
│  2. 提取 73 个插件 (37 Host + 36 Client) 及 provides/injects 依赖关系        │
│  3. 自动计算 Seam 角色: ⚡ Provider / 🔨 Consumer / 📐 Definition / 🧩 Framework │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.1 依赖图后端拓扑提取服务 (`GET /api/pluginGraph`)
在 `apps/cli/src/graph.ts` 中实现拓扑提取器，自动扫描解析当前激活的 Profile YAML 与微前端清单：
- **`seamRole` 自动分类算法**：
  - **`provider`**：底层驱动与数据持久化（`fs-local`, `subprocess-local`, `shell-env`, `llm-deepseek`, `storage-json`, `webserver` 等）；
  - **`consumer`**：模型工具与前端插槽卡片（`tool-fs`, `tool-bash`, `client-ui-*`）；
  - **`definition`**：服务契约与抽象基类（`dsh-fs`, `dsh-shell`, `dsh-llm`, `dsh-storage`）；
  - **`framework`**：容器调度与生命周期（`agent-presets`, `client-runtime`, `typert-registry`）。
- **有向边关系构建**：遍历所有节点的 `injects` 数组，与 `provides` 映射表自动匹配，生成精准的有向依赖流（`Consumer $\xrightarrow{inject}$ Provider`）。

### 2.2 双布局渲染引擎与抗凌乱设计
在 `PluginDependencyGraphTab.tsx` 中集成高性能 Canvas 2D 渲染器：
1. **🌲 分层拓扑流 (Hierarchical DAG 流向布局 - 默认)**：
   - 将 73 个节点严格划分为四列架构流水线：
     - **第 1 列**：⚡ 宿主底层驱动 (Providers)
     - **第 2 列**：📐 服务面与通信网关 (Services & RPC)
     - **第 3 列**：🤖 智能体内核与工具 (Agent & Tools)
     - **第 4 列**：🌐 浏览器微前端 UI 矩阵 (Micro-Frontends)
   - 节点自上而下整齐排布，采用**平滑三次贝塞尔曲线 (Cubic Bezier Curves)** 绘制连线，支持物理拖拽与弹性吸附回弹。
2. **🪐 物理星系图 (Force Clustered 聚合布局)**：
   - 采用多环引力斥力物理模型，支持自由探索。

### 2.3 浅色 / 深色双主题毫秒级自适应
- 封装 `useIsDarkMode` Hook，通过 `MutationObserver` 监听 `document.body` 上的 `data-ds-dark-theme` 属性；
- 动态调整画布网格、卡片底色（浅色模式采用马卡龙淡彩 `#eff6ff`，深色模式采用半透明微光 `rgba(37,99,235,0.15)`）与连线对比度，实现无缝主题融合。

### 2.4 右侧全功能检查器抽屉 (Inspector Drawer)
- 点击任意节点即时展开右侧面板；
- 详细展示节点 Seam 角色定义、职责说明、导出的 `ctx.serviceName`、消费的依赖项及完整 YAML 配置。

---

## 3. 验证与成效

1. **可视化排障闭环**：通过依赖图能够瞬间发现未挂载的底层驱动或悬空的 Consumer 依赖；
2. **交互体验流畅**：在 73 个节点与数十条依赖流场景下保持 60fps 稳定渲染，缩放手感平滑无抖动；
3. **架构语义清晰**：通过 Seam 角色筛选（`⚡ 驱动` / `🔨 消费`），清晰展现 DSH 三位一体生态格局。
