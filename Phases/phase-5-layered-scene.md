# Phase 5 — Layered 2.5D scene

**Hour band (§10):** 13–16 (first playable → polish begins)
**Starts after:** Phase 4's exit gate passed — a full 10-day playthrough works flat, win and
loss reachable, allocation cap enforced, restart works.
**Owner (§8.2):** UI developer + Designer.

## Goal

Add the layered 2.5D scene (C6) on top of the working flat game: stacked transparent images
with CSS parallax, where game state drives what the player sees. Use grey placeholder shapes
first so logic never waits on art (§7.3). When this phase ends, the shield, lights, storm and
night all visibly react to state — and the game still plays perfectly with parallax off.

## Feature IDs covered

- **F5** — Layered scene reacting to state.

## Task checklist

1. Build the scene container in `src/scene`: stacked, same-size transparent layers (e.g.
   1920×1080), max ~7 layers, in the §7.1 order (sky, distant body, far rim, mid terrain,
   outpost modules, effects, foreground rocks), with HTML UI on top.
2. **Placeholders first:** each art layer is its own file referenced by name, starting as a
   grey placeholder shape, so final art swaps in later without touching logic (§7.3).
3. Parallax: write mouse position into a **CSS variable** (not React state, to avoid
   re-rendering the app — §7.3). Each layer moves a different amount.
4. Animate **only `transform` and `opacity`** (§7.3).
5. **State drives visuals** via data attributes / CSS variables, not animation code in logic
   (§7.2):
   - Shield allocation → shield dome visibility.
   - Low power → dimmer habitat lights.
   - Greenhouse power → plants grow.
   - Storm day → reddish overlay **plus a banner naming the real event** from the mission record.
   - Lunar night (days 5–10) → darker sky tint.
   - Low air → pulsing warning on the habitat.
6. The Scene component only **reads** state and applies CSS variables / data attributes — no
   game logic inside it (§8.2, §12).
7. Respect `prefers-reduced-motion`; on touch devices use slow drift or no parallax. The game
   must work with parallax fully disabled (§7.3).
8. Record every placeholder/real asset's license in `public/art/CREDITS.md`; never add an
   asset with an unknown license (§7.3).

## Files created/touched

- `src/scene/*` (scene container, layer components, effect layers)
- `public/art/*` (placeholder layer files) and `public/art/CREDITS.md`
- scene CSS (CSS-variable-driven parallax, reduced-motion media query)

## Guardrails for this phase

- Scene reads state only; no §4 rules in `src/scene` (§8.2, C10 spirit).
- Storm banner names the **real** event from the mission data, labelled as archived NASA data
  (§7.2, §11.3) — never invented.
- Only `transform`/`opacity` animated; mouse → CSS variable, not React state (§7.3).
- No new dependency (no animation library) without asking (§8.1).

## ✅ Exit test gate (must pass before Phase 6)

1. During a playthrough, the scene visibly reacts: shield dome appears with shield allocation,
   lights dim on low power, a storm day shows the red overlay + a banner naming the real event,
   night days are darker, low air pulses.
2. With `prefers-reduced-motion` set (or parallax disabled / on a phone-sized viewport), the
   game is still fully playable and readable.
3. The flat game loop from Phase 4 still passes its exit gate unchanged (scene did not break play).
4. `public/art/CREDITS.md` lists every placeholder asset with a license.
5. `npm test` — existing tests still pass.

Only when all pass does Phase 6 begin.
