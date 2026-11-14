# Phase 6 — Content & attribution

**Hour band (§10):** 16–18 (ends at the ~hour-18 FEATURE FREEZE)
**Starts after:** Phase 5's exit gate passed — the scene reacts to state, reduced-motion /
no-parallax fallbacks work, and the game still plays.
**Owner (§8.2):** Science writer + Data developer.

## Goal

Fill in the verified learning content and the in-app attribution: 5–6 "Real NASA Science"
cards each tied to a real OSDR study a human has checked, plus the Data Sources screen and the
README dataset explanation. When this phase ends, every NASA claim in the app is traceable to
a verified source, and the player can see exactly which datasets are used and whether they are
archived or live. **This phase ends at the feature freeze — after it, only bug fixes, balance,
copy and content changes are allowed (§10).**

## Feature IDs covered

- **F4** (finish) — real event labels shown on screen from real records (wire the Phase 5 banner
  content to the verified mission data).
- **F6** — 5–6 "Real NASA Science" cards, each with a verified study ID and 2 short sentences.
- **F8** — Data Sources screen + README dataset explanation.
- **F9** (finish) — verified facts backing the plain-language term help.

## Task checklist

1. Fill `src/data/cards.json` (schema §6.6) with 5–6 cards. For each card:
   - `title` + `text` = **max two short sentences** a 7-year-old can follow (§6.6, §7.4).
   - `source` = `{ type: "OSDR", studyId: "OSD-###", url }` **copied from a real OSDR study
     page** — never invented or recalled from memory (§6.6, §11.1).
   - Honest phrasing: "scientists studied X in mice", not "NASA found X in astronauts" unless
     the study says so; do not call cards "new discoveries" (§6.6).
   - Set `verified: true` **only after a human opened the study page and checked the claim.**
   - Attach a `trigger` (e.g. `greenhouse-low`, `storm-severe`, `night`) so cards surface in context.
2. Fill `src/data/facts.json` entries used by F9 term help: `{ id, text, sourceUrl, verified }`.
   Each real-world fact (comm delay, lunar night length, etc.) must come from a NASA source and
   be `verified: true` before it ships (§11.1).
3. Build the **Data Sources screen** (F8, §7.5): list each source (DONKI, RadLab if used, OSDR,
   api.nasa.gov, CSA toolkit) with its role and whether it is **archived or live**. Everything
   embedded is "archived NASA data" (§11.3). Add the note that this is an independent project
   and NASA does not endorse it. Use CCMC's acknowledgement wording — **look it up, do not
   invent it** (§7.5). Do not use NASA logos in a way implying official status.
4. README dataset explanation (F8): list every dataset, its role, and archived/live status, so
   the README and the in-app screen agree.
5. Wire the Phase 5 storm banner / event labels to the verified mission event labels (F4).

## Files created/touched

- `src/data/cards.json`, `src/data/facts.json` (now with real, verified content)
- `src/ui/*` — a card component + the Data Sources screen
- `README.md` — dataset explanation section
- CLAUDE.md §15 Decision Log — note any source/wording decisions if needed

## Guardrails for this phase

- **Cards with `verified: false` must not ship** (§6.6). A card without a real, human-checked
  study ID and URL is not shippable.
- Never fabricate study IDs, URLs, flare classes, dose values, or acknowledgement wording (§11.1).
  If something cannot be verified in time, drop the card rather than ship an unverified one.
- Honest labels throughout: real values show their source; game units say "game units";
  embedded data says "archived NASA data"; any ISS reading says "measured on the ISS", never
  "on the Moon" (§11.3).
- This is the freeze boundary: **no new features** here or after (§9, §10) — content only.

## ✅ Exit test gate (must pass before Phase 7)

1. At least **5 cards present and all `verified: true`**; each has a real `studyId` + `url` and
   ≤2 short sentences. (A quick test/lint can assert no `verified: false` card is reachable.)
2. Every embedded dataset is labelled **"archived NASA data"** in the UI; no embedded value is
   shown as "live".
3. The **Data Sources screen renders every source** with its role and archived/live status,
   plus the non-endorsement note and real CCMC acknowledgement wording.
4. The README dataset section matches the in-app screen.
5. No `TODO(VERIFY)` remains hidden in shipped content; no unverified fact appears in the UI.
6. `npm test` — existing tests still pass.

Only when all pass does Phase 7 begin — and the feature set is now frozen.
