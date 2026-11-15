import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  CINEMATIC_DURATIONS, forecastMotion, cinematicDestination, endingMotion,
  canBeginDayAnimation, launchPhases,
} from '../src/ui/v4/cinematicRules.js';

const root = process.cwd();
const experience = readFileSync(join(root,'src/ui/v4/CrewMissionExperience.jsx'),'utf8');
const cinematic = readFileSync(join(root,'src/ui/v4/CinematicScenes.jsx'),'utf8');
const css = readFileSync(join(root,'src/ui/v4/cinematics.css'),'utf8');
const original = readFileSync(join(root,'src/ui/v4/crewFlow.js'),'utf8');
assert.deepEqual([0,1,2,3].map(level=>forecastMotion(level)),['quiet','minor','moderate','severe']);
assert.throws(()=>forecastMotion(4),RangeError);
assert.throws(()=>forecastMotion(1.5),RangeError);
assert.equal(cinematicDestination('moon'),'Moon');
assert.equal(cinematicDestination('mars'),'Mars');
assert.throws(()=>cinematicDestination('jupiter'));
assert.equal(endingMotion('succeeded'),'return');
assert.equal(endingMotion('failed'),'wreckage');
assert.throws(()=>endingMotion('running'));
assert.equal(canBeginDayAnimation(true,true,true),true);
assert.equal(canBeginDayAnimation(true,false,true),false);
assert.equal(canBeginDayAnimation(true,true,false),false);
assert.equal(canBeginDayAnimation(false,true,true),false);
for(const destination of ['moon','mars']){
  const stages=launchPhases(destination);
  assert.deepEqual(stages.map(stage=>stage.phase),['flight','smoke','landing']);
  assert.ok(stages.every(stage=>stage.duration>0));
  assert.ok(stages.every(stage=>stage.caption.includes(cinematicDestination(destination)) || stage.phase==='smoke'));
}
assert.equal(CINEMATIC_DURATIONS.launchFlight+CINEMATIC_DURATIONS.launchSmoke+CINEMATIC_DURATIONS.launchLanding,3950);
assert.ok(CINEMATIC_DURATIONS.dayTransition>500);
assert.ok(CINEMATIC_DURATIONS.reportExit>200);
for(const src of ['ship-explorer-sealed.svg','ship-titan-sealed.svg','ship-horizon-sealed.svg','ship-nova-sealed.svg',
 'moon-landscape.svg','mars-landscape.svg','classic-scattered-stars.svg']){
  assert.ok(existsSync(join(root,'public/art',src)),src);
}
assert.match(experience, /setCinematic\(\{kind:'day', day:state\.session\.game\.day, forecast/);
assert.match(experience, /c3WeatherEstimate\(state\.session\.game\.day, mission, config, state\.session\.seed\)/);
assert.match(experience, /if \(canBeginDayAnimation\(true, budget\.ok, staffed\.ok\)\)/);
assert.match(experience, /if \(cinematic\?\.kind === 'day'\) dispatch\(\{type:'COMMIT_DAY'\}\);/);
assert.ok(!experience.includes('setTimeout(() => dispatch({type:\'COMMIT_DAY\'})'), 'Only a finished animation dispatches COMMIT_DAY');
assert.match(experience, /reportExiting/);
assert.match(experience, /CrewDayReport/);
assert.match(experience, /EndingShipStage ship=\{state\.ship\} status=\{d\.status\}/);
assert.match(experience, /<LaunchCinematic/);
assert.match(experience, /<DayPassage/);
assert.match(experience, /<ReportShipStage/);
assert.match(experience, /aria-hidden="true"><CrewGameplay/);
assert.match(cinematic, /const finished = useRef\(false\)/);
assert.match(cinematic, /if \(finished\.current\) return/);
assert.match(cinematic, /clearTimeout\(a\);clearTimeout\(b\);clearTimeout\(c\)/);
assert.match(cinematic, /clearTimeout\(timer\)/);
assert.match(cinematic, /role="dialog" aria-modal="true"/);
assert.match(cinematic, /Skip animation/);
assert.match(cinematic, /matchMedia\?\.\('\(prefers-reduced-motion: reduce\)'\)/);
for (const type of ['quiet','minor','moderate','severe']) assert.ok(css.includes(`data-weather="${type}"`) || type==='quiet');
assert.match(css, /\.smp-cine--day\[data-weather="moderate"\] \.smp-cine__day-ship\{animation:smp-shake-small/);
assert.match(css, /\.smp-cine--day\[data-weather="severe"\] \.smp-cine__day-ship\{animation:smp-shake-big/);
assert.match(css, /\.smp-cine--day\[data-weather="minor"\] \.smp-cine__distant-storm/);
assert.match(css, /\.crew-report\.smp-report-layout\.is-exiting/);
assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
assert.match(css, /\.smp-ending-scene__wreck--front/);
assert.match(css, /\.smp-ending-scene__earth/);
// Previous gameplay reducer is preserved; our new code must import it, not duplicate physics.
assert.match(original, /case 'COMMIT_DAY'/);
assert.ok(!cinematic.includes('simulateC3Day'));
assert.ok(!cinematic.includes('fetch('));
console.log('D11 animation rules, transition orchestration, skip guards, responsive asset references and reduced-motion coverage PASS');
