# Architecture Decision Record: Visual Capability Seam & Plugin Dependency Graph on Cordis

**Date**: 2026-08-19  
**Status**: Implemented  
**Author**: Pi-DSH Architecture Team  
**Components**: `apps/cli/src/graph.ts`, `packages/client/ui-settings-plugin-inventory`, `profiles/web.yml`

---

## 1. Context and Problem Statement

With Pi-DSH integrating the 100% official DSH ecosystem (comprising 37 Host plugins and 36 Micro-Frontend UI plugins, totaling 73 plugins and 30 system-level services), the plugin network and service dependency hierarchy reached substantial complexity.

In a purely decoupled micro-kernel architecture, lacking an intuitive visual inspection tool leads to:
1. **Black-box dependency cascade**: Difficult to verify whether underlying drivers (such as `fs-local` or `subprocess-local`) are properly mounted and which upper-tier tools (`tool-fs`, `tool-bash`) are consuming them;
2. **Ambiguous Capability Seam roles**: DSH architecture mandates the "Triad Seam" pattern (Definition / Provider / Consumer), but lacks global topological representation;
3. **Visual clutter in raw force-directed graphs**: With 70+ nodes, raw physical gravity leads to chaotic overlapping and scattered nodes.

---

## 2. Decision and Architecture

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                             Pi-DSH Web GUI                                  │
│                                                                             │
│  [Settings] ──▶ [Plugins] ──▶ [🌐 Dependency Graph Tab]                     │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ GET /api/pluginGraph
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           apps/cli/src/graph.ts                             │
│                                                                             │
│  1. Parse Profile YAML & Monorepo package.json module definitions           │
│  2. Extract 73 plugins (37 Host + 36 Client) & provides/injects mappings    │
│  3. Compute Seam Roles: ⚡ Provider / 🔨 Consumer / 📐 Definition / 🧩 Kernel  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.1 Graph Topology Service (`GET /api/pluginGraph`)
Implemented in `apps/cli/src/graph.ts` to inspect the active profile YAML and micro-frontend table:
- **`seamRole` Classification**:
  - **`provider`**: Low-level infrastructure and storage drivers (`fs-local`, `subprocess-local`, `shell-env`, `llm-deepseek`, `storage-json`, `webserver`);
  - **`consumer`**: AI tools and UI slot widgets (`tool-fs`, `tool-bash`, `client-ui-*`);
  - **`definition`**: Pure TypeScript interface contracts and abstract services (`dsh-fs`, `dsh-shell`, `dsh-llm`, `dsh-storage`);
  - **`framework`**: Kernel orchestration and lifecycle bridges (`agent-presets`, `client-runtime`, `typert-registry`).
- **Directed Links Construction**: Resolves every node's `injects` against the global `provides` registry (`Consumer $\xrightarrow{inject}$ Provider`).

### 2.2 Dual Layout Rendering Engine & Anti-Clutter Design
Implemented in `PluginDependencyGraphTab.tsx` with a high-performance Canvas 2D engine:
1. **🌲 Hierarchical DAG Flow Layout (Default)**:
   - Organizes all 73 nodes into a structured 4-column architecture pipeline:
     - **Column 1**: ⚡ Host Providers & Infrastructure
     - **Column 2**: 📐 Services, Storage & RPC Gateways
     - **Column 3**: 🤖 Agent Core & Tools
     - **Column 4**: 🌐 Browser Micro-Frontends (UI Matrix)
   - Uses **Smooth Cubic Bezier Curves** for dependency links, with elastic snap-back physics during node dragging.
2. **🪐 Force Clustered Layout**:
   - Multi-ring category attraction and repulsion for exploratory navigation.

### 2.3 Real-Time Light / Dark Theme Adaptation
- Employs `useIsDarkMode` Hook backed by `MutationObserver` on `document.body[data-ds-dark-theme]`;
- Dynamically shifts canvas grid, card fills, borders, and link opacities for flawless theme harmony.

### 2.4 Inspector Drawer
- Clicking any node opens a right-side drawer detailing its Capability Seam role, architectural responsibilities, provided `ctx.service` exports, consumed dependencies, and active YAML configuration.

---

## 3. Results

1. **Transparent Topology**: Instant verification of capability coverage and dependency health;
2. **Smooth 60fps Performance**: Stable rendering across 73 nodes with crisp typography and zero passive listener warnings;
3. **Clear Architectural Semantics**: Direct visual projection of the official DSH Capability Seam Triad model.
