import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import base from '../src/data/config.json';
import {
  createV2State, validateV2Plan, simulateV2Day, v2Forecast,
  selectUpgrade, v2Debrief,
} from '../src/logic/v2/engine.js';
import { ROOMS, initV2Session, reduceV2Session } from '../src/ui/v2/controller.js';
import CutawayScene from '../src/scene/CutawayScene.jsx';
import MissionExperience from '../src/ui/v2/MissionExperience.jsx';

const config = {
  ...base,
  meterMin: base.meterMin ?? 0,
  failureMeterThreshold: base.failureMeterThreshold ?? 0,
  zeroShieldSafetyPenalty: base.zeroShieldSafetyPenalty ?? 1,
  calmShieldRecovery: base.calmShieldRecovery ?? 1,
  calmShieldRecoveryMinAllocation: base.calmShieldRecoveryMinAllocation ?? 1,
  reevaluation: {
    version: 2, startingSafety: 10, reducedDayEnergy: 9,
    research:{unlockThreshold:4,pointsPerPower:1,airUseReduction:1,airUseMin:1,improvedForecastErrorTable:[-1,0,0,0]},
    comms:{sendEnergyCost:1,baseResponseTurns:1,interferenceExtraTurns:1,interferenceStormLevel:3},
  },
};
// Game-level sequence is copied from the approved mission; event records here are intentionally synthetic/empty.
const sequence=[2,2,3,2,3,3,2,3,3,3];
const mission={missionId:'fixture-only',dataSource:'TEST FIXTURE ONLY',days:sequence.map((stormLevel,i)=>({day:i+1,date:`synthetic-${i+1}`,stormLevel,events:[]}))};
const safe = day => ({lifeSupport:3,shield:3,greenhouse:2,science:day<5?2:1});

function run(policy) {
  let s=createV2State(config,mission);
  while(s.status==='running')s=simulateV2Day(s,policy(s.day),null,mission,config,v2Forecast(s.day,s,mission,config,31));
  return s;
}

describe('Reevaluation B — pure logic, controller and visible scene',()=>{
  it('provides three survival meters and six selectable rooms',()=>{
    expect(Object.keys(createV2State(config,mission).meters)).toEqual(['air','supplies','safety']);
    expect(ROOMS).toHaveLength(6);
  });
  it('charges Earth requests inside the shared Energy cap',()=>{
    const state=createV2State(config,mission);
    expect(validateV2Plan(state,safe(1),null,config).ok).toBe(true);
    expect(validateV2Plan(state,safe(1),'weather-review',config).ok).toBe(false);
    expect(validateV2Plan(state,{...safe(1),science:1},'weather-review',config).ok).toBe(true);
  });
  it('reaches win and loss using the fixed approved mission storm-level sequence',()=>{
    const win=run(safe);
    expect(win.status).toBe('succeeded');
    expect(win.meters.safety).toBe(4);
    expect(v2Debrief(win,mission).score).toBe(14);
    const fail=run(day=>({lifeSupport:3,shield:2,greenhouse:2,science:day<=4?3:2}));
    expect(fail.status).toBe('failed');
    expect(fail.completedDays).toBeLessThan(config.missionLengthDays);
  });
  it('waits for due turn, delays severe-weather response once, then delivers',()=>{
    let s=createV2State(config,mission);
    s=simulateV2Day(s,safe(1),null,mission,config,2);
    s=simulateV2Day(s,{...safe(2),science:1},'research-advice',mission,config,2);
    expect(s.comms.pending.dueDay).toBe(3);
    s=simulateV2Day(s,safe(3),null,mission,config,3);
    expect(s.comms.pending.postponed).toBe(true);
    s=simulateV2Day(s,safe(4),null,mission,config,2);
    expect(s.comms.lastResponse.kind).toBe('research-advice');
    expect(s.comms.pending).toBe(null);
  });
  it('research upgrade is earned, exclusive and active only on later turns',()=>{
    let s=createV2State(config,mission);
    s=simulateV2Day(s,safe(1),null,mission,config,2);
    s=simulateV2Day(s,safe(2),null,mission,config,2);
    expect(s.researchTotal).toBe(4);
    const upgraded=selectUpgrade(s,'air-recycler',config);
    expect(upgraded.upgradeDay).toBe(2);
    expect(()=>selectUpgrade(upgraded,'weather-analyst',config)).toThrow();
    const after=simulateV2Day(upgraded,safe(3),null,mission,config,3);
    expect(after.meters.air).toBe(6);
    expect(s.meters.air).toBe(5);
  });
  it('controller allows room selection and returns a structured reveal',()=>{
    let s=initV2Session(config,mission);
    s=reduceV2Session(s,{type:'START'},config,mission);
    s=reduceV2Session(s,{type:'SELECT_ROOM',room:'greenhouse'},config,mission);
    expect(s.selectedRoom).toBe('greenhouse');
    for(const [consumer,value] of Object.entries(safe(1))){
      for(let i=0;i<value;i++) s=reduceV2Session(s,{type:'ALLOCATE',consumer,delta:1},config,mission);
    }
    s=reduceV2Session(s,{type:'COMMIT'},config,mission);
    expect(s.screen).toBe('report');
    expect(s.reveal.realLevel).toBe(2);
  });
  it('renders accessible room buttons and an integrated briefing',()=>{
    const initial=initV2Session(config,mission);
    const html=renderToStaticMarkup(<MissionExperience config={config} mission={mission}/>);
    expect(html).toContain('Launch Mission');
    let planning=reduceV2Session(initial,{type:'START'},config,mission);
    const roomHtml=renderToStaticMarkup(<CutawayScene config={config} session={planning} onSelectRoom={()=>{}}/>);
    expect((roomHtml.match(/aria-pressed="false"/g)||[]).length).toBeGreaterThanOrEqual(5);
    expect(roomHtml).toContain('Select Storm Shelter');
    expect(roomHtml).toContain('/art/cutaway-base.svg');
  });
});
