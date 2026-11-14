# Phase 3 — Pure game logic

**Hour band (§10):** 5–9 (parallel build — runs alongside Phase 4)
**Starts after:** Phase 2's exit gate passed — a valid mission JSON exists in
`src/data/missions/`, and `config.json` holds every game number from Phase 1.
**Owner (§8.2):** Game logic developer.

## Goal

Implement the complete, pure game-rules engine in `src/logic` with the exact daily-update
semantics from §4.2, and cover it with all 9 required rule tests (§12). The logic imports
nothing from React/DOM/scene/UI and uses no real randomness or clock — so it is fully
reproducible and testable. When this phase ends, the UI (Phase 4) has a stable, verified API
to drive the game.

## Feature IDs covered

- **F3** (rules half): the 10-day loop and three meters, as pure functions.

## Task checklist

1. Agree the API shape with the UI developer first (so Phase 4 can wire against it). Keep the
   §8.3 shape, adapting names to the repo:
   - `createInitialState(config, mission)`
   - `validateAllocation(allocation, day, config)` → `{ ok, reason }`
   - `makeForecast(day, mission, rng, config)` → forecast level (uses an **injected seeded RNG**)
   - `simulateDay(state, allocation, mission, config)` → new state with
     `status: "running" | "failed" | "succeeded"` (and a `reason` naming the meter on failure)
   - `scoreMission(state)`  and  `buildDebrief(state, mission)`
2. Implement the daily update **exactly** as §4.2 (all meters from previous values, clamp 0–10):
   - `air    = clamp(air + lifeSupport - AIR_USE)`
   - `food   = clamp(food - FOOD_USE + greenhouseYesterday)`
   - `damage = max(0, stormDamage[level] - SHIELD_PROTECTION * shield) + (shield == 0 ? 1 : 0)`
   - `safety = clamp(safety - damage + (level == 0 && shield >= 1 ? 1 : 0))`
   - `greenhouseYesterday = greenhouse`  (for tomorrow's food)
   - `level` is the **real** storm level from the mission, not the forecast (§4.2).
3. Fail/success rules: any meter `<= 0` after an update → `failed` with the meter named; success
   only when day 10 completes **and** all three meters `>= successMinMeter` (3) (§4.1).
4. Score = sum of Science allocations over the mission (§4.1).
5. Forecast: real level chosen ± from `forecastErrorTable` `[-1,0,0,1]`, clamped to 0–3, driven
   by the injected seeded RNG so the same seed gives the same sequence (§4.1, §8.3).
6. Pull **every number from `config`** — no magic numbers in logic (C9).
7. Write all **9 required rule tests** (§12) in `tests/` (test #9 may already exist from Phase 2):
   1. allocation sum > day budget is rejected
   2. air = `air + lifeSupport - 3`, clamped 0–10
   3. food = `food - 2 + greenhouseYesterday`; day 1 uses the config initial greenhouse value
   4. damage examples: severe+shield3→1; severe+shield0→8; calm+shield0→1; calm+shield≥1→+1 safety (cap 10)
   5. any meter ≤ 0 after update → `failed` with the meter named
   6. success only when day 10 done and all meters ≥ 3
   7. same seed → same forecast sequence; forecast always 0–3 and within 1 of the real level
   8. changing a value in `config` changes outcomes (nothing hardcoded)
   9. mission-data validation (day count, valid storm levels, every event has `sourceId`)

## Files created/touched

- `src/logic/*.{js,ts}` (state, rules, forecast, scoring, debrief)
- `tests/*.test.*` covering the 9 rule tests
- `src/data/config.json` — only if a value is missing; otherwise read-only

## Guardrails for this phase

- `src/logic` imports **nothing** from React, DOM, `src/scene`, or `src/ui` (C10, §8.3).
- Functions are pure: no `Date.now()`, no `Math.random()`, no network, no mutation of inputs.
  Randomness comes only from the injected seeded RNG (§8.3).
- Do not change any frozen concept or the §4.2 semantics. Do not claim the game is "balanced"
  — tuning is a later, human, playtest activity (§4.3, §11.1).

## ✅ Exit test gate (must pass before this phase is done)

1. `npm test` — **all 9 rule tests pass.** Report the real pass/fail output (§11.1).
2. Quick static check: no `import` in `src/logic` references React, the DOM, `src/scene`, or
   `src/ui`; no `Math.random`/`Date.now` appears in `src/logic`.
3. A short driver (test or script) can play a full 10-day mission on the Phase 2 mission data
   and reach both a `failed` and a `succeeded` outcome with different allocations.

Only when all pass is the logic API frozen for Phase 4 to consume.
