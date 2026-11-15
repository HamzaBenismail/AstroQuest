# SMP Finale — clean project snapshot (2026-11-15)

Prepared from the user-supplied `Archive.zip` for the new `SMP-Finale` branch.

## Removed from the upload

- `node_modules/`: installed dependencies (recreate with `npm ci`).
- `dist/`: compiled output (recreate with `npm run build`).
- `preview-cinematics-standalone.html`, `SMP-menu-style-experiment.html`: standalone design/demo exports.
- `src/data/config.before-reevaluation.json.bak`: a local configuration backup.
- `scripts/review/storm-window-2024-05-08.json`: generated draft; the approved embedded mission and the original DONKI raw records are retained.
- Old Phase 5/6 installation guides, intermediate reevaluation notes, and old per-iteration patch instructions. The latest animation integration guide remains in `docs/`.
- Unneeded `.gitkeep` markers in populated directories.

## Added and maintained

- Root `.gitignore`, `src/data/.gitignore`, `scripts/review/.gitignore`.
- Safe `.env.example` (no API key included).
- Updated README explaining current v4 experience, archived NASA provenance, and commands.
- Updated stale test references that pointed at a missing mission filename and assumed *all* future illustrations would share the legacy scene's viewBox.
- Adjusted a standalone-demo-only check to be optional because the standalone demo is intentionally excluded, and changed a real-storm smoke check so it doesn't assume one hardcoded policy always wins.

## Checks executed

- `npm run check:data`: 10 days and 171 source-traceable event records.
- `npm test`: 13 test files / 76 Vitest tests passing.
- `npm run build`: successful Vite production bundle.
- All available dependency-free `*-node-check.mjs` checks: passing.

The archive deliberately does not include `node_modules/` or `dist/`. Playtest and scientific-content human-review gates remain separate. `CLAUDE.md` is preserved from the existing GitHub repository tree on the new branch, although it was not part of the supplied ZIP.
