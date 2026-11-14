import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { buildC3Candidate } from '../scripts/reevaluation-c-candidate.mjs';
import {
  createC3State, createC3Plan, validateC3Plan, simulateC3Day, c3UpgradeCost,
  c3Generation, c3BatteryCapacity, c3WeatherEstimate, c3ChooseAdvice,
  c3Debrief, c3ReplyTurns, ROOMS_C3,
} from '../src/logic/v3/engine.js';
import { initC3Session, reduceC3Session, previewC3 } from '../src/ui/v3/controller.js';

const original = JSON.parse(readFileSync(resolve('src/data/config.json'), 'utf8'));
original.stormMapping.status = 'approved'; // verification fixture only; does not alter the source file
export const config = buildC3Candidate(original);
export const storms = [2,2,3,2,3,3,2,3,3,3]; // approved game-level sequence, NOT NASA record content
export const fixture = {
  missionId:'synthetic-storm-level-test-only',site:'moon',dataSource:'TEST DATA, NOT NASA',
  days: storms.map((stormLevel,i)=>({day:i+1,date:`day-${i+1}`,stormLevel,
    events:[{label:`SYNTHETIC EVENT ${i+1}`,sourceId:`TEST-${i+1}`}]})),
};
const basePlan = (day) => {
  const plan=createC3Plan(config);
  plan.allocation={lifeSupport:3,greenhouse:2,science:day <=4 ? 2 : 1,shield:3};
  return plan;
};
function runPolicy(policy) {
  let s=createC3State(config,fixture);
  while(s.status==='running')s=simulateC3Day(s,policy(s),fixture,config,82);
  return s;
}
const snapshotConfig = JSON.stringify(original);
assert.equal(config.stormMapping.status,'approved');
assert.equal(JSON.stringify(original),snapshotConfig);
assert.equal(config.reevaluation.version,3);
assert.equal(ROOMS_C3.length,6);
let state=createC3State(config,fixture);
let plan=createC3Plan(config);
assert.equal(state.roomLevels.lifeSupport,1);
assert.equal(state.research.earned,0);
assert.equal(state.research.available,0);
assert.equal(state.battery,0);
assert.deepEqual(Object.keys(state.meters).sort(), ['air','safety','supplies']);
assert.equal(validateC3Plan(state,plan,config).ok,true);
assert.equal(validateC3Plan(state,{...plan,allocation:{...plan.allocation,lifeSupport:5}},config).ok,false);
assert.equal(validateC3Plan(state,{...plan,allocation:{lifeSupport:3,shield:3,greenhouse:3,science:3}},config).ok,false);
assert.equal(validateC3Plan(state,{...plan,charge:99},config).ok,false);
assert.equal(validateC3Plan(state,{...plan,expedition:'fictional'},config).ok,false);
assert.equal(c3Generation(state,config),10);
assert.equal(c3BatteryCapacity(state,config),2);
const origState=JSON.stringify(state),origMission=JSON.stringify(fixture);
const safe=runPolicy(s=>basePlan(s.day));
assert.equal(safe.status,'succeeded');
assert.equal(safe.completedDays,10);
assert.equal(safe.meters.safety,4);
assert.equal(safe.meters.supplies,3);
assert.equal(safe.research.earned,14);
const unsafe=runPolicy(s=>({ ...basePlan(s.day),allocation:{lifeSupport:3,shield:1,greenhouse:2,science:1}}));
assert.equal(unsafe.status,'failed');
assert.ok(unsafe.completedDays<10);
assert.equal(JSON.stringify(state),origState);
assert.equal(JSON.stringify(fixture),origMission);
assert.deepEqual(safe.history[0].sourceIds,['TEST-1']);
assert.equal(c3Debrief(safe,fixture).researchScore,14);

// Battery stores *unspent generation* then automatically supplies an over-budget action.
plan=basePlan(1);
plan.allocation.science=1;
plan.charge=1;
assert.equal(validateC3Plan(state,plan,config).ok,true);
state=simulateC3Day(state,plan,fixture,config,82);
assert.equal(state.battery,1);
assert.equal(state.history[0].energy.stored,1);
const draw=basePlan(2);
draw.allocation.science=3;
const drawPreview=validateC3Plan(state,draw,config);
assert.equal(drawPreview.ok,true);
assert.equal(drawPreview.batteryDraw,1);
const doubleCount={...draw,charge:1};
assert.equal(validateC3Plan(state,doubleCount,config).ok,false);
state=simulateC3Day(state,draw,fixture,config,82);
assert.equal(state.battery,0);
assert.equal(state.history[1].energy.drawn,1);

