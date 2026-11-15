# Science discovery references and real-image credits

This file is intentionally **separate from the player-facing discovery screens**. The game shows short science lessons and a photo credit, but no outbound source links or scientific-review workflow banners. Source records remain internally traceable.

## Educational explanations shown to children

These descriptions are **topic-level educational summaries**, not claims that the child's virtual astronaut produced new NASA findings or that the photographs document the exact OSDR study. The game awards fictitious Research Points. The associated specific OSDR study descriptions remain gated until the team has reviewed the studies directly.

| Discovery ID | Child-friendly learning point | NASA source supporting that general educational explanation | OSDR study catalog reference (requires study-specific team review) |
|---|---|---|---|
| `bio-lettuce` | Lettuce has been grown in an ISS garden using light, water and nutrients, helping scientists learn about fresh food on long missions. | NASA Veggie: https://science.nasa.gov/mission/veggie/ ; NASA Station Science 101: https://www.nasa.gov/missions/station/ways-the-international-space-station-helps-us-study-plant-growth-in-space/ | https://osdr.nasa.gov/bio/repo/data/studies/OSD-267 |
| `bio-mizuna` | Light colors affect plant growth; experiments with leafy greens test how to grow food efficiently in orbit. | NASA Space Gardens: https://www.nasa.gov/missions/station/iss-research/space-gardens/ ; NASA plant-light overview: https://www.nasa.gov/exploration-research-and-technology/growing-plants-in-space/ | https://osdr.nasa.gov/bio/repo/data/studies/OSD-655 |
| `bio-seedlings` | Small plants react to light and gravity; scientists study seedlings to learn how plants grow when gravity is very weak. | NASA Growing Plants in Space: https://www.nasa.gov/exploration-research-and-technology/growing-plants-in-space/ ; NASA Plant Biology program: https://science.nasa.gov/biological-physical/focus-areas/plant-biology/experiments/ | https://osdr.nasa.gov/bio/repo/data/studies/OSD-314 |
| `bio-muscle` | Spaceflight affects muscles and bones; scientists study mice to explore those changes and potential protections. | NASA Rodent Research: https://www.nasa.gov/centers-and-facilities/ames/ames-science/ames-space-biosciences/rodent-research/ | https://osdr.nasa.gov/bio/repo/data/studies/OSD-654 |
| `bio-immunity` | Mice help researchers investigate changes to the brain and immune system during spaceflight. | NASA Rodent Research: https://www.nasa.gov/centers-and-facilities/ames/ames-science/ames-space-biosciences/rodent-research/ ; NASA Space Biology: https://science.nasa.gov/biological-physical/programs/space-biology/ | https://osdr.nasa.gov/bio/repo/data/studies/OSD-751 |
| `bio-ground-radiation` | Laboratories on Earth simulate parts of the space-radiation environment so scientists can study health risks and protection. | NASA Space Radiation Laboratory: https://www.nasa.gov/mission/nasa-space-radiation-lab/ ; NASA Space Radiation: https://www.nasa.gov/directorates/esdmd/hhp/space-radiation/ | https://osdr.nasa.gov/bio/repo/data/studies/OSD-202 |

**Scientific accuracy boundary:** The above NASA sources support the general topics. They do not, by themselves, approve the exact experiment-specific `summary` values in `src/data/discoveries.js`. Leave `verified:false` until the team checks those study pages and records approval. No unverified exact-study conclusion is presented as a finding in the game.

## Photographs shown beside the discoveries

The existing independent file [`DISCOVERY-PHOTO-CREDITS.md`](./DISCOVERY-PHOTO-CREDITS.md) preserves **all six individual photo source pages, direct media URLs, institutional credits, and rights information**. It is the authoritative image-credit ledger. The photos show related NASA/space-biology research, not necessarily the corresponding OSDR investigation.

