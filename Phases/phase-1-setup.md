# Phase 1 — Project setup & scaffolding

**Hour band (§10):** 0–2 (setup and decisions)
**Starts after:** nothing — this is the first phase. The repo currently holds only
`CLAUDE.md` and this `Phases/` folder.
**Owner (§8.2):** team lead / whole team (one person runs the scaffold, everyone pulls).

## Goal

Stand up an empty but runnable Vite + React project with the exact folder structure from
§8.2, a single config file holding every game number from §4, and a working test runner.
When this phase ends, anyone on the team can `install`, run the dev server, and run tests —
giving Phases 2–4 a shared foundation to build on in parallel.

## Feature IDs covered

None directly — this is the groundwork all of F1–F9 depend on.

## Task checklist

1. Scaffold the app with **Vite + React** (the §3/§8.1 recommended stack). Use plain CSS.
   Do **not** add PixiJS, Three.js, Phaser, Redux, a backend, or any extra dependency (§8.1).
   If an extra dependency ever seems needed, ask first and justify it in one sentence.
2. Add **Vitest** as the test runner (it pairs with Vite; §8.1).
3. Create the folder skeleton **exactly** as §8.2 specifies:
   - `src/scene/`  (scene component, layers, effects)
   - `src/ui/`     (screens, controls, meters, tutorial)
   - `src/logic/`  (pure game rules — no UI imports)
   - `src/data/`   (`config.json`, `missions/`, `cards.json`, `facts.json`)
   - `src/data/missions/`
   - `public/art/`
   - `scripts/`  and  `scripts/raw/`
   - `tests/`
4. Create `src/data/config.json` and seed it with **every game-unit value** from §4.1 and
   §4.2, so no number is ever hardcoded later (C9). Include at least:
   - `missionLengthDays: 10`
   - `startingMeters: { air: 5, food: 4, safety: 8 }`, `meterMax: 10`
   - `initialGreenhouseYesterday: 1`
   - `powerBudget: { sunlitDays: [1,2,3,4], sunlit: 10, night: 7 }`
   - `allocationRanges: { lifeSupport: [0,4], shield: [0,3], greenhouse: [0,3], science: [0,3] }`
   - `stormDamage: { "0": 0, "1": 2, "2": 4, "3": 7 }`
   - `airUse: 3`, `foodUse: 2`, `shieldProtection: 2`
   - `forecastErrorTable: [-1, 0, 0, 1]`, `stormLevelRange: [0, 3]`
   - `successMinMeter: 3`, `site: "moon"`  (working assumption, not frozen — §3)
   Mark the whole file in a top comment field as "game units — simplified, not real
   engineering values" (§4).
5. Add `.gitignore` containing `.env` and `node_modules/` (§6.2 — never commit a key).
6. Add `.env.example` with a single line `NASA_API_KEY=` (the real `.env` is created by one
   person in Phase 2 and never committed).
7. Seed `public/art/CREDITS.md` with a header and an empty table (name, source, license),
   ready for Phase 5/7 (§7.3).
8. Create a `README.md` stub with the project one-paragraph summary and placeholder sections
   for Data Sources and dataset explanation (filled in Phase 6/8).
9. Record the real commands in both `README.md` and in CLAUDE.md §12's command placeholders
   (`install`, `dev`, `test`, `build`, `prefetch`) so they stay accurate.

## Files created/touched

- `package.json`, `vite.config.*`, `index.html`, `src/main.*`, `src/App.*`
- `src/data/config.json`
- `.gitignore`, `.env.example`
- `public/art/CREDITS.md`
- `README.md`
- folder skeleton listed above (empty `.gitkeep` where needed)

## Guardrails for this phase

- Config-driven from day one: every §4 number lives in `config.json` (C9).
- No banned libraries, no new dependency without asking (§8.1).
- No NASA call anywhere in the app — data comes later via the Phase 2 pipeline (C7, §6.2).

## ✅ Exit test gate (must pass before Phase 2)

Run and confirm each:

1. `npm install` completes with no errors.
2. `npm run dev` serves the app locally and shows a blank/placeholder page with no console errors.
3. `npm run build` completes successfully.
4. `npm test` runs Vitest and **one trivial placeholder test passes** (e.g. a
   `tests/smoke.test.*` asserting `config.json` loads and `missionLengthDays === 10`).
5. The folder structure matches §8.2 exactly, and `config.json` contains every value in the
   checklist above.

Report the actual command output. Only when all five pass does Phase 2 begin.
