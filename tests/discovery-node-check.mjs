import assert from 'node:assert/strict';
import catalog from '../src/data/discoveries.js';
import { createCrewCandidates, placeCrew } from '../src/logic/v4/crewRules.js';
import {
  initialDiscoveryProgress, discoveryOptions, validateDiscoveryCatalog,
  resolveDiscoveryDay, hasScienceSpecialist, creditDiscoveryToSession,
  discoveryPresentation, sanitizeDiscoveryIds, addLifetimeDiscoveryIds,
} from '../src/logic/v4/discoveries.js';
import { loadDiscoveryIds, saveDiscoveryIds, clearDiscoveryIds, DISCOVERY_STORAGE_KEY } from '../src/ui/v4/discoveryStorage.js';

const config={reevaluation:{discovery:{enabled:true,specialistRoom:'science',minScienceEnergy:1,daysPerDiscovery:2,bonusResearchPoints:2,maxPerRun:4}}};
const plan=(energy=2)=>({allocation:{lifeSupport:0,greenhouse:0,shield:0,science:energy}});
const roster=createCrewCandidates();
const sol=placeCrew(roster,'crew-4','science').crew;
const juno=placeCrew(roster,'crew-2','science').crew;
assert.equal(validateDiscoveryCatalog(catalog),true);
assert.equal(catalog.length,32);
assert.ok(catalog.every(item=>item.verified===false));
assert.equal(discoveryOptions(config).bonusResearchPoints,2);
assert.equal(hasScienceSpecialist(sol,plan(),discoveryOptions(config)),true);
assert.equal(hasScienceSpecialist(juno,plan(),discoveryOptions(config)),false);
assert.equal(hasScienceSpecialist(sol,plan(0),discoveryOptions(config)),false);
assert.equal(hasScienceSpecialist(sol.map(x=>x.id==='crew-4'?{...x,awayUntilDay:5}:x),plan(),discoveryOptions(config)),false);
assert.equal(resolveDiscoveryDay(initialDiscoveryProgress(),sol,plan(),{},catalog).reward,null);
let progress=initialDiscoveryProgress();
for(let i=0;i<3;i++) {
  const r=resolveDiscoveryDay(progress,juno,plan(),config,catalog);
  assert.equal(r.reward,null);assert.equal(r.progress.qualifiedDays,0);
}
let r=resolveDiscoveryDay(progress,sol,plan(),config,catalog);
progress=r.progress;
assert.equal(r.reward,null);
assert.equal(progress.qualifiedDays,1);
r=resolveDiscoveryDay(progress,sol,plan(0),config,catalog);
assert.equal(r.reward,null);assert.equal(r.progress.qualifiedDays,1);
r=resolveDiscoveryDay(progress,sol,plan(),config,catalog);
progress=r.progress;
assert.deepEqual(r.reward,{id:'bio-lettuce',points:2});
assert.deepEqual(progress.runIds,['bio-lettuce']);
assert.equal(progress.popupId,'bio-lettuce');
const lifetime=addLifetimeDiscoveryIds([],progress.runIds,catalog);
assert.deepEqual(lifetime,['bio-lettuce']);
// New runs must discover an unseen NASA study, not repeat an already collected one.
let newRun=initialDiscoveryProgress();
newRun=resolveDiscoveryDay(newRun,sol,plan(),config,catalog,lifetime).progress;
r=resolveDiscoveryDay(newRun,sol,plan(),config,catalog,lifetime);
assert.equal(r.reward.id,'bio-mizuna');
// No bonus if the researcher is not in the lab, even with Energy or a scientist aboard.
assert.equal(resolveDiscoveryDay(initialDiscoveryProgress(),roster,plan(),config,catalog).reward,null);
assert.equal(resolveDiscoveryDay(initialDiscoveryProgress(),juno,plan(),config,catalog).progress.qualifiedDays,0);
const completedIds=catalog.map(item=>item.id);
let allCollected=resolveDiscoveryDay(initialDiscoveryProgress(),sol,plan(),config,catalog,completedIds).progress;
assert.equal(resolveDiscoveryDay(allCollected,sol,plan(),config,catalog,completedIds).reward,null);
// No duplicate bonus after reading the same report twice, and credit the real wallet + visible report.
const before={ screen:'report',game:{research:{earned:5,available:3},history:[{day:2,events:['Greenhouse produced'],research:{gained:1,total:5,available:3}}]},
  reveal:{history:{day:2,events:['Greenhouse produced'],research:{gained:1,total:5,available:3}}} };
