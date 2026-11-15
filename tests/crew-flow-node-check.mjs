/**
 * Dependency-free smoke test of the v3 integration boundary using synthetic
 * stand-in modules. This is NOT a substitute for the real v3 integration test.
 */
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, copyFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';

const temp = mkdtempSync(join(tmpdir(),'smp-crew-flow-'));
try {
  const copy = (from, to) => { mkdirSync(dirname(to),{recursive:true});copyFileSync(from,to);};
  copy('src/ui/v4/crewFlow.js',join(temp,'src/ui/v4/crewFlow.js'));
  copy('src/logic/v4/crewRules.js',join(temp,'src/logic/v4/crewRules.js')); 
  copy('src/logic/v4/discoveries.js',join(temp,'src/logic/v4/discoveries.js'));
  copy('src/data/discoveries.js',join(temp,'src/data/discoveries.js'));
  writeFileSync(join(temp,'package.json'),JSON.stringify({type:'module'}));
  mkdirSync(join(temp,'src/ui/v3'),{recursive:true});
  mkdirSync(join(temp,'src/logic/v3'),{recursive:true});
  writeFileSync(join(temp,'src/logic/v3/engine.js'),`
    export function validateC3Plan(game, plan, config) {
      const used=Object.values(plan.allocation).reduce((s,x)=>s+x,0)+plan.charge+
        (plan.care?1:0)+(plan.requestAdvice?1:0)+(plan.expedition?1:0)+(plan.upgradeRoom?1:0);
      return used>10?{ok:false,reason:'Too much Energy'}:{ok:true,used,generation:10,batteryDraw:0};
    }
  `);
  writeFileSync(join(temp,'src/ui/v3/controller.js'),`
    import { validateC3Plan } from '../../logic/v3/engine.js';
    export const initC3Session = (config,mission) => ({
      screen:'briefing', game:{day:1,completedDays:0,status:'running',
        meters:{air:config.startingMeters.air,supplies:config.startingMeters.food,safety:10},battery:0,
        expedition:{active:null},history:[],comms:{pending:null},roomLevels:{},research:{earned:0,available:0}},
      plan:{allocation:{lifeSupport:0,shield:0,greenhouse:0,science:0},care:false,charge:0,
        requestAdvice:false,upgradeRoom:null,expedition:null}, reveal:null,
    });
    export const previewC3 = (s,c) => validateC3Plan(s.game,s.plan,c);
    export function reduceC3Session(s,a,c,m){
      if(a.type==='START')return {...s,screen:'planning'};
      if(a.type==='COMMIT'){
        const p=previewC3(s,c);if(!p.ok)return {...s,error:p.reason};
        const d=s.game.day; const gained=s.plan.allocation.science;
        const research={earned:s.game.research.earned+gained,available:s.game.research.available+gained};
        const history={day:d, events:[],research:{gained,total:research.earned,available:research.available}};
        const game={...s.game,day:d+1,completedDays:d,research,
          history:[...s.game.history,history],
          expedition:{active:s.plan.expedition?{kind:s.plan.expedition,dueDay:d+2}:s.game.expedition.active}};
        if(game.expedition.active?.dueDay<=d)game.expedition={active:null};
        if(d===10)game.status='succeeded';
        return {...s,screen:'report',game,reveal:{day:d,history,sourceEvents:[]}};
      }
      if(a.type==='CONTINUE')return {...s,screen:s.game.status==='running'?'planning':'debrief',
        plan:{allocation:{lifeSupport:0,shield:0,greenhouse:0,science:0},care:false,charge:0,
          requestAdvice:false,upgradeRoom:null,expedition:null}};
      return s;
    }
  `);
  const { initCrewExperience, reduceCrewExperience } = await import(pathToFileURL(join(temp,'src/ui/v4/crewFlow.js')).href);
  const config={meterMax:10,startingMeters:{air:5,food:4},allocationRanges:{
    lifeSupport:[0,4],greenhouse:[0,3],science:[0,3],shield:[0,3]},
    reevaluation:{version:3,c3:{battery:{baseCapacity:2},expeditions:{'supply-retrieval':{duration:2}}},
      discovery:{enabled:true,specialistRoom:'science',minScienceEnergy:1,daysPerDiscovery:2,bonusResearchPoints:2,maxPerRun:4},
      crewUI:{enabled:true,crewCount:4,crewMax:6,crewNames:['Ari','Nova','Kai','Sol'],defaultRoomEnergy:1,
        cargoCapacity:10,minimumAir:2,minimumSupplies:2,cargoDefaults:{air:5,supplies:4,battery:1}}}};
  const mission={missionId:'TEST-ONLY'};
  const step=a=>{state=reduceCrewExperience(state,a,config,mission);return state;};
  let state=initCrewExperience(config);
  assert.equal(state.stage,'menu');
  step({type:'SELECT_SHIP',ship:'nova'});
  step({type:'OPEN_PREPARATION'});
  assert.equal(state.stage,'preparation');
  step({type:'SELECT_DESTINATION',destination:'mars'});
  assert.equal(state.destination,'mars');
  step({type:'SET_CARGO',resource:'air',delta:1});
  assert.ok(state.error); // at cargo capacity
  step({type:'SET_CARGO',resource:'battery',delta:-1});
  step({type:'SET_CARGO',resource:'air',delta:1});
  assert.equal(state.cargo.air,6);
  step({type:'OPEN_CREW_ASSEMBLY'});
  assert.equal(state.stage,'crew-assembly');
  assert.equal(state.crew.length,5);
  step({type:'TOGGLE_CANDIDATE',id:'crew-6'});
  assert.equal(state.crew.length,6);
  assert.ok(state.crew.every(c=>c.room===null), 'No assignments during assembly');
  step({type:'PLACE_CREW',id:'crew-1',room:'power'});
  assert.ok(state.crew.every(c=>c.room===null), 'Preflight placement must be ignored');
  step({type:'LAUNCH'});
  assert.equal(state.stage,'play');
  assert.equal(state.crew.length,6);
  assert.ok(state.crew.every(c=>c.room===null),'Everyone lands in the dock');
  assert.equal(state.session.screen,'planning');
  assert.equal(state.crew.length,6);
  assert.equal(state.session.game.meters.air,6);
  assert.equal(state.session.game.battery,0);
  step({type:'PICK_CREW',id:'crew-1'});
  step({type:'PLACE_CREW',room:'power'});
  step({type:'PICK_CREW',id:'crew-1'});
  step({type:'PLACE_CREW',room:'lifeSupport'});
  assert.equal(state.crew[0].room,'lifeSupport');
  assert.equal(state.session.plan.allocation.lifeSupport,1);
  step({type:'SET_POWER',room:'lifeSupport',amount:3});
  assert.equal(state.session.plan.allocation.lifeSupport,3);
  step({type:'SET_POWER',room:'shield',amount:1});
  assert.match(state.error,/Assign an astronaut/);
  step({type:'PICK_CREW',id:'crew-1'});
  step({type:'PLACE_CREW',room:'greenhouse'});
  assert.equal(state.session.plan.allocation.lifeSupport,0);
  assert.equal(state.session.plan.allocation.greenhouse,1);
  step({type:'PICK_CREW',id:'crew-2'});
  step({type:'PLACE_CREW',room:'lifeSupport'});
  step({type:'SET_POWER',room:'lifeSupport',amount:3});
  step({type:'PICK_CREW',id:'crew-3'});
  step({type:'PLACE_CREW',room:'shield'});
  step({type:'SET_POWER',room:'shield',amount:3});
  step({type:'TOGGLE_ACTION',action:'EXPEDITION',kind:'supply-retrieval'});
  assert.equal(state.session.plan.expedition,'supply-retrieval');
  step({type:'COMMIT_DAY'});
  assert.equal(state.session.screen,'report');
  assert.equal(state.crew.find(c=>c.id==='crew-4').awayUntilDay,3);
  step({type:'CONTINUE'});
  assert.equal(state.session.screen,'planning');
  assert.equal(state.crew.find(c=>c.id==='crew-4').awayUntilDay,3);
  step({type:'COMMIT_DAY'});
  step({type:'CONTINUE'});
  step({type:'COMMIT_DAY'});
  step({type:'CONTINUE'});
  assert.equal(state.crew.find(c=>c.id==='crew-4').awayUntilDay,null);
  // A completed replay keeps the player's preflight six-person roster (all in dock).
  while (state.session.game.status === 'running') {
    if (state.session.screen === 'planning') step({type:'COMMIT_DAY'});
    if (state.session.screen === 'report') step({type:'CONTINUE'});
  }
  assert.equal(state.session.screen,'debrief');
  step({type:'RETRY'});
  assert.equal(state.session.screen,'planning');
  assert.equal(state.crew.length,6);
  assert.equal(state.crew.find(c=>c.id==='crew-1').room,null);
  assert.ok(state.crew.every(c=>c.awayUntilDay===null));
  assert.equal(state.crew.find(c=>c.id==='crew-6').room,null);
  step({type:'BACK_TO_MENU'});
  assert.equal(state.stage,'menu');
  assert.equal(state.ship,'nova');
  assert.equal(state.destination,'mars');
  // D7: the base Science allocation works for anyone, but ONLY Sol's specialty earns a bonus.
  let science=initCrewExperience(config);
  const sp=a=>{ science=reduceCrewExperience(science,a,config,mission);return science; };
  sp({type:'OPEN_PREPARATION'});sp({type:'OPEN_CREW_ASSEMBLY'});sp({type:'LAUNCH'});
  sp({type:'PICK_CREW',id:'crew-2'});sp({type:'PLACE_CREW',room:'science'});
  sp({type:'SET_POWER',room:'science',amount:2});
  sp({type:'COMMIT_DAY'});
  assert.equal(science.discoveryProgress.qualifiedDays,0);
  assert.equal(science.session.game.research.earned,2);
  sp({type:'CONTINUE'});
  sp({type:'SET_POWER',room:'science',amount:2});sp({type:'COMMIT_DAY'});
  assert.equal(science.discoveryProgress.runIds.length,0);
  assert.equal(science.session.game.research.earned,4);
  sp({type:'CONTINUE'});
  sp({type:'PICK_CREW',id:'crew-2'});sp({type:'PLACE_CREW',room:null});
  sp({type:'PICK_CREW',id:'crew-4'});sp({type:'PLACE_CREW',room:'science'});
  sp({type:'SET_POWER',room:'science',amount:1});sp({type:'COMMIT_DAY'});
  assert.equal(science.discoveryProgress.qualifiedDays,1);
  assert.equal(science.discoveryProgress.runIds.length,0);
  sp({type:'CONTINUE'});
  sp({type:'SET_POWER',room:'science',amount:1});sp({type:'COMMIT_DAY'});
  assert.equal(science.discoveryProgress.qualifiedDays,2);
  assert.deepEqual(science.discoveryProgress.runIds,['bio-lettuce']);
  assert.equal(science.lifetimeDiscoveryIds.length,1);
  assert.equal(science.discoveryProgress.popupId,'bio-lettuce');
  assert.equal(science.session.reveal.history.discoveryBonus.points,2);
  assert.equal(science.session.game.research.earned,8); // 4 generic + 2 normal + 2 bonus
  assert.equal(science.session.game.research.available,8);
  sp({type:'DISMISS_DISCOVERY'});
  assert.equal(science.discoveryProgress.popupId,null);
  // Return to menu after completing the mission; the accumulated archive must survive.
  while(science.session.game.status==='running'){
    if(science.session.screen==='report')sp({type:'CONTINUE'});
    if(science.session.screen==='planning')sp({type:'COMMIT_DAY'});
  }
  if(science.session.screen==='report')sp({type:'CONTINUE'});
  assert.equal(science.session.screen,'debrief');
  sp({type:'OPEN_COLLECTION'});
  assert.equal(science.collectionScope,'run');
  sp({type:'CLOSE_COLLECTION'});
  sp({type:'RETRY'});
  assert.deepEqual(science.discoveryProgress.runIds,[]);
  assert.deepEqual(science.lifetimeDiscoveryIds,['bio-lettuce']);
  const pointsBefore = science.session.game.research.earned;
  sp({type:'BACK_TO_MENU'});sp({type:'OPEN_COLLECTION'});
  assert.equal(science.collectionScope,'lifetime');
  assert.deepEqual(science.lifetimeDiscoveryIds,['bio-lettuce']);
  // D10: reset is only effective while viewing the lifetime archive on the main menu.
  sp({type:'CLOSE_COLLECTION'});
  sp({type:'RESET_SAVED_DISCOVERIES'});
  assert.deepEqual(science.lifetimeDiscoveryIds,['bio-lettuce']);
  sp({type:'OPEN_COLLECTION'});
  sp({type:'RESET_SAVED_DISCOVERIES'});
  assert.deepEqual(science.lifetimeDiscoveryIds,[]);
  sp({type:'CLOSE_COLLECTION'});
  assert.deepEqual(science.lifetimeDiscoveryIds,[]);
  assert.ok(pointsBefore>=0);
  console.log('D7/D10 crew mock integration PASS: only science specialist gets bonus, report and wallet match, popup, run/lifetime archive, retry');
} finally { rmSync(temp,{recursive:true,force:true}); }
