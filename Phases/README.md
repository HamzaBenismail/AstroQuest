# Build Phases — Junior Astronaut Mission Trainer

This folder breaks the MVP build into **7 sequential phases**, from an empty repo to a
deployed, playable game. Read `../CLAUDE.md` first — it is the source of truth. These phase
files only organise the work; they never override a frozen concept (C1–C10) or the MVP
feature gate (§9).

## The rule that connects every phase

> **Each phase starts exactly where the previous phase's exit gate passed, and no phase is
> "done" until its own exit test gate passes.** If a gate fails, stay in that phase — do not
> start the next one. Report the real test output (§11.1), never claim a gate passed if it did not.

## Phase map

| Phase | File | Covers (features) | Owner (§8.2) | Hour band (§10) |
|---|---|---|---|---|
| 1 | `phase-1-setup.md` | scaffold, config, folders | Whole team / lead | 0–2 |
| 2 | `phase-2-data-pipeline.md` | F4 (data), F8 (data) | Data developer | 2–5 |
| 3 | `phase-3-game-logic.md` | F3 (rules) | Game logic developer | 5–9 (parallel) |
| 4 | `phase-4-core-ui-loop.md` | F1, F2, F3, F7, F9 | UI developer | 9–13 (parallel) |
| 5 | `phase-5-layered-scene.md` | F5 | UI dev + Designer | 13–16 |
| 6 | `phase-6-content-attribution.md` | F4 (labels), F6, F8, F9 | Science writer + Data dev | 16–18 |
| 7 | `phase-7-integration-deploy.md` | integration + deploy of F1–F9 | Whole team | 18–30 |

**Feature freeze is ~hour 18** (end of Phase 6). After that: bug fixes, balance, copy,
content and art only — no new features (§10).

## How to use a phase file

Each file has the same shape: Goal → Feature IDs → Owner → Task checklist → Files
created/touched → Guardrails → **✅ Exit test gate**. Work top to bottom; the task is done
only when the exit gate at the bottom passes.

## Parallelism note

Phases 3 and 4 both begin once Phase 2's mission data exists, so the logic developer and the
UI developer can work at the same time. Phase 4's UI consumes Phase 3's logic API, so the
logic API shape (§8.3) must be agreed before they split.
