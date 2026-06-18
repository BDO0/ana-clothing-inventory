# ANA Clothing Inventory System — Memory Bank

This is the project memory bank. It documents the current state, architecture, and progress of the system. Update these files after each significant change.

## Files

| File | Purpose |
|------|---------|
| [00-project-brief.md](./00-project-brief.md) | Project purpose, core philosophy, key features, system rules |
| [01-architecture.md](./01-architecture.md) | System layers, data flow, technology stack, file structure map |
| [02-implementation-status.md](./02-implementation-status.md) | Phase-by-phase status of what's implemented, tested, and remaining |
| [03-current-phase.md](./03-current-phase.md) | Current phase, active work, next steps |

## Project Configuration
- **Rules file**: `clinerules.md` at project root — defines Memory Bank protocol, auto-update mandate, and session start protocol.
- **Documentation**: `docs/` directory with 8 markdown files covering system overview, architecture, event module, local database, sync engine, stock engine, UI spec, rules, and Supabase schema.

## Project Snapshot

- **Name**: ANA Clothing Inventory System
- **Type**: Local-first, offline-capable inventory management PWA
- **Stack**: React 19 + TypeScript + Dexie.js (IndexedDB) + Supabase + Tailwind CSS
- **Test**: Vitest + Playwright + MSW
- **Core Rule**: Stock is NEVER stored — only inventory events are stored. Stock is always computed.