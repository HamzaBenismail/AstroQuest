# CLAUDE.md: Junior Astronaut Mission Trainer

> Read this file completely at the start of every session, before writing or changing any code.
> It is the source of truth for scope, rules and data honesty. If the code, a chat message and this file disagree, **stop and ask**; do not pick silently.

---

## 0. How to work in this repo (session routine)

1. Read this file, then `src/data/config.json` and `git log --oneline -15`.
2. Say which feature ID (section 9) you are working on. If the task matches no feature ID, **ask before starting**.
3. Make the smallest change that completes the task. No unrelated refactors, no renaming, no reformatting of files you were not asked to touch.
4. Run the tests (section 12) before saying a task is done.
5. If you are unsure about a fact, a NASA data field, a library API or a number, follow the **Uncertainty protocol** (section 11). Never guess.

---

## 1. Project in one paragraph

A short browser game for **kids aged 7-12**, built by **6 beginners in about 30 hours** for the **NASA Space Apps Challenge 2026** (challenge: "Build a Junior Astronaut Mission Trainer", event 14-15 November 2026). The player commands an outpost for **10 days**. Each day they split a **limited power budget** between life support, a radiation shield, a greenhouse and science. **Real archived NASA space weather data (DONKI)** decides which days are dangerous, so every choice has a real cost and teaches a real constraint of deep space survival. Short "Real NASA Science" cards (from NASA OSDR studies) explain the facts behind events.

**The one lesson the game teaches:** nothing is free. Power spent on one thing is power not spent on another, and space weather is unpredictable, so caution has a price.

**Deliverable:** a working, deployed MVP prototype that demonstrates this trade-off clearly, plus a README and in-app Data Sources screen explaining which NASA datasets are used and why.

---

## 1b. What the challenge brief requires (do not break these)

- Every decision is a genuine trade-off. **No free "safe" choice.**
- **Two or three core resources**, not five or six.
- Ground gameplay in **real NASA open data**; attribute sources **inside the app**.
- **Never present static or embedded data as live.**
- Plain language for ages 7-12; explain jargon in context (dose, shielding, sol).
- Browser-playable, **no download, no account, no backend**.
- Mechanics matter more than visuals. A simple game that teaches a real constraint beats a beautiful one that does not.
- Replayable; failure should teach, not punish.

---

## 2. FROZEN core concepts (do not change without team approval)

These are stable. Do not add, remove, reinterpret or "improve" them on your own. A change needs (a) an explicit instruction from the user in this session and (b) an entry in the Decision Log (section 15).

| # | Frozen concept |
|---|---|
| C1 | **One principal mission**, 10 days, turn-based (one decision round per day). No campaign. |
| C2 | **Three meters:** Air, Food, Crew Safety (each 0-10). **One budget:** Power. Communication is an **event layer**, never a fourth meter. |
| C3 | Four power consumers: **Life support, Shield, Greenhouse, Science.** |
| C4 | **Real storm data drives radiation events**, via prefetched, embedded JSON built from NASA DONKI. |
| C5 | The player sees a **forecast** that can be **off by one level**; the real level is revealed after they commit. |
| C6 | Visuals are a **layered 2.5D scene** (stacked transparent images, CSS parallax). Game logic is plain 2D. |
| C7 | **No backend, no database, no accounts, no multiplayer.** Static site only. |
| C8 | **Honesty labelling:** real values show their source; simplified values are called "game units"; embedded data is called "archived NASA data". |
| C9 | **All game numbers live in one config file**; logic contains no magic numbers. |
| C10 | Game logic is **pure and independent of rendering** (see section 8). |

---

## 3. Status

### Decided
- PixiJS is **removed** from the stack. Do not add it back.
- Data is **prefetched and embedded**; the player's browser never calls NASA.
- MVP scope only (section 9).

### Working assumptions (use them, but do not build irreversible things on them)
- **Destination: the Moon.** Keep it as `site: "moon"` in config. **Do not add Mars-specific content** until the user confirms the destination.
- UI stack: React + Vite is **recommended, to confirm**. If the repo already has a different setup, follow the repo and ask.
- Game logic language: plain JavaScript or TypeScript, **to confirm**. Follow what exists in the repo.

