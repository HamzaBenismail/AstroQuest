import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { buildC3Candidate } from '../scripts/reevaluation-c-candidate.mjs';
import {
  createC3State, createC3Plan, simulateC3Day, validateC3Plan,
  c3ChooseAdvice, c3UpgradeCost, c3WeatherEstimate,
} from '../src/logic/v3/engine.js';
import { initC3Session, reduceC3Session } from '../src/ui/v3/controller.js';

const data = JSON.parse(readFileSync(new URL('../src/data/config.json', import.meta.url),'utf8'));
const config = buildC3Candidate({...data,stormMapping:{...data.stormMapping,status:'approved'}});
const storms = [2,2,3,2,3,3,2,3,3,3]; // fixture: gameplay severity only, not real NASA source records
const mission = {
  missionId:'VITEST-FIXTURE',site:'moon',dataSource:'TEST ONLY',
  days:storms.map((stormLevel,i)=>({day:i+1,date:`synthetic-${i+1}`,stormLevel,events:[]})),
};
const safePlan = day => ({...createC3Plan(config),allocation:{lifeSupport:3,shield:3,greenhouse:2,science:day<=4?2:1}});

describe('Reevaluation C — core economy and progression',()=>{
  it('rejects overspending, battery overcharging and speculative upgrade currency',()=>{
    const s=createC3State(config,mission);
    expect(validateC3Plan(s,safePlan(1),config).ok).toBe(true);
    expect(validateC3Plan(s,{...safePlan(1),allocation:{...safePlan(1).allocation,science:3}},config).ok).toBe(false);
    expect(validateC3Plan(s,{...safePlan(1),charge:1},config).ok).toBe(false);
    expect(validateC3Plan(s,{...createC3Plan(config),upgradeRoom:'science'},config).ok).toBe(false);
  });
  it('makes a win and a loss possible on the same storm-level sequence',()=>{
    let win=createC3State(config,mission);
    while(win.status==='running')win=simulateC3Day(win,safePlan(win.day),mission,config,42);
    expect(win.status).toBe('succeeded');
    let lose=createC3State(config,mission);
    while(lose.status==='running')lose=simulateC3Day(lose,{...createC3Plan(config),allocation:{lifeSupport:1,shield:0,greenhouse:1,science:1}},mission,config,42);
    expect(lose.status).toBe('failed');
  });
  it('deducts upgrade points, retains lifetime earned score, and increases cost',()=>{
    const state={...createC3State(config,mission),research:{earned:12,available:12}};
    const p=createC3Plan(config);p.upgradeRoom='power';
    const upgraded=simulateC3Day(state,p,mission,config,42);
    expect(upgraded.roomLevels.power).toBe(2);
    expect(upgraded.research.earned).toBe(12);
    expect(upgraded.research.available).toBe(9);
    expect(c3UpgradeCost('power',upgraded,config).points).toBe(7);
  });
  it('recovery costs Supplies and Energy and has a cooldown',()=>{
    const state={...createC3State(config,mission),meters:{air:5,supplies:4,safety:4}};
    const p=createC3Plan(config);p.care=true;
    const result=simulateC3Day(state,p,mission,config,42);
    expect(result.meters.supplies).toBe(2);
    expect(result.meters.safety).toBe(1); // no shield; storm loss > care gain
    expect(validateC3Plan(result,{...createC3Plan(config),care:true},config).ok).toBe(false);
  });
  it('battery charge moves surplus generation forward and draw is conserved',()=>{
    const state=createC3State(config,mission);
    const plan={...createC3Plan(config),charge:2};
    const next=simulateC3Day(state,plan,mission,config,42);
    expect(next.battery).toBe(2);
    const current={...next,meters:{air:7,supplies:6,safety:7}};
    const use={...createC3Plan(config),allocation:{lifeSupport:4,greenhouse:3,science:3,shield:2}};
    const pv=validateC3Plan(current,use,config);
    expect(pv.ok).toBe(true);
    expect(pv.batteryDraw).toBe(2);
  });
  it('expedition rewards cannot be collected immediately',()=>{
    const start=createC3State(config,mission);
    const trip={...safePlan(1),allocation:{...safePlan(1).allocation,science:1},expedition:'science-sampling'};
    const first=simulateC3Day(start,trip,mission,config,42);
    expect(first.expedition.active.dueDay).toBe(3);
    expect(first.history[0].research.gained).toBe(1);
    const second=simulateC3Day(first,safePlan(2),mission,config,42);
    expect(second.history[1].research.gained).toBe(2);
    const third=simulateC3Day(second,safePlan(3),mission,config,42);
    expect(third.history[2].research.gained).toBe(6);
  });
  it('gives contextual advice without reading hidden future events',()=>{
    const s=createC3State(config,mission);
    expect(c3ChooseAdvice({...s,meters:{air:2,supplies:7,safety:8}},null,config).focus).toBe('lifeSupport');
    expect(c3WeatherEstimate(3,mission,config,45)).toBe(c3WeatherEstimate(3,mission,config,45));
  });
  it('restarts cleanly, without carrying upgrades or pending activities',()=>{
    let ui=initC3Session(config,mission);
    ui=reduceC3Session(ui,{type:'START'},config,mission);
    ui=reduceC3Session(ui,{type:'RESTART'},config,mission);
    expect(ui.screen).toBe('briefing');
    expect(ui.game.battery).toBe(0);
    expect(ui.game.comms.pending).toBeNull();
    expect(ui.game.roomLevels.lifeSupport).toBe(1);
  });
});
