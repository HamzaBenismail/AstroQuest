# Phase 4 — Core UI & game loop

**Hour band (§10):** 9–13 (parallel build — runs alongside / just after Phase 3)
**Starts after:** Phase 3's exit gate passed — the `src/logic` API is frozen and all 9 rule
tests pass. (The agreed API shape from §8.3 must exist before UI wiring begins.)
**Owner (§8.2):** UI developer.

## Goal

Build the playable game as flat, clean HTML/React screens that **read** logic state and
**dispatch** actions — never reimplementing rules (§8.3). When this phase ends, a player can
read a briefing, allocate power each day with a live preview, play all 10 days, and reach a
debrief with a try-again button. The layered scene (Phase 5) layers on top of this; if art
slips, this flat version is the shippable fallback (§7.3).

## Feature IDs covered

- **F1** — Briefing screen + 30-second tutorial.
- **F2** — Daily power allocation (sliders or +/- buttons) with live preview; total ≤ budget.
- **F3** (UI half) — three meters (Air, Food, Crew Safety) + the 10-day loop.
- **F7** — Debrief screen (result, why it happened, try-again).
- **F9** — Plain-language help for terms (dose, shielding, sol), explained in context.

## Task checklist

1. Set up a single state container (`useReducer` or one state object — §8.1) that holds the
   logic state and dispatches to the `src/logic` functions. The UI never recomputes rules.
2. **F1 Briefing + tutorial:** a short screen a 7–12-year-old understands without help — the
   goal, the three meters, the one power budget, 10 days. Short sentences (≤15 words, §7.4).
3. **F2 Allocation controls:** four consumers (Life support, Shield, Greenhouse, Science) with
   their config ranges (§4.1). Show a **live preview** of the day's total vs the day's budget.
   The total **can never exceed** the budget (disable commit / clamp — enforced via
   `validateAllocation`). Unspent power is simply lost (§4.1).
4. **F3 Loop + meters:** render Air / Food / Crew Safety (0–10) with icons beside text (§7.4).
   Show the day number and the day's **forecast** (which may be off by one — §4.1, C5). On
   commit, call `simulateDay`, reveal the real level, advance the day.
5. **F7 Debrief:** on `failed` or `succeeded`, show the result, a plain-language reason
   (gentle, instructive, never scary — §7.4), the science score, and a **try-again** button
   that restarts cleanly.
6. **F9 Term help:** explain each science term once, in context, the first time it appears
   (short tooltip/inline note). Facts come from `src/data/facts.json`; unverified facts do not
   ship (§11.1) — use only verified entries, or defer the fact to Phase 6.
7. Keep the look flat and clean (grey boxes, clear labels). No scene yet.
8. Add light component/interaction tests for the allocation cap and the loop advancing.

## Files created/touched

- `src/ui/*` (screens: briefing, day/allocation, debrief; components: meters, controls, term help)
- `src/App.*` (wires screens + state container to `src/logic`)
- `tests/*` (component/interaction tests for F2 cap and loop)
- plain CSS files for the above

## Guardrails for this phase

- UI **reads** state and **dispatches** actions only; it never reimplements §4 rules (§8.3).
- No new game numbers in UI code — read them from `config.json` via logic (C9).
- Honest labels (§11.3): the forecast is a forecast, not a real forecasting tool; storm values
  shown come from "archived NASA data".
- Accessibility basics start here: large buttons, keyboard operable, visible focus,
  `aria-label` on icon-only controls, never colour alone as a signal (§7.4). Full pass is Phase 7.

## ✅ Exit test gate (must pass before Phase 5)

1. A full **10-day playthrough** works end to end from briefing to debrief.
2. **Both a win and a loss are reachable** with different allocation choices.
3. The allocation total **can never exceed the day's budget** (try to — it is blocked).
4. The try-again button restarts to a clean initial state.
5. `npm test` — component/interaction tests pass; rule tests from Phase 3 still pass.
6. Manual sanity on a normal laptop: no console errors during a full playthrough.

Only when all pass does Phase 5 begin.