const prevJSON=JSON.stringify(before);
const credited=creditDiscoveryToSession(before,{id:'bio-lettuce',points:2});
assert.equal(credited.game.research.earned,7);
assert.equal(credited.game.research.available,5);
assert.equal(credited.game.history[0].research.gained,3);
assert.equal(credited.game.history[0].research.total,7);
assert.equal(credited.reveal.history.discoveryBonus.id,'bio-lettuce');
assert.equal(JSON.stringify(before),prevJSON);
assert.throws(()=>creditDiscoveryToSession(credited,{id:'bio-lettuce',points:2}),/already included/);
assert.equal(creditDiscoveryToSession(before,null),before);
assert.throws(()=>creditDiscoveryToSession({...before,screen:'planning'},{id:'bio-lettuce',points:2}));
// Clean, source-grounded educational copy; precise scientific study claims remain gated.
const candidate=discoveryPresentation(catalog[0],0);
assert.equal(candidate.studyId,'OSD-267');
assert.equal(candidate.title,'Space-grown lettuce');
assert.equal(candidate.description,catalog[0].publicSummary);
assert.notEqual(candidate.description,catalog[0].summary);
assert.equal(candidate.image.credit,'NASA / ISS Expedition 40');
assert.ok(candidate.image.url.startsWith('https://'));
assert.equal(Object.hasOwn(candidate,'url'),false);
assert.equal(Object.hasOwn(candidate,'reviewed'),false);
assert.equal(Object.hasOwn(candidate,'preview'),false);
const verifiedEntry=discoveryPresentation({...catalog[0],verified:true},0);
assert.equal(verifiedEntry.description,catalog[0].publicSummary); // review status never makes the game text more technical
assert.equal(catalog.every(item=>item.image.alt.length>8&&item.image.source.startsWith('https://')),true);
assert.ok(new Set(catalog.map(item=>item.image.url)).size >= 6);
assert.equal(new Set(catalog.map(item=>item.sourceUrl)).size,32);
// Persistent collection is browser-local, sanitized and robust to corrupted/blocked storage.
const store=new Map();
const storage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v)};
assert.deepEqual(loadDiscoveryIds(storage,catalog),[]);
assert.equal(saveDiscoveryIds(storage,['bio-lettuce','bio-mizuna','unknown','bio-lettuce'],catalog),true);
assert.equal(store.has(DISCOVERY_STORAGE_KEY),true);
assert.deepEqual(loadDiscoveryIds(storage,catalog),['bio-lettuce','bio-mizuna']);
// Both explicit deletion and saving an empty archive are supported; blocked storage does not crash.
const removable={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)};
assert.equal(clearDiscoveryIds(removable),true);
assert.deepEqual(loadDiscoveryIds(removable,catalog),[]);
assert.equal(saveDiscoveryIds(removable,['bio-lettuce'],catalog),true);
assert.equal(clearDiscoveryIds({removeItem:()=>{throw Error('blocked')}}),false);
store.set(DISCOVERY_STORAGE_KEY,'not-json');
assert.deepEqual(loadDiscoveryIds(storage,catalog),[]);
assert.equal(saveDiscoveryIds({setItem:()=>{throw Error('blocked')}},['bio-lettuce'],catalog),false);
assert.deepEqual(sanitizeDiscoveryIds(['bad','bio-lettuce','bio-lettuce'],catalog),['bio-lettuce']);
assert.equal(catalog.map(item=>item.studyId).length,new Set(catalog.map(item=>item.studyId)).size);
console.log('D10 discovery pure rules PASS: specialist-only, Energy gate, catalog imagery, safe copy, research ledger, local storage');
