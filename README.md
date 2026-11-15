# AstroQuest — Junior Astronaut Mission Trainer

**Build your spacecraft. Lead your crew. Explore beyond Earth.**

**AstroQuest** is a browser-based space exploration and resource-management game for children aged **7–12**, created for the **NASA Space Apps Challenge 2026** challenge, *Build a Junior Astronaut Mission Trainer*.

Instead of learning about space missions only by reading, players get to make the decisions: who works where, how much Energy each department receives, what supplies to pack, and how to prepare for an uncertain space-weather forecast. Every choice has consequences—and every mission offers another chance to learn.

## The adventure

1. **Choose your spacecraft.** Pick one of four ship designs with different internal department arrangements.
2. **Pack your cargo.** Select a Moon or Mars-themed destination and divide limited storage between Air, Supplies, and batteries.
3. **Assemble a crew.** Choose up to six astronauts, each with a distinct color and specialty.
4. **Manage the outpost.** Drag or tap astronauts into matching departments, distribute Energy, and keep Air, Supplies, and Crew Safety above critical levels.
5. **Plan ahead.** Review an imperfect one-day storm forecast, save Energy, request advice from Earth, improve rooms, and send expeditions.
6. **Make discoveries.** Power the Science Lab with the right specialist to unlock space-biology topics and bonus Research Points.
7. **Finish your mission.** After ten days, see how your strategy worked and try a different approach.

### Meet the departments

| Department | Responsibility |
| --- | --- |
| **Life Support** | Maintains breathable Air and supports crew recovery. |
| **Greenhouse** | Grows food that contributes to the game's combined Supplies resource. |
| **Power Station** | Generates Energy and manages battery storage. |
| **Science Lab** | Earns Research Points and unlocks scientific discoveries. |
| **Storm Shelter** | Protects crew readiness during dangerous space-weather events. |
| **Communications** | Sends requests to Earth and receives contextual mission advice. |

Only staffed departments consume allocated working Energy, so players must decide where their crew and power will be most useful. Research Points can improve rooms over multiple levels, while recovery actions and expeditions offer different ways to handle setbacks.

## Real science behind the game

AstroQuest uses NASA resources to turn authentic space-science topics into age-appropriate decisions and discoveries:

- **[NASA DONKI — Space Weather Database](https://ccmc.gsfc.nasa.gov/tools/DONKI/)** supplies archived solar-flare and space-weather records for the ten-day scenario. The game translates them into simplified storm levels and an uncertain forecast.
- **[NASA Open Science Data Repository (OSDR)](https://osdr.nasa.gov/bio/repo/)** provides research references for **32 collectible space-biology topics**, including growing plants in space, muscles and bones, microorganisms, immune health, and radiation biology.
- **[NASA Open APIs](https://api.nasa.gov/)** was used to retrieve archived data during development. The game works with bundled data and does **not** require a live NASA connection during play.

Collected discoveries include short explanations for children and photographs of related real research. The collection persists between missions on the same browser.

**Important scientific distinction:** Energy, Air, Supplies, Crew Safety, Research Points, expeditions, and storm severity are **simplified game mechanics**, not operational NASA measurements or radiation doses. The Moon scenario draws on historical DONKI records; the Mars option currently uses the same abstract events as a **visual training scenario**, not a validated Martian weather model. Specific interpretations of some OSDR studies still require scientific review.

### Scientific and image credits

We acknowledge the **Community Coordinated Modeling Center (CCMC) at Goddard Space Flight Center** for the use of DONKI.

- [Discovery studies and scientific references](public/art/DISCOVERY-REFERENCES.md)
- [Real photograph sources and credits](public/art/DISCOVERY-PHOTO-CREDITS.md)
- [Original illustration credits](public/art/CREDITS.md)
- [Crew art credits](public/art/CREDITS-CREW.md)

Scientific photographs illustrate related topics; they do not necessarily depict the exact linked OSDR study.

## Designed for young explorers

The interface uses colorful astronauts, matching department icons, interactive spacecraft rooms, and immediate visual feedback. Players can choose among **Classic**, **Playful**, and **Classic + Stars** themes.

Animated launches, landings, space-weather events, and mission endings give the game an adventure feel. Animations are skippable, reduced-motion preferences are respected, and room placement can be completed without dragging.

AstroQuest encourages **curiosity, strategic thinking, teamwork, problem-solving, and responsible resource management**—including learning why preparation matters when a plan does not work.

## Play locally

Requires **Node.js 20.19+ or 22.12+** and npm.

```bash
git clone https://github.com/HamzaBenismail/AstroQuest.git
cd AstroQuest
npm ci
npm run dev
```

Open the local address printed by Vite. To validate the bundled NASA records, run tests, or build the project:

```bash
npm run check:data
npm test
npm run build
```

The game runs in a browser without accounts, a backend, or a NASA API key.

**Built with:** React, JavaScript, Vite, HTML/CSS, SVG illustrations, and Vitest.

## Acknowledgments

**Claude (Anthropic) and ChatGPT (OpenAI) assisted our team with coding**, including implementation suggestions, debugging, testing support, and improvements to source code and documentation. The team directed and reviewed the work and remains responsible for the final design, code, scientific claims, and submission.

Their assistance does not imply sponsorship or endorsement by Anthropic or OpenAI.

---

*AstroQuest is an independent educational prototype. It is not an official NASA product or endorsed by NASA.*
