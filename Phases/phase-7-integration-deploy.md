# Phase 7 — Integration, polish & deploy

**Hour band (§10):** 18–30 (post feature-freeze: balance, bugs, art, polish, deploy, buffer)
**Starts after:** Phase 6's exit gate passed — 5+ verified cards ship, every dataset is
labelled archived/live, the Data Sources screen renders, and the feature set is now frozen.
**Owner (§8.2):** whole team.

## Goal

Turn the feature-complete build into the finished, deployed MVP. **No new features** — only
bug fixes, balance tuning, copy, real art, accessibility and deployment (§9, §10). When this
phase ends, the game is live at a public URL and meets the full Definition of Done (§13),
playable without bugs on both a laptop and a phone-sized screen.

## Feature IDs covered

Integration, hardening and deployment of the already-built F1–F9. No new feature IDs.

## Task checklist

1. **Balance tuning (paper + playtest):** re-tune on the real storm window. To make it easier
   or harder, change **starting meters and night power first** (§4.4) — all via `config.json`,
   never hardcoded. Confirm no strategy wins every time and no option is free (§4.4). Do **not**
   claim the game is "balanced" unless playtests actually show it (§11.1).
2. **Swap in real art** if ready: replace grey placeholders in `public/art/` by filename, no
   logic changes (§7.3). If art is not ready by ~hour 18, **ship the clean flat version** — that
   is an accepted fallback (§7.3).
3. **Accessibility pass (§7.4):** keyboard operable throughout, visible focus, `aria-label` on
   icon-only controls, never colour alone as a signal, gentle/instructive failure copy, short
   plain sentences. Respect `prefers-reduced-motion`.
4. **Responsive / phone check:** the game must work on a phone-sized screen with parallax off.
5. **Bug fixes** found in integration and playtest.
6. **Deploy** the static site to a public URL (Vercel or Netlify — §8.1). No backend, no
   accounts (C7). Confirm the deployed build makes no NASA calls (C4, §6.2).
7. Finish README (how to play, data sources, dataset explanation) and record any final
   decisions in the §15 Decision Log. Record the accurate `install/dev/test/build/prefetch`
   commands.
8. Final pass of the §14 pre-finish checklist.

## Files created/touched

- `src/data/config.json` — balance tuning values only
- `public/art/*` — real art swapped in (optional, by filename)
- `src/ui/*`, `src/scene/*` — accessibility + responsive fixes, bug fixes (no new features)
- `README.md` — finished
- deployment config (e.g. `vercel.json` / Netlify settings) as needed

## Guardrails for this phase

- **No new features and nothing outside the F1–F9 gate** (§9, §10). Nice-to-haves (N1–N7) go
  under "Future work" in the README, not into the build.
- No frozen concept (C1–C10) changes.
- Honesty labels intact after tuning: game units vs archived NASA data vs ISS-measured (§11.3).
- No secrets committed; no `console.log` left in shipped code (§12).
- Report real test results — do not claim "all tests pass" or "balanced" without running and seeing it.

## ✅ Exit test gate = MVP Definition of Done (§13)

On the **deployed public URL**, a player can, with no bugs, on a normal laptop **and** a
phone-sized screen:

1. Open the site and read the briefing (F1).
2. Play all 10 days with the allocation controls (F2, F3).
3. Meet at least one **real storm event named from a real record** (F4).
4. See the scene react to state (F5).
5. Read at least one **verified** science card (F6).
6. Reach the debrief and use try-again (F7).
7. Open the Data Sources screen; every dataset shows its role and archived/live status (F8).
8. Encounter plain-language help for terms in context (F9).

Then run the full §14 checklist and `npm test` (all rule + component tests green). Report the
actual results. When all of the above hold on the live URL, the MVP is done.
