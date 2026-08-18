# Decision Record: 100% Official DSH Plugin Ecosystem & Micro-Frontend Matrix Integration

- **Status**: Implemented
- **Date**: 2026-08-18
- **Authors**: DeepSeek Harness / Pi-DSH Team
- **Areas**: Architecture, Web UI, Cordis Container, Remote Gateway, Micro-Frontend Slots

---

## 1. Context & Problem Statement

Initially, Pi-DSH scaffolded a minimal set of local mock packages in `packages/core/*`, `packages/host/*`, and `packages/tools/*` to demonstrate basic Cordis plugin orchestration. However, to unlock the full potential of DeepSeek Harness (DSH) — including the sophisticated browser Micro-Frontend Slot Matrix (34 UI plugins), Typert Remote RPC Gateway, durable session storage, and in-app workspace picking — the architecture needed to pivot to **100% official `@deepseek-ai/dsh-*` plugins** directly.

---

## 2. Decision & Key Implementations

### A. Full Official DSH Plugin Suite Integration
- Replaced all local stubs with upstream `@deepseek-ai/dsh-*` packages from the DSH Monorepo (`deepseek-harness/packages/`).
- Configured complete host infrastructure in `profiles/web.yml`, including `@deepseek-ai/dsh-system-prompt`, `@deepseek-ai/dsh-storage-domain`, `@deepseek-ai/dsh-host-apiproxy`, `@deepseek-ai/dsh-session-stats`, and `@deepseek-ai/dsh-host-plugin-inventory`.

### B. Micro-Frontend Slot Matrix (34 Client UI Plugins)
- The browser interface operates on Cordis micro-frontend slots:
  1. **Base & Settings**: `dsh-client-ui-settings` (provides `ctx.settingsScope`).
  2. **Context & Theme**: `dsh-client-locale` (provides `locale`), `dsh-client-ui-theme` (provides `theme`).
  3. **Global Layout & Frame**: `dsh-client-ui-layout` (provides `layout` and AppFrame in `root` slot), `dsh-client-ui-sidebar`, `dsh-client-ui-workspace`.
  4. **Directory Picker Seam**: Mounted `@deepseek-ai/dsh-client-ui-directory-picker-browse` (frontend) and `@deepseek-ai/dsh-host-directory-picker-browse` (backend) to fill the `directoryFlow` single slot with an in-app browser dialog.
  5. **Conversation & Tools**: Full suite of conversation, trajectory, input triggers, and rich tool renderers (Diff viewers, persistent terminals, deliverables).

### C. Topologically Ordered `window.__DSH_BOOT__` Manifest
- Configured `ctx.baseUrl` in `apps/cli/src/index.ts` to anchor package resolution to the DSH workspace manifest.
- Used active scanning with `clientModules.flush()` to populate `window.__DSH_BOOT__.entries` with all 34 client plugins in strict topological order before browser boot.
- Applied cache-busting `rev` tags derived from bundle timestamps (`fs.statSync(clientJs).mtimeMs`).

### D. Single-Slot Priority Discipline
- Adhered to Cordis slot semantics where `kind: 'single'` slots (`conversation.hero.workspace.directoryFlow`) require exactly one occupant at priority 0. Pinned `-browse` as the universal cross-platform directory picker for Web deployments.

### E. Clean Repository Boundary
- Removed all 9 superseded local stubs, keeping `pi-dsh/packages/` purely for user-defined custom plugin extensions.

---

## 3. Verification & Results

- **Console Errors**: 0 errors during browser boot; `@deepseek-ai/dsh-client-app-shell` and all 34 micro-frontend plugins activate synchronously in <100ms.
- **RPC Endpoints**: Verified 200 OK responses for `/api/llm.providers`, `/api/llm.models`, `/api/pluginInventory/list`, `/api/commands`.
- **User Experience**: Clicking "Select Workspace" immediately opens the official directory dialog with breadcrumb navigation and folder creation capabilities.