### Open decisions: **do NOT decide these yourself**
| Decision | How it gets settled |
|---|---|
| Moon vs Mars | Test whether the RadLab API (`trajectory=BLEO`) returns real Mars surface data; the team then freezes the choice. |
| Day 0 cargo screen | Only if ahead of schedule. |
| Language support (French / Arabic) | Only after the MVP works. No i18n framework now. |
| Exact storm-level mapping from real events | Decide after inspecting the real raw data (section 6). |
| Real submission deadline | Confirm on the official Space Apps site. |

---

## 4. Game design and rules (version 0.1)

> **Every number below is a GAME UNIT, not a real engineering value.** It is a starting point tuned by playing. All values belong in `src/data/config.json`. Never hardcode them in logic or UI.

### 4.1 Setup (defaults in config)

| Setting | Value |
|---|---|
| Mission length | 10 days |
| Starting meters (max 10) | Air 5, Food 4, Crew Safety 8 |
| Initial "greenhouse yesterday" | 1 |
| Daily power budget | 10 on days 1-4 (sunlit), 7 on days 5-10 (lunar night, a simplification) |
| Allocation ranges | Life support 0-4, Shield 0-3, Greenhouse 0-3, Science 0-3 |
| Allocation rule | Sum of the four allocations must be **<= the day's budget**. Unspent power is simply lost. |
| Storm damage by level | none 0, minor 2, moderate 4, severe 7 |
| Crew air use / day | 3 |
| Crew food use / day | 2 |
| Shield protection per unit | 2 |
| Forecast error | real level +/- 1 (chosen from [-1, 0, 0, +1]), clamped to 0-3 |
| Fail | Any meter <= 0 after a daily update ends the mission |
| Success | Day 10 completed **and** all three meters >= 3 |
| Score | Sum of Science allocations over the mission |

### 4.2 Daily update (exact semantics)

All three meters are computed from the **previous** values, then clamped to 0-10.

```
air    = clamp(air  + lifeSupport - AIR_USE)
food   = clamp(food - FOOD_USE + greenhouseYesterday)
damage = max(0, stormDamage[level] - SHIELD_PROTECTION * shield) + (shield == 0 ? 1 : 0)
safety = clamp(safety - damage + (level == 0 && shield >= 1 ? 1 : 0))
greenhouseYesterday = greenhouse   // used by tomorrow's food update
```

`level` is the **real** storm level of that day (from mission data), not the forecast.
After the update, if any meter <= 0 the mission fails immediately with a reason (which meter).

### 4.3 What was tested and what was not

A quick simulation on **one made-up** 10-day storm sequence showed: every simple fixed strategy failed; a perfect-information player could reach roughly 26/30 science; with a +/-1 forecast error, shielding exactly the forecast survived rarely, while shielding one level above the forecast survived reliably at a science cost. **This was a toy model, not a playtest, and it did not use real DONKI data.** Numbers must be re-tuned on paper and by playtesting with real storm windows. Do not claim the game is "balanced".

### 4.4 Design rules for tuning (never violate)
- No strategy may win every time. No option may be free.
- A player should be able to feel regret ("I should have shielded").
- To make the game easier or harder, change **starting meters and night power first**.
- Do not add a 4th meter, a water meter, a separate pressure meter or more consumers. "Air" represents oxygen and pressure together; pressure is explained in a learning card only.

---

## 5. The five functions of the brief and their role in the game

| Function | Role in the game | Real data behind it |
|---|---|---|
| Power management | **The budget** and the source of every trade-off | None (game units); lunar night explains lower power |
| Life support | **Air meter** | OSDR cards only (for example ISS water processor study); game units |
| Radiation shielding | **Crew Safety meter**, the star of the game | **DONKI** storms; **RadLab** dose reading as baseline |
| Food production | **Food meter**; greenhouse costs power now, pays back food tomorrow | OSDR plant studies; CSA food toolkit (link and paraphrase) |
| Communication delay | **Event layer** only: storm blackouts, "Mission Control answers late" line | Follows from distance and the speed of light; storms link to DONKI |

