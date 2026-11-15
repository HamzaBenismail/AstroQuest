import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import catalog from '../src/data/discoveries.js';
import { validateDiscoveryCatalog, discoveryPresentation } from '../src/logic/v4/discoveries.js';

const app = readFileSync('src/ui/v4/CrewMissionExperience.jsx','utf8');
const ui = readFileSync('src/ui/v4/DiscoveryUI.jsx','utf8');
const css = readFileSync('src/ui/v4/crew-ui.css','utf8');
const discoveryCss = readFileSync('src/ui/v4/discovery-ui.css','utf8');
const refs = readFileSync('public/art/DISCOVERY-REFERENCES.md','utf8');
const photoCredits = readFileSync('public/art/DISCOVERY-PHOTO-CREDITS.md','utf8');
assert.equal(validateDiscoveryCatalog(catalog), true);
assert.equal(catalog.length, 32);
for (const entry of catalog) {
  assert.equal(entry.verified,false,'Do not override the manual study-review gate');
  const description=discoveryPresentation(entry).description;
  assert.equal(description,entry.publicSummary);
  assert.equal(discoveryPresentation({...entry,verified:true}).description,description,'Review status must not replace child-friendly copy');
  assert.ok(description.length>=125 && description.length<=310,`${entry.id}: informative but age-appropriate length`);
  assert.ok((description.match(/[.!?](?:\s|$)/g)||[]).length>=2,`${entry.id}: explain the topic in at least two sentences`);
  assert.ok(!/^(?:Explore|See|Learn|Discover|Find out)\b/i.test(description),`${entry.id}: no vague command in place of an explanation`);
  assert.ok(/(helps?|could|can|learn|scientists|studies|study|understand|research)/i.test(description),`${entry.id}: show learning value`);
  assert.ok(refs.includes(entry.id),`${entry.id}: references file covers discovery`);
  assert.ok(refs.includes(entry.sourceUrl),`${entry.id}: source catalog link in separate file`);
  assert.ok(refs.includes(entry.image.source),`${entry.id}: photo source in separate file`);
  assert.ok(photoCredits.includes(entry.image.url),`${entry.id}: full photo media credit preserved`);
}
assert.ok(ui.includes('What we learned:'),'Discovery cards must explain what scientists learned');
assert.ok(!/<a\b|href=|import\.meta\.env\.DEV/.test(ui),'No outbound source links in player-facing discovery cards');
for (const stage of ['CrewGameplay','CrewDayReport','Debrief']) {
  assert.match(app,new RegExp(`${stage}\\(\\{[^}]+uiStyle = 'classic'`),`${stage} must support all themes`);
}
assert.equal((app.match(/data-menu-style=\{uiStyle\}/g)||[]).length,6,'All six game screens theme-aware');
assert.equal((app.match(/<MenuStyleSwitch uiStyle=\{uiStyle\} onToggleStyle=\{onToggleStyle\}\/>/g)||[]).length,6,'Shared visual toggle on each stage');
assert.ok(app.includes('uiStyle={uiStyle} onToggleStyle={toggleUiStyle}/>'),'Root must pass same theme state through routes');
assert.ok(app.includes('uiStyle={uiStyle}\n      onClose='),'Discovery popup must receive active theme');
assert.ok(ui.includes('data-menu-style={uiStyle}'),'Discovery popup uses active theme');
for (const stage of ['play','report','debrief']) {
  assert.ok(css.includes(`.crew-${stage}[data-menu-style="playful"]`),`Playful styling present for ${stage}`);
  assert.ok(css.includes(`.crew-${stage}[data-menu-style="starry"]`),`Starry styling present for ${stage}`);
}
assert.ok(css.includes('classic-scattered-stars.svg'),'The existing untiled starfield is reused');
assert.ok(discoveryCss.includes('.science-popup__veil[data-menu-style="playful"]'),'Playful popup reflects active scheme');
assert.ok(discoveryCss.includes('.science-popup__veil[data-menu-style="starry"]'),'Starry popup reflects active scheme');
assert.ok(css.includes('var(--room-accent'),'Every room should show its own stronger color');
assert.ok(css.includes('.crew-ship__room.is-focused:not(.is-hovered)'),'Focused room must retain its own color');
assert.ok(css.includes('.crew-ship__room-select .crew-icon'),'Icons stay legible and not color-only');
assert.ok(existsSync('public/art/classic-scattered-stars.svg'));
assert.ok(css.includes('prefers-reduced-motion:reduce'));
console.log('D9 PASS: 3 styles across gameplay/report/debrief/popup, age-appropriate discovery lessons, separate study/photo references, stronger room identities.');