| Discovery | Image source (photo reference) | Credit |
|---|---|---|
| Space-grown lettuce | https://www.nasa.gov/image-article/harvest-time/ | NASA / ISS Expedition 40 |
| Different lights for space crops | https://science.nasa.gov/image-detail/amf-iss061e014149/ | NASA / ISS Expedition 61 |
| Seedlings and red light | https://science.nasa.gov/biological-physical/investigations/apex-7 | NASA / Kennedy Space Center (related ground testing) |
| Protecting muscles and bones | https://svs.gsfc.nasa.gov/31338/ | NASA Ames Research Center (related rodent research) |
| How spaceflight affects mouse brains | https://svs.gsfc.nasa.gov/31338/ | NASA Ames Research Center (related rodent research) |
| Studying radiation on Earth | https://www.bnl.gov/newsroom/news.php?a=25208 | Image courtesy of Brookhaven National Laboratory |

NASA image and media use: https://www.nasa.gov/nasa-brand-center/images-and-media/

Brookhaven image use: https://www.bnl.gov/newsroom/image-use.php — **check license/permission before bundling or distribution**.

No AI-generated discovery images are used. Photograph loading behavior (bundled local image first, remote URL fallback) is unchanged by this update.

## 26 additional OSDR-indexed discovery topics (Reevaluation D.10)

The underlying NASA repository study IDs were identified via official OSDR listings and study pages. Player descriptions are high-level explanations of the *research topics*, not validated experimental conclusions. Exact methods/results still need team review; all records remain `verified:false`.

