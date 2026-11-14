# Phase 2 — Data pipeline & real NASA data

**Hour band (§10):** 2–5 (paper balance and data tests)
**Starts after:** Phase 1's exit gate passed — the app installs, runs, builds, one test
passes, and `config.json` + the folder skeleton exist.
**Owner (§8.2):** Data developer (holds the API key in a local `.env`).

## Goal

Build the one allowed data flow (§6.2): prefetch real NASA DONKI data with a personal key,
save raw samples, inspect the real fields, decide the storm-level mapping against that real
data, and clean it into one or more mission JSON files the game can embed. When this phase
ends, `src/data/missions/` holds at least one valid, honestly-labelled mission window built
from real archived records — the foundation both Phase 3 (logic) and Phase 4 (UI) need.

## Feature IDs covered

- **F4** (data half): real storm events from DONKI, embedded.
- **F8** (data half): datasets identified for the later Data Sources screen.

## Task checklist

1. Create a local `.env` (never committed) from `.env.example` with a real `NASA_API_KEY`.
   The key is read **only** by the prefetch script via `process.env.NASA_API_KEY` (§6.2).
   DEMO_KEY works for a quick test but is rate-limited (30/hr, 50/day).
2. Write `scripts/prefetch.*`:
   - Query DONKI event types `FLR`, `SEP`, `CME`, `GST` (§6.3) over a chosen window.
   - **Test both hosts** per §6.3: `https://api.nasa.gov/DONKI/...` (with `api_key`) and the
     `ccmc.gsfc.nasa.gov` host; use whichever responds. Prefer windows **after June 2020**.
   - Save small raw response samples into `scripts/raw/` (commit them so the team can inspect
     real shapes — §6.2).
3. **Inspect the raw samples before writing any mapper** (§6.3, §11.2). Do not assume field
   names or value formats — open the real JSON and read the actual fields.
4. Decide the **storm-level mapping** (§6.4: 0 none / 1 minor / 2 moderate / 3 severe;
   intended C→minor, M→moderate, X or SEP→severe) **against the real data**, then record the
   final mapping in the CLAUDE.md §15 Decision Log. This is an **open decision** — confirm it,
   do not guess.
5. Write `scripts/clean.*` (the cleaner): transform raw → `src/data/missions/<id>.json`
   matching the §6.5 schema exactly:
   - `missionId`, `title`, `site: "moon"`, `dataSource: "NASA DONKI (archived data)"`,
     `window {start,end}`, and a `days[]` array of exactly `missionLengthDays` (10) entries.
   - Each day has `day`, `date`, `stormLevel` (0–3), and `events[]` where **every event label
     is generated from the real record** and carries a `sourceId` copied from the DONKI record
     (§6.5) — never typed from memory.
6. Produce **1 stormy window** for the MVP; optionally 1 calm window if time allows
   (second window is nice-to-have N1, not required now).
7. Create stub files for later phases (structured, empty content, not shipped yet):
   - `src/data/cards.json` — array matching the §6.6 card schema, entries `verified: false`.
   - `src/data/facts.json` — array of `{ id, text, sourceUrl, verified: false }` (§11.1).
8. Write the mission-validation rule test (this is required rule test #9, §12) in `tests/`.

## Files created/touched

- `.env` (local only, gitignored), `scripts/prefetch.*`, `scripts/clean.*`
- `scripts/raw/*.json` (small committed samples)
- `src/data/missions/<id>.json` (at least one)
- `src/data/cards.json`, `src/data/facts.json` (stubs)
- `tests/mission-data.test.*`
- CLAUDE.md §15 Decision Log entry for the storm-level mapping

## Guardrails for this phase

- The shipped app makes **no** NASA calls — only the prefetch script does (C4, C7, §6.2).
- Key lives only in `.env`; never in front-end code, never committed (§6.2).
- Embedded data is labelled **"archived NASA data"**, never "live" (C8, §11.3).
- Do not invent field names, event names, flare classes, IDs or URLs (§11.1). If a field is
  unclear, leave `// TODO(VERIFY): <what>` and tell the team — do not fill with a guess.

## ✅ Exit test gate (must pass before Phase 3 / Phase 4)

1. `npm run prefetch` (or the documented command) runs and writes raw JSON into `scripts/raw/`.
2. The cleaner produces at least one `src/data/missions/<id>.json`.
3. `npm test` — the mission-validation test passes, asserting: the mission has exactly 10
   days, every `stormLevel` is within 0–3, and **every event has a `sourceId`** (rule test #9).
4. The storm-level mapping is written into the §15 Decision Log.
5. Spot-check one event label by eye against its raw record in `scripts/raw/` — the label
   reflects the real record.

Report actual output. Only when these pass do Phases 3 and 4 begin.