// Research wallet, escalating room levels and next-day activation.
let rich=createC3State(config,fixture);
rich={...rich,research:{earned:16,available:16}};
assert.deepEqual(c3UpgradeCost('lifeSupport',rich,config),{points:3,energy:1,nextLevel:2});
let upgradePlan=basePlan(1);upgradePlan.allocation.science=1;upgradePlan.upgradeRoom='lifeSupport';
assert.equal(validateC3Plan(rich,upgradePlan,config).ok,true);
const upgrade1=simulateC3Day(rich,upgradePlan,fixture,config);
assert.equal(upgrade1.roomLevels.lifeSupport,2);
assert.equal(upgrade1.history[0].research.spent,3);
assert.equal(upgrade1.research.available,14);
assert.equal(upgrade1.research.earned,17);
assert.deepEqual(c3UpgradeCost('lifeSupport',upgrade1,config),{points:7,energy:1,nextLevel:3});
const upgrade2Plan=basePlan(2);upgrade2Plan.allocation.science=1;upgrade2Plan.upgradeRoom='lifeSupport';
const upgrade2=simulateC3Day(upgrade1,upgrade2Plan,fixture,config);
assert.equal(upgrade2.roomLevels.lifeSupport,3);
assert.equal(c3UpgradeCost('lifeSupport',upgrade2,config),null);
assert.equal(upgrade2.research.available,8);
assert.equal(upgrade2.research.earned,18);
assert.equal(upgrade2.meters.air,6); // Level 2 reduces Air consumption by one, starting day 2
// Every room accepts upgrade levels independently, without mutual exclusion.
for(const room of ROOMS_C3){
  const special=createC3State(config,fixture);
  special.research={earned:10,available:10};
  const nextPlan=createC3Plan(config);nextPlan.upgradeRoom=room;
  assert.equal(validateC3Plan(special,nextPlan,config).ok,true,room);
  const result=simulateC3Day(special,nextPlan,fixture,config);
  assert.equal(result.roomLevels[room],2,room);
}

// Crew readiness can recover, but costs Energy + Supplies and respects cooldown.
let care=createC3State(config,fixture);
care={...care,meters:{...care.meters,safety:4}};
let carePlan=basePlan(1);carePlan.allocation.science=1;carePlan.care=true;
assert.equal(validateC3Plan(care,carePlan,config).ok,true);
const careAfter=simulateC3Day(care,carePlan,fixture,config);
assert.equal(careAfter.meters.safety,6);
assert.equal(careAfter.meters.supplies,2);
let nextCare=basePlan(2);nextCare.allocation.science=0;nextCare.care=true;
assert.equal(validateC3Plan(careAfter,nextCare,config).ok,false);
assert.equal(careAfter.lastCareDay,1);

// Expedition pays costs up front and returns fixed scenario game-unit rewards in two turns.
let expedition=createC3State(config,fixture);
const launch=basePlan(1);launch.allocation.science=1;launch.expedition='supply-retrieval';
assert.equal(validateC3Plan(expedition,launch,config).ok,true);
expedition=simulateC3Day(expedition,launch,fixture,config);
assert.equal(expedition.expedition.active.dueDay,3);
assert.equal(expedition.meters.supplies,2);
assert.equal(expedition.meters.air,4);
assert.equal(validateC3Plan(expedition,{...basePlan(2),expedition:'science-sampling'},config).ok,false);
expedition=simulateC3Day(expedition,basePlan(2),fixture,config);
assert.equal(expedition.expedition.completed.length,0);
expedition=simulateC3Day(expedition,basePlan(3),fixture,config);
assert.equal(expedition.expedition.completed.length,1);
assert.equal(expedition.expedition.active,null);
assert.equal(expedition.meters.supplies,6);
// Research expedition rewards score/currency, but don't invent source observations.
let explorer=createC3State(config,fixture);
const sample=basePlan(1);sample.allocation.science=1;sample.expedition='science-sampling';
explorer=simulateC3Day(explorer,sample,fixture,config);
explorer=simulateC3Day(explorer,basePlan(2),fixture,config);
explorer=simulateC3Day(explorer,basePlan(3),fixture,config);
assert.equal(explorer.history.at(-1).research.gained,6); // 2 from Science plus 4 upon return

// Messages use operational time and are delayed once at severe level.
let comms=createC3State(config,fixture);
let request=basePlan(1);request.allocation.science=1;request.requestAdvice=true;
assert.equal(validateC3Plan(comms,request,config).ok,true);
comms=simulateC3Day(comms,request,fixture,config,55);
assert.equal(comms.comms.pending.dueDay,3);
comms=simulateC3Day(comms,basePlan(2),fixture,config,55);
assert.ok(comms.comms.pending);
comms=simulateC3Day(comms,basePlan(3),fixture,config,55);
assert.equal(comms.comms.pending.dueDay,4);
assert.equal(comms.comms.pending.postponed,true);
comms=simulateC3Day(comms,basePlan(4),fixture,config,55);
assert.equal(comms.comms.pending,null);
assert.equal(comms.comms.lastAdvice.receivedDay,4);
assert.ok(comms.comms.lastAdvice.recommendedUpgrade);
assert.equal(c3ReplyTurns(comms,config),2);
for(let day=1;day<=config.missionLengthDays;day++){
  const a=c3WeatherEstimate(day,fixture,config,55);
  const b=c3WeatherEstimate(day,fixture,config,55);
  assert.equal(a,b);
  assert.ok(a>=config.stormLevelRange[0]&&a<=config.stormLevelRange[1]);
  assert.ok(Math.abs(a-storms[day-1])<=1);
}
// Advice selector is independent of future mission records; uses supplied estimated warning only.
assert.equal(c3ChooseAdvice({...comms,meters:{air:2,supplies:8,safety:9}},1,config).focus,'lifeSupport');
assert.equal(c3ChooseAdvice({...comms,meters:{air:8,supplies:8,safety:2}},0,config).focus,'shield');

