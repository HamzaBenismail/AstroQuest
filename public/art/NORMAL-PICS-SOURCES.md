# SMP-NormalPics — verified NASA photo/source ledger

**Scope:** alternative visual treatment for AstroQuest's welcome screen, destination cards, landed-ship backdrop, mission report, and cinematic transitions. No discoveries, NASA datasets, gameplay math, or crew artwork are changed. `SMP-AIpic` is a *separate*, untouched branch for later generated art.

## Rights and commercial-use assessment

These are **not generic stock photos**. We intentionally selected NASA-origin works from NASA pages and NASA's Scientific Visualization Studio (SVS). NASA states its own imagery is *generally not subject to U.S. copyright* and permits factual, non-endorsement uses; SVS explicitly states its visuals are public domain unless otherwise noted. None of the **selected images** includes an identifiable NASA employee, astronaut, NASA insignia, or agency logo **within the selected photo frame**. Source-page site chrome/logos are not part of the asset.

**Important legal distinction:** “public domain / no copyright license required” does **not** mean every use is unrestricted. NASA identifiers are protected separately, its imagery must not imply NASA endorses AstroQuest, and commercial promotions/merchandise can have additional restrictions. Third-party copyrighted content is excluded, and images with recognizable people were avoided. Use the credits below and link this ledger from your published credits page. Review NASA's latest media guidelines before merchandise, ads, or merchandising packages. We are not a legal authority and cannot promise clearance in every country or use case.

Official policies:
- NASA Images and Media Usage Guidelines: https://www.nasa.gov/nasa-brand-center/images-and-media/
- NASA SVS public-domain FAQ: https://svs.gsfc.nasa.gov/help/
- NASA Earth Science imagery reuse FAQ: https://science.nasa.gov/earth/faq/

## Selected images (verified individual source pages)

| ID / placement | Original and creator | Direct image URL (used in CSS) | Source/credit page | Rights basis and credit |
| --- | --- | --- | --- | --- |
| **earth-globe** — title-screen Earth | *Blue Marble from Apollo 17* (Apollo 17, 1972; photo AS17-148-22727) | `https://assets.science.nasa.gov/dynamicimage/assets/science/esd/eo/images/imagerecords/1000/1133/AS17-148-22727_lrg.jpg?crop=faces%2Cfocalpoint&fit=clip&h=1881&w=1881` | https://science.nasa.gov/earth/earth-observatory/the-blue-marble-from-apollo-17-1133/ | Original NASA astronaut photograph, US government work. **Credit: NASA Johnson Space Center / Apollo 17 crew.** |
| **mars-globe** — title-screen Mars | *Mars Planet Globe* (Viking Orbiter mosaic, 2013 NASA page) | `https://assets.science.nasa.gov/dynamicimage/assets/science/psd/mars/downloadable_items/3/7/37983_mars-globe-valles-marineris-enhanced.jpg?crop=faces%2Cfocalpoint&fit=clip&h=4798&w=4798` | https://science.nasa.gov/resource/mars-planet-globe/ | NASA/JPL-Caltech image with no separate third-party copyright marking on the source page. **Credit: NASA/JPL-Caltech.** |
| **saturn** — title-screen ringed planet | *Cassini’s Approach to Saturn* (Feb. 9, 2004) | `https://science.nasa.gov/wp-content/uploads/2023/05/pia05380-saturn-with-rings-16x9-1.jpg` | https://science.nasa.gov/image-detail/pia05380-saturn-with-rings-16x9/ | NASA Cassini image (credited NASA/JPL/Space Science Institute; no separate copyright restriction indicated). **Credit: NASA/JPL/Space Science Institute.** |
| **moon-panorama** — Moon destination, landing, cinematic, reports | *Apollo 17 Landing Site* — panoramic view from NASA SVS item 4302 | `https://svs.gsfc.nasa.gov/vis/a000000/a004300/a004302/panorama_print.jpg` | https://svs.gsfc.nasa.gov/4302/ | NASA SVS explicitly states content is public domain unless otherwise noted; none noted for this image. **Credit: NASA Scientific Visualization Studio (Ernie Wright); Apollo 17 / LRO imagery.** |
| **mars-panorama** — Mars destination, landing, cinematic, reports | *The End of One Drive by Perseverance on the Floor of Jezero Crater* (July 3, 2021 rover panorama) | `https://assets.science.nasa.gov/dynamicimage/assets/science/psd/mars/resources/detail_files/2/6/26064_PIA24744-web.jpg?crop=faces%2Cfocalpoint&fit=clip&h=636&w=1600` | https://science.nasa.gov/resource/the-end-of-one-drive-by-perseverance-on-the-floor-of-jezero-crater/ | NASA/JPL-Caltech rover imagery with no separate copyright restriction indicated. **Credit: NASA/JPL-Caltech.** |

**Verification method:** each image URL was traced from the corresponding NASA source page or its linked image download. Source-page attribution and NASA/SVS reuse policy were checked separately. No non-NASA images from search results were adopted. Site-level and third-party rights still apply as described above.

## Implementation and performance notes

- This branch uses the five **NASA-hosted original image URLs** as CSS backgrounds so it can be reviewed without adding binary files or enlarging the Git repository. The existing illustrated CSS/SVG backdrop is retained *below* each remote photo as a fallback.
- **Remote images have not been packaged locally.** They need a network connection when playing. A temporary outage or changed NASA link reverts the image to the existing artwork. This branch should be treated as a candidate, not an offline-ready shipping build.
- `node scripts/cache-normal-pics.mjs` on a machine with Internet access downloads the same five NASA images to `public/art/normal-pics/` and patches the CSS URLs to local images. Review each downloaded file and its source before merging into production. The script rejects unexpected response types, oversized responses, and missing images. Optional images can be further optimized to WebP for mobile loading.
- The high-resolution Mars globe is the largest candidate. Cache/downsize it before releasing this branch as a mobile-first production site.
- **Do not claim NASA endorsement.** The environment pictures do not imply NASA has validated the game's Mars weather or the simplified radiation / resource values.
- Spacecraft silhouettes, room hatches, UI controls and meters remain interactive SVG/CSS: replacing those with photos would break clarity and functionality.

## Testing and comparison

Compare the current `main` branch with `SMP-NormalPics` on desktop and mobile, inspecting the title screen, Moon and Mars destination cards, the 10-day ship scene, and day reports. Check all captions and accessibility contrast. `SMP-AIpic` remains untouched pending a separate design request.
