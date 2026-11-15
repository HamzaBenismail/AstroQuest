/** Tests to run in the team's working Reevaluation C checkout, after opt-in. */
import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import original from '../src/data/config.json';
import mission from '../src/data/missions/storm-window-2024-05-08.json';
import CrewMissionExperience, { CrewGameplay, CrewDayReport, CrewAssembly } from '../src/ui/v4/CrewMissionExperience.jsx';
import { initCrewExperience, reduceCrewExperience } from '../src/ui/v4/crewFlow.js';
import { checkCrewStaffing } from '../src/logic/v4/crewRules.js';
import { c3WeatherEstimate } from '../src/logic/v3/engine.js';
import { ROOM_ACCENTS, CREW_COLOR_NAMES } from '../src/ui/v4/crewColors.js';
import { roomTapAction } from '../src/ui/v4/crewTap.js';

const config = {
  ...original,
  reevaluation: {
    ...original.reevaluation,
    version: 3,
    crewUI: {
      enabled:true,crewCount:4,crewMax:6,crewNames:['Ari','Nova','Kai','Sol'],defaultRoomEnergy:1,
      cargoCapacity:10,minimumAir:2,minimumSupplies:2,cargoDefaults:{air:5,supplies:4,battery:1},
    },
  },
};

function make() { return initCrewExperience(config); }
function next(state, action) { return reduceCrewExperience(state, action, config, mission); }
function assemble() { return next(next(make(), {type:'OPEN_PREPARATION'}), {type:'OPEN_CREW_ASSEMBLY'}); }
function launchWithOne() { const launched=next(assemble(),{type:'LAUNCH'}); return next(next(launched,{type:'PICK_CREW',id:'crew-1'}),{type:'PLACE_CREW',room:'power'}); }