// The controller limits commits to valid plans, advances and resets every subsystem.
let ui=initC3Session(config,fixture);
assert.equal(ui.screen,'briefing');
ui=reduceC3Session(ui,{type:'START'},config,fixture);
assert.equal(ui.screen,'planning');
ui=reduceC3Session(ui,{type:'SELECT_ROOM',room:'science'},config,fixture);
assert.equal(ui.selectedRoom,'science');
const illegal=reduceC3Session(ui,{type:'ALLOCATE',consumer:'science',delta:500},config,fixture);
assert.equal(illegal.plan.allocation.science,0);
assert.ok(illegal.error);
ui=reduceC3Session(ui,{type:'ALLOCATE',consumer:'science',delta:1},config,fixture);
assert.equal(previewC3(ui,config).used,1);
ui=reduceC3Session(ui,{type:'COMMIT'},config,fixture);
assert.equal(ui.screen,'report');
assert.equal(ui.reveal.history.day,1);
ui=reduceC3Session(ui,{type:'CONTINUE'},config,fixture);
assert.equal(ui.screen,'planning');
ui=reduceC3Session(ui,{type:'COMMIT'},config,fixture);
assert.equal(ui.screen,'report');
ui=reduceC3Session(ui,{type:'CONTINUE'},config,fixture);
assert.equal(ui.screen,'debrief'); // no Air: second day underpowered
ui=reduceC3Session(ui,{type:'RESTART'},config,fixture);
assert.equal(ui.screen,'briefing');
assert.equal(ui.game.battery,0);
assert.equal(ui.game.comms.pending,null);
assert.equal(ui.game.expedition.active,null);
assert.equal(ui.game.research.available,0);

// Representative upgraded rooms have tangible next-turn effects.
const lvl2 = room => ({...createC3State(config,fixture),roomLevels:{...createC3State(config,fixture).roomLevels,[room]:2}});
assert.equal(c3Generation(lvl2('power'),config),11);
assert.equal(c3BatteryCapacity(lvl2('power'),config),4);
assert.equal(c3ReplyTurns(lvl2('comms'),config),1);
const withScience=simulateC3Day(lvl2('science'),basePlan(1),fixture,config);
assert.equal(withScience.history[0].research.gained,3);
const greenhouseTomorrow=simulateC3Day(lvl2('greenhouse'),basePlan(1),fixture,config);
assert.equal(greenhouseTomorrow.greenhouseYesterday,3);
const shieldTomorrow=simulateC3Day(lvl2('shield'),basePlan(1),fixture,config);
assert.ok(shieldTomorrow.meters.safety>=safe.history[0].meters.safety);
// A real Research Point investment must still admit successful survival.
let upgradedRun=createC3State(config,fixture);
while(upgradedRun.status==='running') {
  const chosen=basePlan(upgradedRun.day);
  if(upgradedRun.day===3){ chosen.allocation.science=1;chosen.upgradeRoom='shield'; }
  upgradedRun=simulateC3Day(upgradedRun,chosen,fixture,config);
}
assert.equal(upgradedRun.status,'succeeded');
assert.equal(upgradedRun.roomLevels.shield,2);
assert.ok(upgradedRun.meters.safety>=safe.meters.safety);
// Source-level guard: pure engine cannot refer to browser/network/real-time randomness.
const engine=readFileSync(resolve('src/logic/v3/engine.js'),'utf8');
for(const forbidden of ['Math.random','Date.now','fetch(',"from 'react'",'document.','window.']) assert.ok(!engine.includes(forbidden),forbidden);
assert.ok(!engine.includes('src/ui/'));

// Real integration, when user's approved mission is installed (not fabricated here).
const dir=resolve('src/data/missions');
const realFiles=readdirSync(dir).filter(name=>name.endsWith('.json'));
if(realFiles.length && JSON.parse(readFileSync(join(dir,realFiles[0]),'utf8')).dataSource==='NASA DONKI (archived data)'){
  const mission=JSON.parse(readFileSync(join(dir,realFiles[0]),'utf8'));
  let s=createC3State(config,mission);
  while(s.status==='running') s=simulateC3Day(s,basePlan(s.day),mission,config,82);
  assert.equal(s.status,'succeeded');
  assert.ok(s.history.every(h=>h.sourceIds.every(id=>typeof id==='string'&&id.length>0)));
  process.stdout.write(`Additional genuine embedded mission smoke check passed: ${mission.missionId}\n`);
} else {
  process.stdout.write('Genuine NASA mission integration pending: no approved mission file was supplied in this local package.\n');
}
process.stdout.write('Reevaluation C: rule, balance, upgrade, recovery, battery, expedition, communication and reducer checks passed.\n');
