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

This game uses real NASA open data. Every dataset below is **archived** — downloaded once by
a prefetch script and embedded in the build. **The shipped game never calls NASA from your
browser.** This list mirrors the in-app Data Sources screen.

| Dataset | Role in the game | Status |
|---|---|---|
| **NASA DONKI** (CCMC Database Of Notifications, Knowledge, Information) | Decides which days are dangerous — real solar flares, radiation storms and geomagnetic storms set each day's storm level. | Archived (downloaded once, embedded) |
| **NASA OSDR** (Open Science Data Repository) | Source of the "Real NASA Science" cards — real spaceflight studies behind the facts the game teaches. Each card links its study. | Archived (study pages linked) |
| **api.nasa.gov** | Hub the prefetch script uses to download DONKI data at build time. | Build-time only, never from the browser |

**Not a forecast:** DONKI is a NASA research/archival catalog, not an official forecast. The
U.S. government's official space-weather forecaster is the NOAA Space Weather Prediction
Center. The "forecast" in this game is a simplified game mechanic, not a real prediction.

**Independent project:** This is made for the NASA Space Apps Challenge and is not affiliated
with, endorsed by, or sponsored by NASA.

> Note: the exact CCMC acknowledgement wording on the in-app Data Sources screen is pending
> human verification against CCMC's publication/data policy (see Phase 6 verification).

## Build phases

See `Phases/` for the full sequential build plan from setup to deployed MVP.

## Future work

_(Nice-to-have ideas that are out of MVP scope go here — see CLAUDE.md §9.)_
