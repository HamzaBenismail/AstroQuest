/** Dependency-free candidate v2 checks. Synthetic data carries no NASA event claims. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  createV2State, energyForDay, initialPlan, validateV2Plan, simulateV2Day,
  v2Forecast, selectUpgrade, v2Debrief,
} from '../src/logic/v2/engine.js';
import { initV2Session, reduceV2Session, previewV2, ROOMS } from '../src/ui/v2/controller.js';

export const stormLevels = [2,2,3,2,3,3,2,3,3,3]; // Approved amine game-level sequence, not a dose or invented NASA event.
export const config = JSON.parse(readFileSync(resolve('src/data/config.json'),'utf8'));
config.reevaluation = {
  version:2, startingSafety:10, reducedDayEnergy:9,
  research:{unlockThreshold:4,pointsPerPower:1,airUseReduction:1,airUseMin:1,improvedForecastErrorTable:[-1,0,0,0]},
  comms:{sendEnergyCost:1,baseResponseTurns:1,interferenceExtraTurns:1,interferenceStormLevel:3},
};
config.meterMin ??= 0;
config.failureMeterThreshold ??= 0;
config.zeroShieldSafetyPenalty ??= 1;
config.calmShieldRecoveryMinAllocation ??= 1;
config.calmShieldRecovery ??= 1;
export const fixture = {
  missionId:'synthetic-approved-levels-test-only',site:'moon',dataSource:'TEST FIXTURE ONLY',
  days:stormLevels.map((stormLevel,i)=>({day:i+1,date:`synthetic-day-${i+1}`,stormLevel,events:[]})),
};
export const safe = day => ({lifeSupport:3,shield:3,greenhouse:2,science:day<=4?2:1});
export const unsafe = day => ({lifeSupport:3,shield:2,greenhouse:2,science:day<=4?3:2});
export function runPolicy(policy) {
  let state = createV2State(config,fixture);
  while(state.status==='running'){
    const day = state.day;
    const f = v2Forecast(day,state,fixture,config,123);
    state = simulateV2Day(state,policy(day),null,fixture,config,f);
  }
  return state;
}

assert.equal(energyForDay(5,config),9);
assert.equal(energyForDay(1,config),10);
assert.equal(ROOMS.length,6);
let state = createV2State(config,fixture);
assert.deepEqual(Object.keys(state.meters).sort(),['air','safety','supplies']);
assert.equal(state.meters.safety,10);
assert.equal(validateV2Plan(state,{lifeSupport:4,shield:3,greenhouse:3,science:1},null,config).ok,false);
assert.equal(validateV2Plan(state,safe(1),'weather-review',config).ok,false);
assert.equal(validateV2Plan(state,{...safe(1),science:1},'weather-review',config).ok,true);
assert.equal(validateV2Plan({...state,day:8},initialPlan(config),'research-advice',config).ok,false);
const oldSnapshot = JSON.stringify([state,fixture]);
const first = simulateV2Day(state,{...safe(1),science:1},'weather-review',fixture,config,v2Forecast(1,state,fixture,config,123));
assert.equal(first.comms.pending.dueDay,2);
assert.equal(first.history[0].energyUsed,10);
assert.equal(JSON.stringify([state,fixture]),oldSnapshot);
let second = simulateV2Day(first,safe(2),null,fixture,config,v2Forecast(2,first,fixture,config,123));
assert.equal(second.comms.pending,null);
assert.equal(second.comms.lastResponse.kind,'weather-review');
assert.equal(second.comms.weatherBoostDay,3);
assert.equal(second.history[1].meterDeltas.supplies,0);
const newForecast = v2Forecast(3,second,fixture,config,123);
assert.ok(newForecast >=2 && newForecast<=3);
// Severe storm delays a request once, followed by a guaranteed response.
const requestOnSecond = simulateV2Day(simulateV2Day(state,safe(1),null,fixture,config,1),
  {...safe(2),science:1},'research-advice',fixture,config,2);
const postponed = simulateV2Day(requestOnSecond,safe(3),null,fixture,config,3);
assert.equal(postponed.comms.pending.postponed,true);
assert.equal(postponed.comms.pending.dueDay,4);
const delivered = simulateV2Day(postponed,safe(4),null,fixture,config,2);
assert.equal(delivered.comms.pending,null);
assert.equal(delivered.comms.lastResponse.kind,'research-advice');
// Upgrade earned through Science, active only on later days.
assert.ok(delivered.researchTotal>=config.reevaluation.research.unlockThreshold);
const chosen = selectUpgrade(delivered,'air-recycler',config);
assert.equal(chosen.upgradeDay,4);
const next = simulateV2Day(chosen,safe(5),null,fixture,config,3);
assert.equal(next.meters.air,6);
// On real-game storm levels, pure candidate rules admit both outcomes.
const success = runPolicy(safe);
assert.equal(success.status,'succeeded');
assert.equal(success.completedDays,10);
assert.equal(success.meters.safety,4);
assert.equal(success.meters.supplies,3);
assert.equal(v2Debrief(success,fixture).score,14);
const failure = runPolicy(unsafe);
assert.equal(failure.status,'failed');
assert.ok(failure.completedDays<10);
// The upgrade cannot be taken twice and does not grant free research points.
assert.throws(()=>selectUpgrade(chosen,'weather-analyst',config));
// Controller: selection -> allocation -> report -> upgrade -> debrief/restart.
let ui = initV2Session(config,fixture);
assert.equal(ui.screen,'briefing');
ui=reduceV2Session(ui,{type:'START'},config,fixture);
assert.equal(ui.screen,'planning');
ui=reduceV2Session(ui,{type:'SELECT_ROOM',room:'greenhouse'},config,fixture);
assert.equal(ui.selectedRoom,'greenhouse');
for(const [consumer,value] of Object.entries(safe(1))){
 for(let j=0;j<value;j++) ui=reduceV2Session(ui,{type:'ALLOCATE',consumer,delta:1},config,fixture);
}
assert.equal(previewV2(ui,config).used,10);
const tooMuch=reduceV2Session(ui,{type:'REQUEST',kind:'weather-review'},config,fixture);
assert.equal(tooMuch.requestKind,null);
assert.match(tooMuch.error,/Energy|Plan uses/);
ui=reduceV2Session(ui,{type:'COMMIT'},config,fixture);
assert.equal(ui.screen,'report');
assert.equal(ui.reveal.realLevel,2);
ui=reduceV2Session(ui,{type:'CONTINUE'},config,fixture);
assert.equal(ui.screen,'planning');
assert.equal(ui.game.day,2);
const reset=reduceV2Session(ui,{type:'RESTART'},config,fixture);
assert.equal(reset.screen,'briefing');
assert.equal(reset.game.researchTotal,0);
assert.equal(reset.game.comms.pending,null);
assert.equal(reset.game.upgrade,null);
// No hidden network, clock, random, React or DOM references in the pure engine.
const engineSource=readFileSync(resolve('src/logic/v2/engine.js'),'utf8');
for(const forbidden of ['Math.random','Date.now','fetch(',"from 'react'",'document.', 'window.']) assert.ok(!engineSource.includes(forbidden),forbidden);
console.log('Phase Reevaluation B: 20+ dependency-free assertions passed; candidate win and loss reachable using approved storm-level sequence; no NASA records fabricated.');
