# Agent Note: Pi-DSH Architecture & Profile/Preset Model

Status: implemented

English | [中文](2026-08-18-pi-dsh-agent-and-presets-architecture.zh.md)

> Scope: Documents the Cordis microkernel architecture, turn execution loop, two-tier configuration model (Profiles & Presets), toolchain design, and dual-mode execution in Pi-DSH.

---

## 1. Context & Objectives

Pi-DSH delivers a clean, fully functional AI Coding Agent harness matching the DeepSeek Harness (`dsh`) standard:
1. **Built completely on `@deepseek-ai/cordis` (v4.0.1)**;
2. **Two-Tier Configuration**:
   - **Profiles** (`profiles/*.yml`) manage host infrastructure services;
   - **Presets** (`presets/*/agent.cordis.yml`) manage scoped agent tools and prompt contributions;
3. **Core Pi Coding Agent Tooling** (`read_file`, `write_file`, `edit_file`, `list_dir`, `run_command`, `grep_search`, `find_by_name`);
4. **Dual Execution Modes**: Fullstack Web GUI and Headless CLI / REPL.

---

## 2. Architecture Decisions

- **Infrastructure vs Scoped Capabilities**: Host plugins manage lifecycle and registry services, while preset plugins isolate their tools into the agent session context.
- **SSE & REPL Streaming**: Streaming tokens, reasoning blocks, and tool calls are pushed reactively via Cordis events.

---

## 3. Verification

1. **Headless Execution**: Verified via `pnpm headless "List files"`.
2. **Web GUI**: Verified via `http://localhost:3000` with SSE streaming and dynamic preset switching.
