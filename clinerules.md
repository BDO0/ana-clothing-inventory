# Cline Project Rules & Memory Bank Protocol

You must maintain a structured Memory Bank to track project state, architecture, and progress. This ensures continuity across chat sessions.

## 1. Memory Bank Structure
The Memory Bank lives in the `memory-bank/` folder at the root and consists of exactly these 5 files:
1. `README.md` — Index pointing to all files.
2. `00-project-brief.md` — Core purpose, features, philosophy, and system rules.
3. `01-architecture.md` — System layers, data flow, tech stack, and file structure map.
4. `02-implementation-status.md` — High-level, phase-by-phase status (Implemented / In Progress / Remaining).
5. `03-current-phase.md` — The active sprint: what is being worked on right now and immediate next steps.

## 2. Auto-Update Mandate
* **Incremental Updates:** At the end of every significant task or phase, before declaring a job complete, you MUST automatically update the relevant files in the `memory-bank/` directory.
* **Token Efficiency:** Only modify the files that actually need updating. Daily tasks should typically only touch `03-current-phase.md`. Do not rewrite static files like `00-project-brief.md` or `01-architecture.md` unless the core project scope or architecture changes.
* **Task Closure:** Always ensure `03-current-phase.md` accurately reflects the exact state of the workspace before handing control back to the user.

## 3. Session Start Protocol
When starting a new session or after a context reset, if the user asks you to read the memory bank or pick up where we left off, you must:
1. Read the `memory-bank/` files to re-align with the project's state.
2. Review `03-current-phase.md` to identify the immediate next steps.
3. Proceed with development matching the architecture defined in `01-architecture.md`.