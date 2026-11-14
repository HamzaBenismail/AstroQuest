# Junior Astronaut Mission Trainer

A short browser game for kids aged 7-12, built for the NASA Space Apps Challenge 2026
("Build a Junior Astronaut Mission Trainer"). The player commands a 10-day lunar outpost
mission, splitting a limited power budget across life support, a radiation shield, a
greenhouse and science — with real archived NASA space weather data (DONKI) deciding which
days are dangerous. See `CLAUDE.md` for the full design and rules.

## Commands

| Command | Purpose |
|---|---|
| `npm install` | Install dependencies |
| `npm run dev` | Start the local dev server |
| `npm test` | Run the Vitest test suite |
| `npm run build` | Build the static production bundle |
| `npm run prefetch` | Fetch and cache raw NASA DONKI data (requires `NASA_API_KEY` in `.env`) — see Phase 2 |

## Data Sources

_(Filled in during Phase 6 — will list every NASA dataset used, its role, and whether it is
archived or live, matching the in-app Data Sources screen.)_

## Build phases

See `Phases/` for the full sequential build plan from setup to deployed MVP.

## Future work

_(Nice-to-have ideas that are out of MVP scope go here — see CLAUDE.md §9.)_
