import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import catalog from '../src/data/discoveries.js';
import { createCrewCandidates, placeCrew } from '../src/logic/v4/crewRules.js';
import { resolveDiscoveryDay, initialDiscoveryProgress, validateDiscoveryCatalog, addLifetimeDiscoveryIds } from '../src/logic/v4/discoveries.js';
import { clearDiscoveryIds, saveDiscoveryIds, loadDiscoveryIds, DISCOVERY_STORAGE_KEY } from '../src/ui/v4/discoveryStorage.js';

assert.equal(validateDiscoveryCatalog(catalog),true);
assert.equal(catalog.length,32);
assert.equal(new Set(catalog.map(entry=>entry.studyId)).size,32);
assert.equal(new Set(catalog.map(entry=>entry.id)).size,32);
const oldIds=['bio-lettuce','bio-mizuna','bio-seedlings','bio-muscle','bio-immunity','bio-ground-radiation'];
assert.deepEqual(catalog.slice(0,6).map(item=>item.id),oldIds,'Do not invalidate already-earned collection IDs');
for(const item of catalog){
  assert.equal(item.sourceUrl,`https://osdr.nasa.gov/bio/repo/data/studies/${item.studyId}`);
  assert.equal(item.verified,false,'Do not silently approve an unverified NASA result');
  assert.ok((item.publicSummary.match(/[.!?](?:\s|$)/g)||[]).length>=2,`${item.id}: accessible summary needs several sentences`);
  assert.ok(item.publicSummary.length>=110 && item.publicSummary.length<=320,`${item.id}: short but useful explanation`);
  assert.ok(item.image.url.startsWith('https://'));
}
const docs=readFileSync('public/art/DISCOVERY-REFERENCES.md','utf8');
const photoDocs=readFileSync('public/art/DISCOVERY-PHOTO-CREDITS.md','utf8');
for(const item of catalog){assert.ok(docs.includes(item.id));assert.ok(docs.includes(item.sourceUrl));assert.ok(docs.includes(item.image.source));assert.ok(photoDocs.includes(item.image.url));}
// The engine already limits each 10-day run; new study IDs must be reachable across successive runs.
const config={reevaluation:{discovery:{enabled:true,specialistRoom:'science',minScienceEnergy:1,daysPerDiscovery:2,bonusResearchPoints:2,maxPerRun:4}}};
const plan={allocation:{science:2}};
const roster=placeCrew(createCrewCandidates(),'crew-4','science').crew;
let archive=[];
for(let run=0;run<8;run++){
  let state=initialDiscoveryProgress();
  let totalBonus=0;
  for(let day=0;day<10;day++){
    const out=resolveDiscoveryDay(state,roster,plan,config,catalog,archive);
    state=out.progress;
    totalBonus+=out.reward?.points??0;
  }
  assert.equal(state.runIds.length,4,`Run ${run+1} should unlock 4 new discoveries`);
  assert.equal(totalBonus,8,`Run ${run+1} must award exactly 8 game Research Points`);
  archive=addLifetimeDiscoveryIds(archive,state.runIds,catalog);
  assert.equal(archive.length,(run+1)*4);
}
assert.equal(archive.length,32);
let finished=initialDiscoveryProgress();
for(let day=0;day<10;day++){
  const out=resolveDiscoveryDay(finished,roster,plan,config,catalog,archive);
  assert.equal(out.reward,null,'Exhausted discoveries cannot be re-awarded');
  finished=out.progress;
}
const saved=new Map();
const storage={getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v),removeItem:k=>saved.delete(k)};
assert.equal(saveDiscoveryIds(storage,archive,catalog),true);
assert.equal(loadDiscoveryIds(storage,catalog).length,32);
assert.equal(clearDiscoveryIds(storage),true);
assert.equal(saved.has(DISCOVERY_STORAGE_KEY),false);
assert.equal(loadDiscoveryIds(storage,catalog).length,0);
// No unexplained topic shift or animation work in this narrowly scoped change.
const userUI=readFileSync('src/ui/v4/DiscoveryUI.jsx','utf8');
assert.ok(userUI.includes('Reset discoveries')&&userUI.includes('Yes, reset')&&userUI.includes('Cancel'));
assert.ok(!/<a\b|href=/.test(userUI),'References stay in separate file, not player UI');
const flow=readFileSync('src/ui/v4/crewFlow.js','utf8');
assert.ok(flow.includes('RESET_SAVED_DISCOVERIES'));
assert.ok(flow.includes("state.collectionScope === 'lifetime'"));
console.log('D10 PASS: 32 distinct sourced studies, general child-friendly explanations, 8-run unlock path, no duplicate rewards, confirmation UI, and local reset.');
