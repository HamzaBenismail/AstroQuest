# SMP — Junior Astronaut Mission Trainer

Browser-based, turn-based space-outpost resource management game for children aged approximately 7–12. Built for the NASA Space Apps Challenge 2026, **Build a Junior Astronaut Mission Trainer**.

## What's in this branch

- Choose among four spacecraft shapes and the Moon/Mars *visual training scenes*.
- Prepare a limited cargo loadout, choose up to six astronauts, and assign them to color-matched rooms.
- Allocate Energy, maintain Air / Supplies / Crew Safety (all simplified **game units**), recover, upgrade rooms with earned Research Points, contact Earth, and send expeditions.
- View a fallible one-day storm forecast and play through ten days using an **archived NASA DONKI** event window.
- Unlock a persistent collection of 32 space-biology discovery entries with specialist-only bonuses. See `public/art/DISCOVERY-REFERENCES.md` and `public/art/DISCOVERY-PHOTO-CREDITS.md` for study/image provenance. Some study-specific claims still require scientific sign-off.
- Optional themes: Classic, Playful, Classic + Stars; skippable cinematics and reduced-motion support.
- Phase 3, Reevaluation B/C, and flat UI fallbacks remain available in `src/` for regression and rollback.

**Scientific honesty:** Archived DONKI events drive abstract gameplay storm severity, **not** measured radiation doses at the Moon or Mars. The Mars selection is a visual training variant using the existing archived event dataset, **not** a validated Mars surface weather model. Earth message-processing delays and expeditions are gameplay abstractions. Biological study claims have an internal review gate.

## Local development

Requires Node.js supported by Vite 7 (Node 20.19+ or 22.12+), and npm.

```sh
npm ci
npm run check:data
npm test
npm run build
npm run dev
```

Open the URL printed by Vite. The `src/data/config.json` in this release enables the crew UI and v3 gameplay. `npm run check:data` verifies the archived DONKI event lineage from `scripts/raw/`.

If you want to download fresh source data *during development only*, copy `.env.example` to `.env`, insert a key from <https://api.nasa.gov/> and run `npm run prefetch`. **The browser never calls the NASA API, and API keys must not be committed.** Preserve the approved storm mapping and original source IDs. The current mission is `src/data/missions/storm-window-2024-05-08.json`.

## Project structure

| Folder | Purpose |
| --- | --- |
| `src/ui/v4/` | Current interactive crew, discovery, and cinematic experience |
| `src/logic/v4/` | Pure crew/discovery rules |
| `src/logic/v3/` | Pure resource/upgrade/expedition simulator |
| `src/data/` | Approved configuration, embedded mission, and catalog |
| `public/art/` | SVG illustrations, original asset credits, photo/source references |
| `scripts/` | Developer-side offline import, data validation, opt-in migrations |
| `tests/` | Vitest and dependency-free smoke tests |
| `docs/` | Current implementation history and release notes |

## AI-assisted coding acknowledgment

**Claude (Anthropic) and ChatGPT (OpenAI) assisted our team with coding** during development of this project, including implementation suggestions, debugging, testing support, and code/documentation improvements. The project team directed the work, integrated and reviewed the contributions, and is responsible for the final code, design decisions, scientific claims, and submission.

Their assistance does not imply that Anthropic or OpenAI sponsors or endorses this project.

## Release & cleanup notes

The submitted archive has been cleaned: dependencies (`node_modules/`), build output (`dist/`), backup configuration, local draft review data, standalone experiment previews, and obsolete intermediate installation notes are excluded. `.gitignore` also prevents those from being accidentally re-added. `package-lock.json`, real archived NASA records, attribution/source documents, and tests are **retained**.

This is a prototype, not an official NASA product or NASA-endorsed software. Attribution appears in the game and in the public source documentation.