| Discovery | NASA study source | Authentic thematic photo and credit |
|---|---|---|
| How plants handle space (`bio-plant-genes`) | https://osdr.nasa.gov/bio/repo/data/studies/OSD-971 | https://science.nasa.gov/biological-physical/investigations/apex-7 — NASA / Kennedy Space Center (related subject, not the exact experiment) |
| Plant roots and DNA marks (`bio-root-dna`) | https://osdr.nasa.gov/bio/repo/data/studies/OSD-625 | https://science.nasa.gov/biological-physical/investigations/apex-7 — NASA / Kennedy Space Center (related subject, not the exact experiment) |
| The walls of plant cells (`bio-root-walls`) | https://osdr.nasa.gov/bio/repo/data/studies/OSD-615 | https://science.nasa.gov/biological-physical/investigations/apex-7 — NASA / Kennedy Space Center (related subject, not the exact experiment) |
| Roots, stems, and leaves (`bio-plant-parts`) | https://osdr.nasa.gov/bio/repo/data/studies/OSD-7 | https://science.nasa.gov/biological-physical/investigations/apex-7 — NASA / Kennedy Space Center (related subject, not the exact experiment) |
| Reading a plant’s instructions (`bio-plant-instructions`) | https://osdr.nasa.gov/bio/repo/data/studies/OSD-217 | https://science.nasa.gov/biological-physical/investigations/apex-7 — NASA / Kennedy Space Center (related subject, not the exact experiment) |
| Growing plants without soil (`bio-water-roots`) | https://osdr.nasa.gov/bio/repo/data/studies/OSD-773 | https://science.nasa.gov/image-detail/amf-iss061e014149/ — NASA / ISS Expedition 61 (related subject, not the exact experiment) |
| Tiny plant research tubes (`bio-plant-tubes`) | https://osdr.nasa.gov/bio/repo/data/studies/OSD-565 | https://science.nasa.gov/biological-physical/investigations/apex-7 — NASA / Kennedy Space Center (related subject, not the exact experiment) |
| Yeast in space (`bio-yeast-genes`) | https://osdr.nasa.gov/bio/repo/data/studies/OSD-58 | https://www.bnl.gov/newsroom/news.php?a=25208 — Image courtesy of Brookhaven National Laboratory (related subject, not the exact experiment) |
| Yeast and weak gravity (`bio-yeast-gravity`) | https://osdr.nasa.gov/bio/repo/data/studies/OSD-598 | https://www.bnl.gov/newsroom/news.php?a=25208 — Image courtesy of Brookhaven National Laboratory (related subject, not the exact experiment) |
| Tiny helpers for radiation research (`bio-yeast-radiation`) | https://osdr.nasa.gov/bio/repo/data/studies/OSD-964 | https://www.bnl.gov/newsroom/news.php?a=25208 — Image courtesy of Brookhaven National Laboratory (related subject, not the exact experiment) |
| How mice keep warm in space (`bio-mouse-warmth`) | https://osdr.nasa.gov/bio/repo/data/studies/OSD-969 | https://svs.gsfc.nasa.gov/31338/ — NASA Ames Research Center (related subject, not the exact experiment) |
| The body’s defense organ (`bio-mouse-spleen`) | https://osdr.nasa.gov/bio/repo/data/studies/OSD-910 | https://svs.gsfc.nasa.gov/31338/ — NASA Ames Research Center (related subject, not the exact experiment) |
| Messages inside the brain (`bio-mouse-brain-signals`) | https://osdr.nasa.gov/bio/repo/data/studies/OSD-916 | https://svs.gsfc.nasa.gov/31338/ — NASA Ames Research Center (related subject, not the exact experiment) |
| When the brain reacts (`bio-brain-inflammation`) | https://osdr.nasa.gov/bio/repo/data/studies/OSD-738 | https://svs.gsfc.nasa.gov/31338/ — NASA Ames Research Center (related subject, not the exact experiment) |
| Genes that help with stress (`bio-stress-gene`) | https://osdr.nasa.gov/bio/repo/data/studies/OSD-457 | https://svs.gsfc.nasa.gov/31338/ — NASA Ames Research Center (related subject, not the exact experiment) |
| Protecting the immune system (`bio-immune-defense`) | https://osdr.nasa.gov/bio/repo/data/studies/OSD-690 | https://svs.gsfc.nasa.gov/31338/ — NASA Ames Research Center (related subject, not the exact experiment) |
| What the liver does in space (`bio-mouse-liver`) | https://osdr.nasa.gov/bio/repo/data/studies/OSD-242 | https://svs.gsfc.nasa.gov/31338/ — NASA Ames Research Center (related subject, not the exact experiment) |
| Tiny helpers in the gut (`bio-gut-friends`) | https://osdr.nasa.gov/bio/repo/data/studies/OSD-417 | https://svs.gsfc.nasa.gov/31338/ — NASA Ames Research Center (related subject, not the exact experiment) |
| Muscles under space-like stress (`bio-muscle-radiation`) | https://osdr.nasa.gov/bio/repo/data/studies/OSD-984 | https://www.bnl.gov/newsroom/news.php?a=25208 — Image courtesy of Brookhaven National Laboratory (related subject, not the exact experiment) |
| Bones and body temperature (`bio-bone-temperature`) | https://osdr.nasa.gov/bio/repo/data/studies/OSD-980 | https://svs.gsfc.nasa.gov/31338/ — NASA Ames Research Center (related subject, not the exact experiment) |
| Cells that defend the body (`bio-killer-cells`) | https://osdr.nasa.gov/bio/repo/data/studies/OSD-812 | https://svs.gsfc.nasa.gov/31338/ — NASA Ames Research Center (related subject, not the exact experiment) |
| Studying one cell at a time (`bio-blood-cells`) | https://osdr.nasa.gov/bio/repo/data/studies/OSD-689 | https://svs.gsfc.nasa.gov/31338/ — NASA Ames Research Center (related subject, not the exact experiment) |
| Fruit flies fight germs (`bio-fly-germs`) | https://osdr.nasa.gov/bio/repo/data/studies/OSD-1 | https://svs.gsfc.nasa.gov/31338/ — NASA Ames Research Center (related subject, not the exact experiment) |
| A tiny astronaut: the fruit fly (`bio-fly-genes`) | https://osdr.nasa.gov/bio/repo/data/studies/OSD-3 | https://svs.gsfc.nasa.gov/31338/ — NASA Ames Research Center (related subject, not the exact experiment) |
| Blood cells and gravity (`bio-human-blood`) | https://osdr.nasa.gov/bio/repo/data/studies/OSD-56 | https://svs.gsfc.nasa.gov/31338/ — NASA Ames Research Center (related subject, not the exact experiment) |
| How germs behave in space-like conditions (`bio-fly-infection`) | https://osdr.nasa.gov/bio/repo/data/studies/OSD-278 | https://svs.gsfc.nasa.gov/31338/ — NASA Ames Research Center (related subject, not the exact experiment) |

These additions reuse *previously sourced genuine photographs* from the existing six research themes. No photographs were generated, and reuse does not imply that a photograph came from the referenced OSDR study. See `DISCOVERY-PHOTO-CREDITS.md` for the original media URLs and any separate reuse restrictions.