---

## 6. Data: sources, pipeline, honesty rules

### 6.1 Sources and roles

| Source | Role | Notes |
|---|---|---|
| **DONKI** (NASA CCMC space weather) | Core. Storm days per mission window. | Flares (FLR), SEP, CME, GST. "Prototyping quality, as-is"; not an official forecast source. The app must never look like a real forecasting tool. |
| **RadLab** (OSDR dosimetry) | Optional "real reading" baseline on the HUD. | Mostly **ISS** (low Earth orbit). Label as "measured on the ISS". Never present as Moon or Mars surface. Mars surface data may exist via `trajectory=BLEO` (**untested**). |
| **OSDR** studies | 5-8 "Real NASA Science" cards. | Chosen by hand; study ID shown on every card. |
| api.nasa.gov | Hub for DONKI, OSDR, APOD, Image Library, EPIC. | Personal API key required (DEMO_KEY: 30 req/hour and 50 req/day per IP). |
| Mars Trek | At most one screenshot, only if Mars is chosen. | No live tiles. |
| CSA food toolkit | Content for the greenhouse card. | Link and paraphrase; do not copy text. |

### 6.2 Pipeline (the only allowed data flow)

```
NASA APIs -> scripts/prefetch (run by ONE person, key from env) -> raw JSON (scripts/raw/)
          -> cleaner -> src/data/missions/<id>.json -> game logic -> scene + UI
```

- **The player's browser never calls NASA.** No live fetches in the shipped app. (An optional "Today's Mission" mode is a nice-to-have, must keep the embedded fallback, and must be clearly labelled live.)
- The API key lives **only** in an environment variable (`NASA_API_KEY`) read by the prefetch script. **Never commit a key. Never put a key in front-end code.** Keep `.env` in `.gitignore`.
- Commit small raw samples in `scripts/raw/` so everyone can inspect real response shapes.

### 6.3 Known endpoint facts and unknowns

- DONKI web app and API **migrated on 30 September 2026**. Paths after `/DONKI/` are unchanged; replacing `kauai.ccmc.gsfc.nasa.gov` with `ccmc.gsfc.nasa.gov` in old links should work. **Test both** `api.nasa.gov/DONKI/...` and the `ccmc.gsfc.nasa.gov` host and use whichever responds. Parameters: `startDate`, `endDate` (YYYY-MM-DD), plus `api_key` on api.nasa.gov.
- Event types: `FLR`, `SEP`, `CME`, `GST` (and others exist). Main catalog is analysed by NASA's Moon-to-Mars Space Weather Analysis Office from June 2020; prefer windows after that date.
- RadLab: GET `https://visualization.osdr.nasa.gov/radlab/api`. Fields include `absorbed_dose_rate` (microGy/hour), `dose_equivalent_rate` (microSv/hour), `flux`. Timestamps and instrument IDs are **case-sensitive**; spaces must be `%20`; do not mix key-value and boolean query styles; keep time windows **short** (ISS data can be huge). RadLab dates may not overlap DONKI windows, so it is a baseline, not same-day data.
- OSDR search endpoint (`https://osdr.nasa.gov/osdr/data/search?term=KEYWORD`): **untested** by the team.
- **Never assume field names or value formats in NASA responses.** Open the raw sample in `scripts/raw/` and read the real fields before writing any mapper or type.

### 6.4 Storm levels (gameplay simplification, say so in the app)

Four levels: **0 none, 1 minor, 2 moderate, 3 severe.** Intended mapping: C-class flare -> minor, M-class -> moderate, X-class or a solar energetic particle event -> severe. **The exact mapping is an open decision**: confirm it against the real data in `scripts/raw/` before implementing, and document the final mapping in the Decision Log.

### 6.5 Mission data schema (target schema we control)

