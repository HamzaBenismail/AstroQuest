import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import {
  SHIP_IDS, DESTINATIONS, ROOM_IDS, createCrewRoster, placeCrew, isAvailable,
  crewInRoom, freeCrewMember, checkCrewStaffing, reconcilePlanWithCrew,
  validateCargo, applyCargoToInitialGame, dispatchExpeditionCrew, returnExpeditionCrew,
} from '../src/logic/v4/crewRules.js';

const config = { meterMax: 10, failureMeterThreshold: 0,
  reevaluation: { c3: {battery:{baseCapacity:2}, expeditions: {
    'supply-retrieval':{duration:2,energyCost:1,airCost:1,suppliesCost:1,reward:{supplies:4}},
  }}}};
const options={crewCount:4,crewNames:['Ari','Nova','Kai','Sol'],cargoCapacity:10,
  minimumAir:2,minimumSupplies:2,cargoDefaults:{air:5,supplies:4,battery:1}};
assert.deepEqual(SHIP_IDS,['explorer','titan','horizon','nova']);
assert.deepEqual(DESTINATIONS,['moon','mars']);
assert.equal(ROOM_IDS.length,6);
let crew=createCrewRoster(options);
assert.equal(crew.length,4);
assert.ok(crew.every(c => c.room === null && c.awayUntilDay === null));
assert.equal(freeCrewMember(crew).id,'crew-1');
const originalRoster = crew;
let first=placeCrew(crew,'crew-1','lifeSupport');
assert.equal(first.ok,true);
crew=first.crew;
assert.equal(crewInRoom(crew,'lifeSupport'),true);
assert.equal(placeCrew(crew,'crew-2','lifeSupport').ok,false);
assert.equal(placeCrew(crew,'crew-2','nonexistent').ok,false);
assert.equal(placeCrew(crew,'missing','science').ok,false);
assert.equal(originalRoster[0].room,null); // original state was not mutated
let p={allocation:{lifeSupport:2,greenhouse:1,science:1,shield:0},charge:0,care:false,requestAdvice:false,expedition:null,upgradeRoom:null};
assert.match(checkCrewStaffing(crew,p).reason,/greenhouse/);
const zero=reconcilePlanWithCrew(p,crew);
assert.deepEqual(zero.allocation,{lifeSupport:2,greenhouse:0,science:0,shield:0});
assert.equal(checkCrewStaffing(crew,zero).ok,true);
crew=placeCrew(crew,'crew-2','greenhouse').crew;
crew=placeCrew(crew,'crew-3','shield').crew;
assert.equal(placeCrew(crew,'crew-4','science').ok,true);
assert.ok(freeCrewMember(crew));
const expPlan={...zero,expedition:'supply-retrieval'};
assert.equal(checkCrewStaffing(crew,expPlan).ok,true);
const dispatched=dispatchExpeditionCrew(crew,expPlan,1,config);
assert.equal(dispatched.find(c=>c.id==='crew-4').awayUntilDay,3);
assert.equal(freeCrewMember(dispatched),null);
assert.equal(checkCrewStaffing(dispatched,expPlan).ok,false);
assert.equal(placeCrew(dispatched,'crew-4','science').ok,false);
assert.equal(returnExpeditionCrew(dispatched,2).find(c=>c.id==='crew-4').awayUntilDay,3);
const returned=returnExpeditionCrew(dispatched,3);
assert.equal(returned.find(c=>c.id==='crew-4').awayUntilDay,null);
assert.ok(isAvailable(returned[3]));
const carePlan={...zero,care:true};
assert.equal(checkCrewStaffing(crew,carePlan).ok,true);
const chargePlan={...zero,charge:1};
assert.match(checkCrewStaffing(crew,chargePlan).reason,/Power Station/);
const commsPlan={...zero,requestAdvice:true};
assert.match(checkCrewStaffing(crew,commsPlan).reason,/Communications/);
const roomUpgrade={...zero,upgradeRoom:'science'};
assert.match(checkCrewStaffing(crew,roomUpgrade).reason,/Assign a worker/);

const loadout={air:5,supplies:4,battery:1};
assert.deepEqual(validateCargo(loadout,config,options),{ok:true,used:10,capacity:10,left:0,reason:null});
assert.equal(validateCargo({air:10,supplies:4,battery:1},config,options).ok,false);
assert.equal(validateCargo({air:1,supplies:4,battery:1},config,options).ok,false);
assert.equal(validateCargo({air:5,supplies:4,battery:3},config,options).ok,false);
assert.equal(validateCargo({air:5,supplies:4,battery:-1},config,options).ok,false);
const baseGame={day:1,completedDays:0,status:'running',meters:{air:5,supplies:4,safety:10},battery:0};
const packed=applyCargoToInitialGame(baseGame,loadout,config,options);
assert.deepEqual(packed.meters,{air:5,supplies:4,safety:10});
assert.equal(packed.battery,1);
assert.equal(baseGame.battery,0);
assert.throws(()=>applyCargoToInitialGame({...baseGame,day:2},loadout,config,options));

const artDir=resolve('public/art');
for(const ship of SHIP_IDS) {
  assert.ok(readdirSync(artDir).includes(`ship-${ship}.svg`));
  assert.ok(readdirSync(artDir).includes(`ship-${ship}-sealed.svg`));
}
for(const room of ROOM_IDS) assert.ok(readdirSync(artDir).includes(`room-${room}.svg`));
for(const planet of DESTINATIONS) assert.ok(readdirSync(artDir).includes(`${planet}-landscape.svg`));
const css=readFileSync(resolve('src/ui/v4/crew-ui.css'),'utf8');
assert.ok(css.includes('prefers-reduced-motion:reduce'));
assert.ok(css.includes('pointer:coarse'));
const html=readFileSync(resolve('src/ui/v4/CrewMissionExperience.jsx'),'utf8');
assert.ok(html.includes('onPointerDown'));
assert.ok(html.includes('onPointerUp'));
assert.ok(html.includes('data-drop-room'));
assert.ok(html.includes('aria-pressed'));
assert.ok(html.includes('room-${room}.svg'));
assert.ok(html.includes('showingInterior &&'));
assert.ok(html.includes('c3WeatherEstimate'));
assert.ok(html.includes('crew-forecast'));
assert.ok(html.includes('STORM FORECAST'));
assert.ok(html.includes('ship-${ship}-sealed.svg'));
assert.ok(html.includes('crew-ship__hover-hint'));
assert.ok(!html.includes('crew-room-preview"'));
assert.ok(css.includes('crew-ship__interior'));
assert.ok(css.includes('crew-forecast__levels'));
const flow=readFileSync(resolve('src/ui/v4/crewFlow.js'),'utf8');
assert.ok(flow.includes('reconcilePlanWithCrew'));
assert.ok(flow.includes('previewC3'));
assert.ok(!flow.includes('Math.random'));
assert.ok(!flow.includes('fetch('));
console.log('Crew interface: pure roster, staffing, refunds, expedition absence/return, cargo, artwork, keyboard/touch fallbacks PASS');
