/** Dependency-free Phase 4 controller acceptance. Run: node tests/phase4-node-check.mjs */
import assert from 'node:assert/strict';
import config from '../src/data/config.json' with { type: 'json' };
import { initialSession, reduceSession, allocationPreview } from '../src/ui/session.js';

const mission = {
  missionId: 'synthetic-ui-check-only', dataSource: 'TEST ONLY',
  days: Array.from({length:config.missionLengthDays},(_,i)=>({day:i+1,stormLevel:0,events:[],date:`test-day-${i+1}`})),
};
function action(state,type,extra={}) {return reduceSession(state,{type,...extra},config,mission);}
function allocate(state,name,n){for(let i=0;i<n;i++)state=action(state,'ALLOCATE',{consumer:name,delta:1});return state;}
function fill(state,values){for(const [name,n] of Object.entries(values)) state=allocate(state,name,n);return state;}
let ready=action(initialSession(config,mission),'START');
let capped=fill(ready,{lifeSupport:4,shield:3,greenhouse:3});
assert.equal(allocationPreview(capped.allocation,1,config).total,10);
assert.equal(action(capped,'ALLOCATE',{consumer:'science',delta:1}),capped);
assert.equal(action(capped,'ALLOCATE',{consumer:'shield',delta:1}),capped);
let win=ready;
for(let day=1;day<=config.missionLengthDays;day++){
  win=fill(win,{lifeSupport:3,shield:1,greenhouse:2,science:1});
  win=action(win,'COMMIT');
  assert.equal(win.screen,'reveal');
  assert.equal(win.reveal.day,day);
  win=action(win,'CONTINUE');
}
assert.equal(win.game.status,'succeeded');
assert.equal(win.screen,'debrief');
assert.equal(win.game.history.length,config.missionLengthDays);
assert.equal(action(win,'RESTART').screen,'briefing');
let lose=ready;
while(lose.game.status==='running'){lose=action(action(lose,'COMMIT'),'CONTINUE');}
assert.equal(lose.screen,'debrief');assert.equal(lose.game.reason,'air');
let unresolved=ready;
for(let day=1;day<config.missionLengthDays;day++){
  unresolved=fill(unresolved,{lifeSupport:3,shield:1,greenhouse:2});
  unresolved=action(action(unresolved,'COMMIT'),'CONTINUE');
}
unresolved={...unresolved,game:{...unresolved.game,meters:{...unresolved.game.meters,air:2}}};
unresolved=fill(unresolved,{lifeSupport:3,shield:1,greenhouse:2});
unresolved=action(unresolved,'COMMIT');
assert.match(unresolved.error,/team decision/);
assert.equal(unresolved.screen,'planning');
process.stdout.write('Phase 4 Node: PASS — budget cap, win, lose, reveal, restart, unresolved-day guard (synthetic mission)\n');