```json
{
  "missionId": "storm-window-a",
  "title": "Short kid-friendly title",
  "site": "moon",
  "dataSource": "NASA DONKI (archived data)",
  "window": { "start": "YYYY-MM-DD", "end": "YYYY-MM-DD" },
  "days": [
    {
      "day": 1,
      "date": "YYYY-MM-DD",
      "stormLevel": 0,
      "events": [ { "type": "FLR", "label": "Real solar flare, class M5.2", "sourceId": "<ID copied from the DONKI record>" } ]
    }
  ]
}
```

- Event labels shown to players must be generated **from the real record**, never typed from memory.
- A mission window must contain exactly the mission's day count (default 10).
- Plan for 1-3 windows: one stormy, optionally one calm. Choose them from what the data really contains; do not assume a famous date has data without checking.

### 6.6 Learning cards schema

```json
{
  "id": "card-greenhouse-1",
  "trigger": "greenhouse-low | storm-severe | night | ...",
  "title": "Short title",
  "text": "Maximum two short sentences a 7-year-old can follow.",
  "source": { "type": "OSDR", "studyId": "OSD-###", "url": "https://..." },
  "verified": false
}
```

- `studyId` and `url` must be **copied from a real OSDR study page**, never invented or recalled from memory.
- Set `verified: true` only after a human opened the study page and checked the card's claim.
- **Cards with `verified: false` must not ship.**
- Phrase honestly: "scientists studied X in mice", not "NASA found X in astronauts" unless the study says so. OSDR "release date" is when data was published, not when research happened; do not call cards "new discoveries".

---

## 7. UI and visuals

### 7.1 Layered scene (C6)
A container with stacked, same-size transparent images (for example 1920x1080 WebP or PNG). Each layer moves a different amount on mouse move (parallax). Maximum about 7 layers.

| # | Layer | Movement | Reacts to state |
|---|---|---|---|
| 0 | Starry sky | none / very slow | no |
| 1 | Earth or Sun in the distance | tiny | storm glow |
| 2 | Far hills / crater rim | small | no |
| 3 | Mid terrain | medium | night tint |
| 4 | **Outpost modules** (interactive) | medium | **yes** |
| 5 | Effects: shield dome, storm glow, dust | medium | **yes** |
| 6 | Foreground rocks | fast | no |
| UI | HTML controls on top | none | reads state |

### 7.2 State drives visuals (via data attributes or CSS variables, not animation code in logic)
Shield allocation -> dome visibility. Low power -> dimmer lights. Greenhouse power -> plants grow. Storm day -> reddish overlay plus a banner naming the **real** event. Lunar night -> darker sky. Low air -> pulsing warning on the habitat.

### 7.3 Technical rules
- Animate **only `transform` and `opacity`**.
- Write mouse position into a **CSS variable**, not React state, to avoid re-rendering the whole app.
- Touch devices: slow automatic drift or no parallax. The game must work without parallax.
- Respect `prefers-reduced-motion`.
- **Placeholders first:** every art asset is its own file referenced by name, so grey placeholder shapes can be swapped for final art without touching logic.
- Plan 8-12 art files. **Check the license of every asset** and record it in `public/art/CREDITS.md`. Never add an asset with an unknown license.
- Fallback: if art is not ready by about hour 18, ship the clean flat version.

### 7.4 Writing and accessibility (kids 7-12)
- Short sentences (aim for 15 words or fewer), plain words, icons beside text.
- Explain each science term once, in context, the first time it appears.
- Failure is gentle and instructive ("The crew needed more air. Try giving life support more power."), never scary or graphic.
- Large buttons, keyboard operable, visible focus, `aria-label` on icon-only controls, never color alone as the only signal.
- English UI for the MVP. Do not add an i18n framework.

### 7.5 Attribution (required in the app)
A **Data Sources screen** listing each source, its role, and whether it is archived or live. A note that this is an independent project and NASA does not endorse it. Use acknowledgement wording from CCMC's publication policy (look it up; do not invent it). Do not use NASA logos in a way that implies official status; follow the Space Apps brand guidelines.

