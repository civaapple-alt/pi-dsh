# Changelog

All notable changes to the **Pi-DSH** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.2.0] - 2026-08-18

### 🚀 Major Architectural Leap: 100% Official DSH Plugin Ecosystem & Micro-Frontend Matrix

- **Full Official DSH Integration**: Migrated from initial local stub packages to 100% official `@deepseek-ai/dsh-*` packages (50+ plugins) running on `@deepseek-ai/cordis` (v4.0.1).
- **Official Browser Micro-Frontend Matrix**: Integrated the complete suite of 34 official Client UI plugins (`@deepseek-ai/dsh-client-ui-*`), including:
  - Global Frame & Slots: `ui-layout`, `ui-sidebar`, `ui-workspace`, `ui-theme`, `ui-locale`, `ui-settings`.
  - Conversation & Input: `ui-conversation`, `ui-trajectory`, `ui-input-trigger`, `ui-commands`, `ui-model-selection`.
  - Advanced Tool Presentation: `ui-tool`, `ui-cordis`, `ui-deliverables`, `ui-workflow-run`.
  - Agent Ecosystem: `ui-agent-preset`, `ui-subagent`, `ui-skill`, `ui-plan`, `ui-goal`, `ui-jobs`, `ui-user-questions`, `ui-permission-presets`.
  - Settings Center: `ui-settings-general`, `ui-settings-models`, `ui-settings-plugins`, `ui-settings-plugin-inventory`.
- **In-App Directory Picker Suite**: Added `@deepseek-ai/dsh-client-ui-directory-picker-browse` (frontend) and `@deepseek-ai/dsh-host-directory-picker-browse` (backend) to fill the `directoryFlow` single slots, enabling full workspace directory browsing and folder creation.
- **Typert Remote Gateway & Host API Proxy**: Configured complete host service graph with `@deepseek-ai/dsh-api-gateway`, `@deepseek-ai/dsh-api-remotes`, `@deepseek-ai/dsh-system-prompt`, and storage services, enabling `/api/llm.providers`, `/api/llm.models`, and `/api/pluginInventory/list`.
- **Topological Module Manifest Bootstrapper**: In `apps/cli/src/index.ts`, implemented automatic resolution of Monorepo packages via `ctx.baseUrl` and active scanning of client bundles with dynamic `rev` cache-busting, ensuring all 34 client UI plugins load into `window.__DSH_BOOT__` in strict dependency order.
- **Clean Custom Workspace**: Removed 9 superseded local stub packages (`packages/core/*`, `packages/host/*`, `packages/preset/*`, `packages/tools/*`), designating `packages/` exclusively as the workspace for user-defined custom plugins.

---

## [0.1.0] - 2026-08-18

### 🌟 Initial Release

- **Cordis Microkernel Foundation**: Initialized `@deepseek-ai/cordis` v4 container with `cosmokit`.
- **Two-Tier Configuration Architecture**:
  - `profiles/*.yml` for host infrastructure orchestration (`web.yml`, `headless.yml`).
  - `presets/*/agent.cordis.yml` for agent role and capability presets (`coder`, `reviewer`, `minimal`).
- **Dual Execution Modes**: Web GUI mode on port 3000 and Headless CLI / REPL mode.
- **DeepSeek LLM Integration**: Stream generation with Thinking block extraction and Tool call execution.
