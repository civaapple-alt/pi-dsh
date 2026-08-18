# ADR: Micro-Frontend Static Routing, Cordis Native Loader Instance, and Dynamic Preset Resolution

**Date**: 2026-08-18  
**Status**: Implemented  
**Author**: Pi-DSH Architecture Team  

---

## 1. Context & Problem Statement

During the complete integration of the official DeepSeek Harness (DSH) plugin suite (50+ backend plugins & 34 frontend micro-frontend plugins) into Pi-DSH, three critical pipeline issues were identified:

1. **Micro-Frontend Bundle 404 Not Found**:
   - Browser requests for `/plugins/@deepseek-ai/<pkgName>/client.js` resulted in 404 errors.
   - Official `@deepseek-ai/dsh-client-modules` route handler `serveBundle` relies on its internal `this.table` mapping, which was not populated in custom CLI launches.

2. **App Shell Pending Activation (`waiting for services: slots, sessions, layout`)**:
   - `dsh-client-modules` initially injected an empty `window.__DSH_BOOT__` placeholder into `index.html`. The CLI's `tapIndex` did not overwrite it, leaving the browser without the complete 36-entry dependency graph and blocking `dsh-client-app-shell` activation.

3. **Workspace Composer Disabled / Locked (`inert: true`)**:
   - Workspace creation triggered `POST /api/session.create`, failing with `agent-preset-not-found: preset "standard" not found`.
   - `dsh-agent-presets` relies on `Include` calling `this.loader.ctx.extend` and `this.loader.getTasks()`, which were absent in simplified mock objects.
   - Presets lacked host capability seams (`fs`, `subprocess`, `shell-env`, `shell`), failing preset mounting.

---

## 2. Architectural Decisions

### Decision 1: Automatic `clientModules.table` Micro-Frontend Registry Mapping

In `apps/cli/src/index.ts`, implemented automatic package discovery:
- Scanned all 39 packages declaring `dsh.client.platform: "web"`.
- Resolved their physical `lib/client.js` artifact paths and computed dynamic short-hash `rev` based on `mtime`.
- Injected metadata directly into `clientModules.table`, ensuring `/plugins` routes return `200 OK` with proper `text/javascript; charset=utf-8` MIME types.

### Decision 2: Atomic Regex Replacement of `window.__DSH_BOOT__` in `tapIndex`

- Refactored `tapIndex` to use regex replacement `/<script>window\.__DSH_BOOT__ = .*?<\/script>/`, ensuring that regardless of initial placeholders, the complete top-level 36-module boot graph is injected into `<head>`.
- Allowed `app-shell` to discover `slots`, `sessions`, and `layout` in strict topological order and render the UI cleanly.

### Decision 3: Native Cordis `Loader` Integration & Host Capability Seams

- **Native Loader Instance**: Instantiated the real `Loader` class from `vendor/loader` on the root context, hooking `loader.internal.import` for dynamic workspace package mapping.
- **Standard Preset Provisioning**: Added [`presets/standard/`](../../../../presets/standard/) with standard coding capabilities (File tools, Regex replacement, Bash, Ripgrep search, Todo tracking) and registered `roots: presets` in `dsh-agent-presets`.
- **Host Seam Completion**: Added `@deepseek-ai/dsh-fs-local`, `@deepseek-ai/dsh-subprocess-local`, `@deepseek-ai/dsh-shell-env`, `@deepseek-ai/dsh-shell` in `profiles/web.yml`.

---

## 3. Verification & Results

1. All 36 client plugin bundles at `/plugins/*` serve with `200 OK`.
2. `POST /api/workspace.create` $\to$ `POST /api/session.create` smoothly provisions sessions with `standard` preset.
3. `POST /api/session.models` returns `routable: true`, transitioning the input machine from `inert: true` to active editable state.