---

## 8. Architecture and stack

### 8.1 Stack
- **No PixiJS, no Three.js, no Phaser, no Redux, no backend framework, no database.** Do not add them. Ask before adding **any** new dependency and justify it in one sentence.
- Recommended (confirm with the repo): Vite + React, plain CSS (Tailwind only if the team already uses it), `useReducer` or a single state object, Vitest for rule tests, Vercel or Netlify hosting.
- Rule of thumb: use a tool only if at least two team members have used it before.

### 8.2 Folders and ownership

```
/src/scene      Scene component, layers, effects          (UI developer)
/src/ui         Screens, controls, meters, tutorial       (UI developer)
/src/logic      Pure game rules, no UI imports            (Game logic developer)
/src/data       config.json, missions/*.json, cards.json  (Data developer / Science writer)
/public/art     Layer images + CREDITS.md                 (Designer)
/scripts        Prefetch + cleaning scripts, raw/ samples (Data developer; API key via env)
/tests          Rule tests
```

Do not edit another owner's folder for an unrelated task. If a task needs it, say so.

### 8.3 Logic contract (C10)
- `src/logic` imports **nothing** from React, the DOM, `src/scene` or `src/ui`.
- Functions are **pure**: no `Date.now()`, no `Math.random()`, no network, no mutation of inputs. Randomness (forecast error) comes from an **injected seeded RNG** so results are reproducible and testable.
- Suggested core API (adapt names to the repo, keep the shape):
  - `createInitialState(config, mission)`
  - `validateAllocation(allocation, day, config)` -> `{ ok, reason }`
  - `makeForecast(day, mission, rng, config)` -> forecast level
  - `simulateDay(state, allocation, mission, config)` -> new state with status `running | failed | succeeded` and, if failed, the reason
  - `scoreMission(state)` and `buildDebrief(state, mission)`
- The UI **reads** state and **dispatches** actions. It never reimplements rules.

---

## 9. Features (MVP gate)

**Only the features below may be built.** Anything else is out of scope until the user says otherwise.

### Must have (MVP)
| ID | Feature | Done when |
|---|---|---|
| F1 | Briefing screen with 30-second tutorial | A new player understands the goal without help |
| F2 | Daily power allocation (sliders or +/- buttons) with live preview | Total can never exceed the day's budget |
| F3 | 10-day loop with three meters | Rules from section 4 work; both win and lose are reachable |
| F4 | Real storm events from DONKI with one-day forecast | At least one real window embedded; events named on screen from real records |
| F5 | Layered scene reacting to state | Shield, lights, storm overlay change with state |
| F6 | 5-6 "Real NASA Science" cards | Each has a verified study ID and 2 short sentences |
| F7 | Debrief screen | Result, why it happened, try-again button |
| F8 | Data Sources screen and README dataset explanation | Every dataset listed with role and archived/live status |
| F9 | Plain-language help for terms (dose, shielding, sol) | Explained in context, short |

### Nice to have (only if ahead, and only on explicit request)
N1 second storm window (replay) · N2 Day 0 cargo screen · N3 communication blackout and "Mission Control answers late" event · N4 RadLab baseline on the HUD · N5 browser read-aloud · N6 a couple of sound effects, printable debrief · N7 optional "Today's Mission" with embedded fallback.

### Out of scope (do not build, do not suggest mid-task)
Multiplayer, accounts, backend or database, 3D, AI chatbot, native mobile app, a second destination, more than three meters, an in-game shop or economy, a campaign.

**Feature gate procedure:** if you think something is missing or worth adding, do **not** implement it. Write it as a one-line suggestion under "Future work" in the README or tell the user, then continue with the assigned task.

---

## 10. Timeline context

About 30 hours total: hours 0-2 setup and decisions; 2-5 paper balance and data tests; 5-13 parallel build; 13-17 first playable and outside playtest; **about hour 18 FEATURE FREEZE**; 18-25 balance, bugs, real art, polish; 25-29 deploy, demo video, README, slides; 29-30 buffer and submission.
After the freeze: **bug fixes, balance, copy and content only**. No new features.

