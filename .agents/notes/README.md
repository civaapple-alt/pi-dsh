# Pi-DSH Architecture & Design Decisions (Agent Notes)

English | [中文](README.zh.md)

This directory tracks the architectural records, design decisions, and tradeoffs for Pi-DSH.

---

## Index

| Date | Title | Core Theme |
|---|---|---|
| `2026-08-18` | [Micro-Frontend Static Routing, Cordis Native Loader, and Dynamic Preset Resolution](implemented/architecture/2026-08-18-micro-frontend-routing-and-loader-preset-resolution.md) | Resolving `/plugins/*` 404s via `clientModules.table`, atomic `window.__DSH_BOOT__` injection, native Cordis `Loader` instance, and standard preset capability seams |
| `2026-08-18` | [100% Official DSH Plugin Ecosystem & Micro-Frontend Matrix](implemented/architecture/2026-08-18-dsh-official-plugins-and-micro-frontend-matrix.md) | Official `@deepseek-ai/dsh-*` suite (50+ plugins), 34 Client UI Micro-Frontend slot matrix, Typert Remote RPC Gateway, Directory picker seam, and topological bootstrapper |
| `2026-08-18` | [Pi-DSH Architecture & Profile/Preset Model](implemented/architecture/2026-08-18-pi-dsh-agent-and-presets-architecture.md) | Cordis microkernel, Two-tier Profile/Preset model, Turn execution engine, and Web/Headless dual-mode |