describe('Reevaluation D — spacecraft, cargo and worker gameplay', () => {
  it('renders all four selectable spacecraft on the menu', () => {
    const markup = renderToStaticMarkup(<CrewMissionExperience config={config} mission={mission}/>);
    for (const ship of ['Explorer','Titan','Horizon','Nova']) expect(markup).toContain(ship);
    expect(markup).toContain('Prepare mission');
    expect(markup).toContain('aria-pressed="true"');
  });
  it('shows six distinct color-matched applicants in all three styles, without preflight placement', () => {
    const state=assemble();
    expect(state.crew).toHaveLength(5); // preserve existing easy-start selection; sixth is optional
    expect(state.crew.every(c=>c.room===null)).toBe(true);
    for(const style of ['classic','playful','starry']) {
      const html=renderToStaticMarkup(<CrewAssembly state={state} config={config} dispatch={()=>{}} uiStyle={style} onToggleStyle={()=>{}}/>);
      expect(html).toContain(`data-menu-style="${style}"`);
      expect(html).toContain('Choose your crew');
      expect(html).toContain('Launch with 5 astronauts');
      expect(html).not.toContain('Match specialties');
      expect(html).not.toContain('data-drop-room=');
      for(const name of ['Ari','Juno','Rhea','Sol','Kai','Milo'])expect(html).toContain(name);
      for(const name of Object.values(CREW_COLOR_NAMES))expect(html).toContain(`${name} suit`);
    }
    expect(new Set(Object.values(ROOM_ACCENTS)).size).toBe(6);
  });
  it('allows choosing six but defers all placements until landing', () => {
    let state=assemble();
    state=next(state,{type:'TOGGLE_CANDIDATE',id:'crew-6'});
    expect(state.error).toBeNull();
    expect(state.crew).toHaveLength(6);
    state=next(state,{type:'PLACE_CREW',id:'crew-1',room:'power'});
    expect(state.crew.every(c=>c.room===null)).toBe(true);
    state=next(state,{type:'LAUNCH'});
    expect(state.stage).toBe('play');
    expect(state.crew).toHaveLength(6);
    expect(state.crew.every(c=>c.room===null)).toBe(true);
    expect(state.session.plan.allocation.lifeSupport).toBe(0);
  });
  it('tapping a worker selects the department, not the overlapping astronaut',()=>{
    expect(roomTapAction('power',null,'crew-1')).toEqual({type:'FOCUS_ROOM',room:'power'});
    expect(roomTapAction('power','crew-2','crew-1')).toEqual({type:'FOCUS_ROOM',room:'power'});
    expect(roomTapAction('science','crew-2',null)).toEqual({type:'PLACE_CREW',room:'science'});
  });
  it('transitions from menu through Moon/Mars cargo choice to planning', () => {
    let state = next(make(), { type: 'SELECT_SHIP', ship: 'nova' });
    state = next(state, { type: 'OPEN_PREPARATION' });
    state = next(state, { type: 'SELECT_DESTINATION', destination: 'mars' });
    expect(state.destination).toBe('mars');
    state = next(state, { type: 'OPEN_CREW_ASSEMBLY' });
    expect(state.stage).toBe('crew-assembly');
    state = next(state, { type: 'LAUNCH' });
    expect(state.stage).toBe('play');
    expect(state.ship).toBe('nova');
    expect(state.session.screen).toBe('planning');
    expect(state.crew).toHaveLength(5);
    expect(state.session.game.meters.air).toBe(5);
    expect(state.session.game.meters.supplies).toBe(4);
    expect(state.session.game.battery).toBe(1);
  });
  it('automatically refunds powered rooms when their crew member moves', () => {
    let state = launchWithOne();
    state = next(state, {type:'PICK_CREW',id:'crew-1'});
    state = next(state, {type:'PLACE_CREW',room:'lifeSupport'});
    expect(state.session.plan.allocation.lifeSupport).toBe(1);
    state = next(state, {type:'SET_POWER',room:'lifeSupport',amount:3});
    expect(state.session.plan.allocation.lifeSupport).toBe(3);
    state = next(state, {type:'PICK_CREW',id:'crew-1'});
    state = next(state, {type:'PLACE_CREW',room:'greenhouse'});
    expect(state.session.plan.allocation.lifeSupport).toBe(0);
    expect(state.session.plan.allocation.greenhouse).toBe(1);
    expect(checkCrewStaffing(state.crew,state.session.plan).ok).toBe(true);
  });
  it('shows a seeded one-day storm forecast before committing the day', () => {
    let state = launchWithOne();
    const level = c3WeatherEstimate(state.session.game.day, mission, config, state.session.seed);
    const labels = ['Quiet','Minor','Moderate','Severe'];
    const html = renderToStaticMarkup(<CrewGameplay state={state} config={config} mission={mission} dispatch={()=>{}}/>);
    expect(html).toContain('STORM FORECAST');
    expect(html).toContain(labels[level]);
    expect(html).toContain('may differ by one level');
  });
  it('centers closed rooms and keeps an assigned room interior open until the worker leaves', () => {
    let state = launchWithOne();
    const render = () => renderToStaticMarkup(<CrewGameplay state={state} config={config} mission={mission} dispatch={()=>{}}/>);
    expect(render()).toContain('ship-explorer-sealed.svg');
    for(const color of ['orange','green','yellow','blue','purple','pink']) expect(render()).toContain(`data-room-color="${color}"`);
    expect(render()).not.toContain('room-greenhouse.svg');
    state = next(state,{type:'PICK_CREW',id:'crew-1'});
    state = next(state,{type:'HOVER_ROOM',room:'greenhouse'});
    expect(render()).toContain('room-greenhouse.svg');
    expect(render()).toContain('data-room-open="true"');
    state = next(state,{type:'PLACE_CREW',room:'greenhouse'});
    expect(render()).toContain('room-greenhouse.svg');
    expect(render()).toContain('data-room-open="true"');
    expect(render()).not.toContain('room-science.svg');
    state = next(state,{type:'PICK_CREW',id:'crew-1'});
    state = next(state,{type:'PLACE_CREW',room:null});
    expect(render()).not.toContain('room-greenhouse.svg');
  });
  it('compares the forecast and revealed storm in the day report', () => {
    let state = launchWithOne();
    state = next(state,{type:'COMMIT_DAY'});
    expect(state.session.screen).toBe('report');
    const html = renderToStaticMarkup(<CrewDayReport state={state} config={config} mission={mission} dispatch={()=>{}}/>);
    expect(html).toContain('Forecast:');
    expect(html).toContain('Actual game level:');
    expect(html).toContain('ARCHIVED NASA DATA');
  });
  it('rejects powering rooms without an astronaut or duplicating crew', () => {
    let state = launchWithOne();
    state = next(state, {type:'SET_POWER',room:'science',amount:2});
    expect(state.session.plan.allocation.science).toBe(0);
    expect(state.error).toMatch(/Assign an astronaut/);
    state = next(state, {type:'PICK_CREW',id:'crew-1'});
    state = next(state, {type:'PLACE_CREW',room:'science'});
    state = next(state, {type:'PICK_CREW',id:'crew-2'});
    state = next(state, {type:'PLACE_CREW',room:'science'});
    expect(state.error).toMatch(/one astronaut/);
    expect(state.crew.find(c=>c.id==='crew-2').room).toBe(null);
  });
});