---

## 11. Anti-hallucination and uncertainty protocol

### 11.1 Never fabricate
- NASA numbers, dates, event names, flare classes, dose values, study IDs, URLs, API field names, rate limits, or mission facts.
- Library or framework APIs. Check the installed version in `package.json` and the types or docs in `node_modules` before using an API; do not invent props or functions.
- Asset licenses or attributions.
- Test results or balance claims. Do not say "this is balanced" or "all tests pass" unless you ran them and saw it.
- Real-world facts in UI text (for example communication delay times, lunar night length). Each such fact must come from a NASA source recorded in `src/data/facts.json` as `{ "id", "text", "sourceUrl", "verified" }`. Unverified facts do not ship.

### 11.2 When you do not know
1. Look in the repo (this file, `config.json`, `scripts/raw/`, existing code).
2. If it is about NASA data, read the raw sample responses.
3. If still unknown, **stop and say so**. In code, leave `// TODO(VERIFY): <what is unknown>` and tell the user. Do not fill the gap with a plausible guess.

### 11.3 Real vs simplified (labelling rules, C8)
| Kind | Label |
|---|---|
| Value taken from a NASA record | Show source next to it ("Real data: NASA DONKI") |
| Value we invented or simplified | "game units" / "simplified for the game" |
| Embedded dataset | "archived NASA data", never "live" |
| ISS radiation reading | "measured on the ISS", never "on the Moon/Mars" |

### 11.4 Conflict handling
If a request conflicts with a frozen concept (section 2) or the MVP gate (section 9), **say so and ask**. Do not comply silently and do not refuse silently.

---

## 12. Coding conventions and testing

- Small, reviewable commits. Prefix messages with the feature ID: `F3: apply storm damage with shield protection`.
- One concern per change. Keep diffs minimal; do not rewrite whole files to change a few lines.
- Config-driven: if you type a game number in logic or UI code, move it to `config.json`.
- No secrets in the repo. No `console.log` left in shipped code.
- Keep components small; the Scene component only reads state and applies CSS variables or data attributes.
- Commands (scaffolded in Phase 1, keep accurate): `install: npm install`, `dev: npm run dev`, `test: npm test`, `build: npm run build`, `prefetch: npm run prefetch`.

### Required rule tests (write first or alongside the logic)
1. An allocation whose sum exceeds the day's budget is rejected.
2. Air: `air + lifeSupport - 3`, clamped to 0-10.
3. Food: `food - 2 + greenhouseYesterday`; on day 1 the previous greenhouse equals the config initial value.
4. Damage examples: severe level with shield 3 -> damage 1; severe with shield 0 -> damage 8; calm with shield 0 -> damage 1; calm with shield >= 1 -> +1 Safety recovery, capped at 10.
5. Any meter <= 0 after an update -> status `failed` with the meter named.
6. Success only when day 10 is completed and all meters >= 3.
7. Same seed -> same forecast sequence; forecast is always within 0-3 and within 1 of the real level.
8. Changing a value in config changes outcomes (nothing hardcoded).
9. Mission data validation: correct number of days, valid storm levels, every event has a `sourceId`.

---

## 13. Definition of done

**A task is done when:** it implements exactly the assigned feature, tests pass, nothing outside scope changed, labels follow section 11.3, and no `TODO(VERIFY)` was hidden.

**MVP is done (target: hour 20)** when a player can: open the site, read the briefing, play all 10 days with the allocation controls, meet at least one **real** storm event named from a real record, see the scene react, read at least one verified science card, reach the debrief, restart, and open the Data Sources screen, **all without bugs on a normal laptop and on a phone-sized screen**, deployed to a public URL.

---

## 14. Quick pre-finish checklist (run mentally before replying)

