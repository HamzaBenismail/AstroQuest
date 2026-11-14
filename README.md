# ORBITAL — Junior Astronaut Mission Trainer (mini-demo)

Small, editable browser game prototype for NASA Space Apps Challenge's **Build a Junior Astronaut Mission Trainer** challenge.

## Run the real React + TypeScript + PixiJS + Zustand version

Requires Node.js 20.19+ or 22.12+ (recommended Node.js 22 LTS).

```bash
npm install
npm run dev
```

Open the local URL printed by Vite (usually http://localhost:5173).

Other commands:

```bash
npm test       # Run simulation tests
npm run build  # Type-check + production bundle
npm run preview
```

If you only want to see the concept without installing anything, open **quick-preview.html** in a browser. That standalone preview uses ordinary HTML/CSS/JavaScript rather than React/PixiJS; the application source in `src/` uses the requested stack.

## Play

1. Click a room in the spacecraft to inspect it.
2. Allocate daily power between Life Support, Communications and Science (+ / - buttons). You have 10 units.
3. Prepare a radiation shelter for 2 extra units if you anticipate a dangerous event.
4. Advance a sol, review the resulting changes, and try to survive 5 sols.
5. A deterministic and dangerous solar event occurs on Sol 3. A warning appears on Sol 2; preparing shielding is essential to survive it. Retry with a different strategy.

## Architecture

- `src/components/ShipScene.tsx`: PixiJS scene, renders `public/ship.svg` as a PixiJS texture plus interactive room hotspots.
- `public/ship.svg`: original vector cutaway of a six-room Mars habitat (editable illustration).
- `src/App.tsx`: React UI panels, allocation controls and mission log.
- `src/store/useMissionStore.ts`: Zustand state and player actions.
- `src/game/simulation.ts`: deterministic, pure TypeScript resource and event logic.
- `src/game/types.ts`: shared typed game state and room information.
- `src/game/simulation.test.ts`: example tests for resource changes and storm shielding.

## Important scientific disclosure

This is a *gameplay prototype*, **not a NASA-calibrated physical simulation**. Oxygen and battery are abstract percentages, and radiation is an invented **gameplay risk score out of 100** (not mSv, Gy, or a validated human-health risk assessment). The Sol 3 event is scripted and **not obtained from DONKI**. Do not label it as actual space weather or measured dosimetry. The next iteration should use authentic datasets with citations and build a defensible mapping from those datasets to gameplay.

Research entry points:
- https://api.nasa.gov/
- https://ccmc.gsfc.nasa.gov/tools/DONKI/
- https://osdr.nasa.gov/bio/repo/
- https://visualization.osdr.nasa.gov/radlab/gui/data-api/

The cutaway illustration and code in this prototype are newly created demonstration assets, not the submitted reference image.
