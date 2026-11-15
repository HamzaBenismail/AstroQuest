# Reevaluation D.11 — Spacecraft Cinematics & Daily Transitions

**Scope:** Visual and interaction updates on top of the working **D.10** project. The simulation engine, NASA DONKI JSON, OSDR discovery catalog, resource costs, room layouts, crew rules, and three menu color schemes remain unchanged.

## What was implemented

### 1. Launch, plume, and landing

On a **valid** `LAUNCH` from Crew Assembly, the existing reducer starts a normal game session, and a temporary visual layer plays:

1. **Flight (1.45 s):** the selected spacecraft flies across the starfield toward the selected Moon/Mars target.
2. **Plume/Smoke (0.95 s):** a cinematic full-screen plume hides the view. This is a **stylized transition** rather than an assertion that smoke persists in the vacuum of space.
3. **Landing (1.55 s):** smoke fades and the selected spacecraft settles onto the landscape; the actual gameplay interface fades in behind the temporary layer.

The same `ship-<id>-sealed.svg` and `<destination>-landscape.svg` artwork already in D.10 is reused. There are no new artwork licensing requirements.

### 2. Weather-dependent day passage

A `COMMIT_DAY` request is validated using the *existing* `previewC3` budget validation and `checkCrewStaffing`. If invalid, the normal error is shown immediately; the animation never runs. If valid:

- **Quiet (level 0):** stable ship, no storm effect.
- **Minor (level 1):** distant storm glow only; no ship shake.
- **Moderate (level 2):** gentle hull shake and modest environmental particles.
- **Severe (level 3):** pronounced but bounded shake and stronger background effects.

**Important scientific distinction:** The intensity is based on that day's *forecast game level*, not a secretly accessed actual NASA storm level. After the animation, the existing `COMMIT_DAY` action executes **once** and the report reveals the actual archived storm record and source IDs. No resource calculation happens during the visual animation. Normal timing is 2.8 seconds, with a visible **Skip animation** control.

### 3. Seamless daily mission log

The report appears as a **left-side panel** sliding and fading inward. A static illustration of the *same* ship stays anchored on the **right-side destination landscape**, preserving continuity with the day passage. On Next day/See results, the left log slides and fades outward for 580 ms before the reducer moves to the next gameplay/final page.

The existing full report content remains: meter deltas, battery, Science, discovery bonuses, forecast versus actual, DONKI labels and IDs, science card, and navigation. The discovery popup is unchanged.

### 4. Win / loss endings

- **Victory:** left-side mission summary with a stylized spacecraft journey toward a graphical Earth on the right.
- **Defeat:** left-side constructive feedback with two slowly drifting halves of the selected spacecraft and small debris on the right. This is **symbolic game imagery** and is explicitly labeled as *not an actual NASA event*; game resource depletion does not establish that the craft really broke apart.

The existing `Try again`, `Discovered`, and `Main menu` actions remain.

### 5. Accessibility, performance and navigation safety

- All moving elements use CSS `transform`/`opacity` for animation. No animation library or backend was added.
- `prefers-reduced-motion: reduce` disables movement and the React interstitials complete immediately; CSS presentation also suppresses ending motion.
- Visible **Skip animation** buttons work for mouse, touch and keyboard. Completion is guarded with a ref so skipping and the normal timer cannot advance the simulation twice.
- Timers are cleared on unmount. Theme toggles from D.10 remain available on report, debrief, gameplay, menu, cargo and assembly screens.
- Ship SVGs and terrain images are reused; no new external assets or runtime network requests.

## Installation into the working D.10 project

**Update-only overlay:** extract `SMP-Reevaluation-D11-cinematics-update-only.zip` at the project root, merging directories. Back up `src/ui/v4/CrewMissionExperience.jsx` first if modified since D.10. Do not overwrite or replace `CLAUDE.md`, `src/data/config.json`, any `src/data/missions/*.json`, `.env`, or existing NASA cards.

The update modifies only `src/ui/v4/CrewMissionExperience.jsx` and adds `src/ui/v4/CinematicScenes.jsx`, `cinematicRules.js`, `cinematics.css`, plus tests and documentation. It requires D.10 (including existing v3 engine and sealed ship SVGs).

```bash
node tests/d11-cinematics-node-check.mjs
node tests/crew-flow-node-check.mjs
node tests/discovery-node-check.mjs
node tests/d10-expanded-discoveries-node-check.mjs
npm test
npm run build
npm run dev
```

You can inspect a **self-contained visual demo** in `preview-cinematics-standalone.html` without npm: open it in a normal local browser, select ship / destination / forecast and press Launch, Run day, Mission log, Win, Lose. This demo uses illustrative sample values; it is not the React game or a real DONKI simulation.

## Verification performed here

- **Passed:** pure cinematic rule tests, source integration guards, source asset references and smoke/launch transitions.
- **Passed:** D.10 dependency-free crew/discovery/cargo/room regressions (Node).
- **Passed:** TypeScript's JSX syntax parser for the modified and added React files; PostCSS parser for new CSS.
- **Passed:** isolated Chromium HTML/CSS/JS visual fixture: Quiet/Minor/Moderate/Severe mapping, skip controls, reduced-motion CSS, plume, landing, report, victory, defeat and 390px mobile screen with no horizontal overflow. Some screenshots are saved alongside the package.
- **Not verified here:** complete React/Vite build, interactive D.10 screen navigation in the user's real checkout, and actual DONKI mission replay. The newest local copy of D.10 in this environment contains only incremental D.10 source overlays; installed React and the v3 engine are not available to run the complete application.

## Mandatory acceptance checks in the real checkout

- [ ] Launch each spacecraft toward Moon and Mars; confirm selected artwork and destination persist into gameplay.
- [ ] During launch, verify the plume covers the screen, fades, and reveals the landed ship before UI fades in; Skip reaches the same initialized state.
- [ ] For each forecast level, confirm zero / distant-only / small / strong shake. Verify actual result and DONKI event labels only appear in the report.
- [ ] Attempt an invalid Energy or staffing plan; confirm an error appears without any animation or day advancement.
- [ ] Verify normal and Skip paths advance exactly one day and research rewards are counted once.
- [ ] Check report appearance/exiting, discovery popup, and every existing control (Next day, Try again, collections, theme selector).
- [ ] Trigger both endings and check the right-side animation and left-side feedback; no source claims about fictional wreckage.
- [ ] Test laptop, phone width, keyboard, and reduced-motion preference.

**Phase 7 remains on hold.** This is an optional animation layer and should be ratified by the team as a change to the frozen UI scope before release.