- [ ] Did I stay inside the assigned feature ID and the MVP gate?
- [ ] Did I avoid changing any frozen concept (C1-C10)?
- [ ] Are all numbers in `config.json`, none hardcoded?
- [ ] Is logic pure and free of UI imports?
- [ ] Is every real-world fact or NASA value traceable to a source file, or marked `TODO(VERIFY)`?
- [ ] Are real vs simplified vs archived labels correct?
- [ ] No secrets, no new dependency without asking, no banned library?
- [ ] Did I run the tests and report the actual result?

---

## 15. Decision log (append only; newest last)

| Date | Decision | By |
|---|---|---|
| 2026-11-14 | One principal mission; MVP only | Team |
| 2026-11-14 | Three meters + power budget; communication as events | Team |
| 2026-11-14 | PixiJS removed; layered 2.5D scene with CSS parallax | Team |
| 2026-11-14 | Data prefetched and embedded; no NASA calls from the browser | Team |
| 2026-11-14 | Working assumption: Moon (not frozen) | Team |
| (next) | Moon vs Mars frozen after RadLab test | to fill |
| 2026-11-14 | Storm-level mapping confirmed against real DONKI data (Phase 2): per day, `stormLevel = max` of: flare class (C→1 minor, M→2 moderate, X→3 severe), any SEP event that day →3 severe, GST geomagnetic storm by max Kp that day (Kp 5-5.99→1, Kp 6-7.99→2, Kp ≥8→3, using NOAA's standard Kp/G-scale thresholds). CME events are recorded in `scripts/raw/` but not used to drive `stormLevel` (arrival/impact not verified). First mission window: `gannon-storm-2024`, 2024-05-01 to 2024-05-10, built from the real May 2024 "Gannon" storm (GST reached Kp 9 on day 10/2024-05-10) — genuinely severe almost every day (levels 2-3, no calm day in this window); a calmer second window is deferred (nice-to-have N1). | Data developer |
| 2026-11-14 | §4.1 edge case resolved (Phase 3): if day 10 completes with no meter ever ≤0, but not all three meters are ≥3 (the explicit success bar), the outcome is `status: "failed"` with `reason: "objectives-not-met"` — distinct from a meter-depletion failure, but still a failure, since §4.1 frames Fail/Success as the only two outcomes and the success bar is explicit. The frozen status enum (`running\|failed\|succeeded`, §8.3) is unchanged — no third state was added. | Game logic developer |
| 2026-11-14 | **Balance finding, flagged for Phase 7 playtest, not acted on now:** under the current `config.json` values, `status: "succeeded"` is mathematically unreachable on the real `gannon-storm-2024` mission. Verified with the engine: the best possible defense (shield maxed at 3, its config ceiling, every day) still only holds final Crew Safety at 2 (needs ≥3), because this real window has zero calm (`stormLevel: 0`) days — so the §4.2 safety-recovery bonus (`level==0 && shield>=1 → +1`) never triggers, and shield's max value cannot fully cancel severe (level-3) damage (`stormDamage[3]=7` vs max absorption `shieldProtection(2)*shield(3)=6`). This is honest real-data behavior, not a bug — Phase 3's rule tests therefore use a synthetic fixture mission (`tests/helpers/fixtures.js`) to prove the engine can reach `succeeded`, while the real mission is left untouched. Phase 7 should decide whether to raise starting Crew Safety, raise the shield cap/`shieldProtection`, or fetch a second calmer window (N1) — per §4.4, start with starting meters / night power. | Game logic developer |

---

## 16. Glossary (use these words consistently)

- **Mission:** one 10-day playthrough on one storm window.
- **Day / turn:** one allocation round.
- **Meters:** Air, Food, Crew Safety.
- **Power budget:** units available that day.
- **Consumers:** Life support, Shield, Greenhouse, Science.
- **Storm level:** 0 none, 1 minor, 2 moderate, 3 severe (gameplay simplification of real events).
- **Forecast:** the warning shown before the player commits; may be off by one level.
- **Game units:** simplified invented numbers, not real engineering values.
- **Real NASA Science card:** short learning card tied to a verified OSDR study.
- **Archived data:** real NASA data downloaded once and embedded; not live.
