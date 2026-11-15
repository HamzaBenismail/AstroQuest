import { useEffect, useReducer, useRef, useState } from 'react';
import { c3Debrief, c3UpgradeCost, c3BatteryCapacity, c3WeatherEstimate } from '../../logic/v3/engine.js';
import { previewC3 } from '../v3/controller.js';
import {
  SHIP_IDS, ROOM_IDS, POWERED_ROOMS, validateCargo, crewInRoom, freeCrewMember, checkCrewStaffing,
} from '../../logic/v4/crewRules.js';
import { initCrewExperience, reduceCrewExperience } from './crewFlow.js';
import { SHIP_DECK_LAYOUTS, shipHatchStyle } from './shipLayouts.js';
import { ROOM_ACCENTS, CREW_COLOR_NAMES, CREW_SUIT_COLORS } from './crewColors.js';
import { roomTapAction } from './crewTap.js';
import { LaunchCinematic, DayPassage, ReportShipStage, EndingShipStage } from './CinematicScenes.jsx';
import { canBeginDayAnimation, CINEMATIC_DURATIONS, endingMotion } from './cinematicRules.js';
import { TutorialGuide, TutorialHelpButton } from './TutorialGuide.jsx';
import { guideStageForState, browserGuideStorage, readGuidePreferences, writeGuidePreferences, markGuideStageSeen, skipAutomaticGuide } from './tutorialGuide.js';
import discoveryCatalog from '../../data/discoveries.js';
import { DiscoveryPopup, DiscoveryCollection } from './DiscoveryUI.jsx';
import { discoveryOptions } from '../../logic/v4/discoveries.js';
import { loadDiscoveryIds, saveDiscoveryIds, clearDiscoveryIds, browserDiscoveryStorage } from './discoveryStorage.js';
import cards from '../../data/cards.json';
import ScienceCard from '../ScienceCard.jsx';
import { chooseScienceCard, scienceCardForHistory } from '../science-content.js';
import './crew-ui.css';

const SHIPS = {
  explorer: { name: 'Explorer', short: 'Compact lander' },
  titan: { name: 'Titan', short: 'Heavy cargo ship' },
  horizon: { name: 'Horizon', short: 'Modular habitat' },
  nova: { name: 'Nova', short: 'Survey vessel' },
};
const ROOMS = {
  lifeSupport: { name: 'Life Support', icon: 'air', color: 'orange' },
  greenhouse: { name: 'Greenhouse', icon: 'plant', color: 'green' },
  science: { name: 'Science Lab', icon: 'science', color: 'blue' },
  power: { name: 'Power Station', icon: 'battery', color: 'yellow' },
  shield: { name: 'Storm Shelter', icon: 'safety', color: 'purple' },
  comms: { name: 'Communications', icon: 'radio', color: 'pink' },
};
const PLANETS = {
  moon: { label: 'Moon', subtitle: 'Lunar mission', color: '#98b8ce' },
  mars: { label: 'Mars', subtitle: 'Illustrated training setting', color: '#dd9573' },
};

function Icon({ type, size = 24, className = '' }) {
  const paths = {
    air: <><path d="M3 8h10a3 3 0 1 0-3-3"/><path d="M2 12h17a3 3 0 1 1-3 3"/><path d="M4 16h8a3 3 0 1 1-3 3"/></>,
    supplies: <><path d="M4 8h16v12H4z"/><path d="M4 13h16M12 8v12"/><path d="M8 6c0-3 4-3 4 0c0-3 4-3 4 0"/></>,
    safety: <><path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z"/></>,
    battery: <><rect x="2.5" y="7" width="18" height="11" rx="2"/><path d="M22 10v5M11.5 9l-3 4h3l-1 3 5-5h-3l1-2"/></>,
    energy: <path d="M13 2L5 13h6l-1 9 9-12h-6z"/>,
    storm: <><path d="M7 17h-1a4 4 0 0 1-.5-8 6 6 0 0 1 11-1 4 4 0 0 1 1 8"/><path d="M12 13l-3 5h3l-1 4 5-6h-3l1-3"/></>,
    plant: <><path d="M12 21V10M12 15c-7 0-8-4-8-8 7 0 8 4 8 8M12 12c0-6 4-8 8-8 0 6-3 8-8 8"/></>,
    science: <><path d="M9 2h6M10 2v8l-6 10a1 1 0 0 0 1 2h14a1 1 0 0 0 1-2l-6-10V2"/><path d="M7 17h10"/></>,
    radio: <><path d="M5 21V11M19 21V11M12 3v18"/><path d="M7 7a7 7 0 0 1 10 0M3 3a13 13 0 0 1 18 0"/><circle cx="12" cy="10" r="2"/></>,
    rocket: <><path d="M4 17c4-3 4-8 12-14 2 2 5 8 4 10-4 8-9 8-13 9z"/><path d="M10 18L5 23M4 17H1l1-6 5-1M14 6a1 1 0 1 0 2 2a1 1 0 1 0-2-2"/></>,
    move: <><path d="M12 2v20M2 12h20M9 5l3-3 3 3M9 19l3 3 3-3M5 9l-3 3 3 3M19 9l3 3-3 3"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l4 2"/></>,
    research: <><path d="M5 4h14v16H5zM8 8h8M8 12h8M8 16h5"/></>,
    trophy: <><path d="M7 4h10v5a5 5 0 0 1-10 0zM7 5H3v2a4 4 0 0 0 4 4M17 5h4v2a4 4 0 0 1-4 4M12 14v5M8 21h8"/></>,
    info: <><circle cx="12" cy="12" r="10"/><path d="M12 11v6M12 7h.01"/></>,
    crew: <><circle cx="12" cy="7" r="4"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/></>,
    palette: <><circle cx="12" cy="12" r="10"/><circle cx="8" cy="7" r="1"/><circle cx="15" cy="7" r="1"/><circle cx="17" cy="13" r="1"/><path d="M11 18c3-1 0-4 3-4"/></>,
  };
  return <svg className={`crew-icon ${className}`} width={size} height={size} viewBox="0 0 24 24" fill={type === 'safety' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[type] ?? paths.info}</svg>;
}

function Astronaut({ suit, size = 'normal', reacting = false }) {
  const primary = CREW_SUIT_COLORS[suit % CREW_SUIT_COLORS.length];
  return <svg className={`crew-astronaut crew-astronaut--${size} ${reacting ? 'is-reacting' : ''}`} viewBox="0 0 130 166" aria-hidden="true">
    <ellipse cx="66" cy="156" rx="34" ry="7" fill="#071425" opacity=".22"/>
    <g className="crew-astronaut__legs"><path d="M46 119v28q-13 12-21 0v-35" fill="#e9f2f6" stroke="#50687e" strokeWidth="5"/><path d="M81 117v29q14 10 23-2v-30" fill="#e9f2f6" stroke="#50687e" strokeWidth="5"/></g>
    <g className="crew-astronaut__arm crew-astronaut__arm--left"><path d="M39 82L17 107l-6-10 15-33" fill="#e9f2f6" stroke="#71899d" strokeWidth="5" strokeLinejoin="round"/><circle cx="13" cy="102" r="11" fill={primary} stroke="#4d657b" strokeWidth="4"/></g>
    <g className="crew-astronaut__arm crew-astronaut__arm--right"><path d="M91 83l22 23 6-10-15-34" fill="#e9f2f6" stroke="#71899d" strokeWidth="5"/><circle cx="116" cy="103" r="11" fill={primary} stroke="#4d657b" strokeWidth="4"/></g>
    <path d="M44 77h42l15 47H30z" fill="#e3edf3" stroke="#48687f" strokeWidth="5"/><rect x="47" y="89" width="36" height="26" rx="7" fill={primary} stroke="#6b8498" strokeWidth="4"/><path d="M56 99h18" stroke="#31566a" strokeWidth="3"/>
    <circle cx="65" cy="48" r="42" fill="#f4f8f8" stroke="#4e697e" strokeWidth="6"/><circle cx="65" cy="49" r="29" fill="#bbf0f3" stroke="#4b8ca7" strokeWidth="5"/>
    <ellipse cx="65" cy="53" rx="23" ry="22" fill="#c58d68"/><circle cx="56" cy="49" r="3" fill="#20334a"/><circle cx="73" cy="49" r="3" fill="#20334a"/><path d="M57 61q8 8 16 0" stroke="#5a3230" fill="none" strokeWidth="3" strokeLinecap="round"/>
    <path d="M45 31q17-21 41-5" fill="none" stroke="#ffffff" strokeOpacity=".6" strokeWidth="6" strokeLinecap="round"/>
    <circle cx="31" cy="22" r="7" fill={primary}/><circle cx="99" cy="22" r="7" fill={primary}/>
  </svg>;
}

// Cosmetic comparison only: three styles, no reducer action and no simulation changes.
export const MENU_STYLE_ORDER = Object.freeze(['classic', 'playful', 'starry']);
export const MENU_STYLE_LABELS = Object.freeze({
  classic: 'Classic', playful: 'Playful', starry: 'Classic + Stars',
});
export function nextMenuStyle(style) {
  const index = MENU_STYLE_ORDER.indexOf(style);
  return MENU_STYLE_ORDER[(index + 1) % MENU_STYLE_ORDER.length];
}
export function MenuStyleSwitch({ uiStyle, onToggleStyle }) {
  const next = nextMenuStyle(uiStyle);
  return <button type="button" className="crew-theme-switch"
    aria-label={`Current design: ${MENU_STYLE_LABELS[uiStyle]}. Switch to ${MENU_STYLE_LABELS[next]} design`}
    title={`Switch to ${MENU_STYLE_LABELS[next]}`}
    onClick={onToggleStyle}>
    <Icon type="palette" size={20}/>
    <span>Try {MENU_STYLE_LABELS[next]}</span>
    <span className="crew-theme-switch__status" aria-hidden="true">{MENU_STYLE_LABELS[uiStyle].toUpperCase()}</span>
  </button>;
}

function ShipPicker({ state, dispatch, uiStyle, onToggleStyle }) {
  return <main className="crew-menu" data-menu-style={uiStyle}>
    <MenuStyleSwitch uiStyle={uiStyle} onToggleStyle={onToggleStyle}/>
    <div className="crew-menu__halo" aria-hidden="true"/>
    <header className="crew-menu__header" data-guide-anchor="menu-title"><span className="crew-eyebrow"><Icon type="rocket" size={19}/> JUNIOR ASTRONAUT MISSION TRAINER</span>
      <h1>AstroQuest</h1><p>Choose your spacecraft. Every great mission starts with a ship.</p></header>
    <div className="crew-ship-grid" data-guide-anchor="ship-choices" role="group" aria-label="Choose a spacecraft design">
      {SHIP_IDS.map(id => <button key={id} type="button" className={`crew-ship-card ${state.ship === id ? 'is-selected' : ''}`} data-ship={id}
        aria-pressed={state.ship === id} onClick={() => dispatch({ type: 'SELECT_SHIP', ship: id })}>
        <span className="crew-ship-card__image"><img src={`/art/ship-${id}-sealed.svg`} alt=""/></span>
        <span className="crew-ship-card__footer"><strong>{SHIPS[id].name}</strong><small>{SHIPS[id].short}</small><small className="crew-ship-card__layout">{SHIP_DECK_LAYOUTS[id].pattern}</small></span>
        <span className="crew-ship-card__check" aria-hidden="true">{state.ship === id ? '✓' : ''}</span>
      </button>)}
    </div>
    <p className="crew-menu__note"><Icon type="info" size={17}/> Every ship has six departments in a different arrangement; gameplay abilities stay equal.</p>
    <div className="science-menu-actions">
      <button type="button" className="crew-primary crew-menu__continue" onClick={() => dispatch({ type: 'OPEN_PREPARATION' })}>Prepare mission <span aria-hidden="true">→</span></button>
      <button type="button" className="science-menu-actions__discoveries" onClick={() => dispatch({ type: 'OPEN_COLLECTION' })}>
        <Icon type="research" size={21}/> Discovery <small>{state.lifetimeDiscoveryIds.length}/{discoveryCatalog.length}</small>
      </button>
    </div>
  </main>;
}

function CargoControl({ cargo, resource, limit, label, icon, dispatch }) {
  return <div className="crew-cargo__item">
    <div className="crew-cargo__label"><Icon type={icon} size={25}/><span>{label}</span><strong>{cargo[resource]} <small>/ {limit}</small></strong></div>
    <div className="crew-cargo__bar"><span style={{ width: `${Math.min(100, cargo[resource] / limit * 100)}%` }}/></div>
    <div className="crew-cargo__stepper">
      <button type="button" aria-label={`Remove one ${label}`} onClick={() => dispatch({ type: 'SET_CARGO', resource, delta: -1 })}>−</button>
      <button type="button" aria-label={`Add one ${label}`} onClick={() => dispatch({ type: 'SET_CARGO', resource, delta: 1 })}>+</button>
    </div>
  </div>;
}

function Preparation({ state, config, dispatch, uiStyle, onToggleStyle }) {
  const options = config.reevaluation.crewUI;
  const checks = validateCargo(state.cargo, config, options);
  const loaded = state.cargo.air + state.cargo.supplies + state.cargo.battery;
  return <main className="crew-prep" data-menu-style={uiStyle}>
    <MenuStyleSwitch uiStyle={uiStyle} onToggleStyle={onToggleStyle}/>
    <header className="crew-prep__header"><button type="button" className="crew-back" onClick={() => dispatch({ type: 'BACK_TO_MENU' })}>← Ships</button>
      <div><span className="crew-eyebrow">MISSION PREPARATION</span><h1>Where are we landing?</h1></div></header>
    <section className="crew-prep__destinations" data-guide-anchor="destinations" aria-label="Choose destination">
      {['moon','mars'].map(p => <button key={p} type="button" className={`crew-planet ${state.destination === p ? 'is-selected' : ''}`}
        aria-pressed={state.destination === p} onClick={() => dispatch({ type: 'SELECT_DESTINATION', destination: p })}
        style={{ '--planet-image': `url('/art/${p}-landscape.svg')` }}>
        <span className="crew-planet__orb" aria-hidden="true" style={{ '--orb-color': PLANETS[p].color }}/>
        <strong>{PLANETS[p].label}</strong><small>{PLANETS[p].subtitle}</small><span className="crew-check" aria-hidden="true">{state.destination === p ? '✓ Selected' : 'Select'}</span>
      </button>)}
    </section>
    {state.destination === 'mars' && <p className="crew-prep__warning" role="status">Mars uses the same Earth-observed archived space-weather events and simplified game rules as the Moon setting. They are not measurements from Mars.</p>}
    <section className="crew-prep__loadout">
      <div className="crew-prep__ship"><img src={`/art/ship-${state.ship}-sealed.svg`} alt=""/><strong>{SHIPS[state.ship].name}</strong><small>{SHIP_DECK_LAYOUTS[state.ship].pattern} · six departments</small></div>
      <div className="crew-prep__cargo" data-guide-anchor="cargo">
        <div className="crew-prep__capacity"><div><span className="crew-eyebrow">CARGO BAY</span><h2>Load your supplies</h2></div>
          <strong>{loaded} / {options.cargoCapacity}</strong></div>
        <div className="crew-prep__capacity-track" role="progressbar" aria-label="Cargo filled" aria-valuemin={0} aria-valuemax={options.cargoCapacity} aria-valuenow={loaded}><span style={{width:`${loaded / options.cargoCapacity * 100}%`}}/></div>
        <div className="crew-cargo__grid">
          <CargoControl cargo={state.cargo} resource="air" label="Air" icon="air" limit={config.meterMax} dispatch={dispatch}/>
          <CargoControl cargo={state.cargo} resource="supplies" label="Supplies" icon="supplies" limit={config.meterMax} dispatch={dispatch}/>
          <CargoControl cargo={state.cargo} resource="battery" label="Battery" icon="battery" limit={config.reevaluation.c3.battery.baseCapacity} dispatch={dispatch}/>
        </div>
        <p className="crew-muted">More of one resource means less room for the others. All values are game units.</p>
      </div>
    </section>
    {state.error && <p className="crew-error" role="alert">{state.error}</p>}
    <button type="button" className="crew-primary crew-prep__launch" disabled={!checks.ok} onClick={() => dispatch({ type: 'OPEN_CREW_ASSEMBLY' })}><Icon type="crew"/> Assemble crew <span aria-hidden="true">→</span></button>
  </main>;
}

/** Selection-only preflight. No worker placement until the ship has landed. */
export function CrewAssembly({ state, config, dispatch, uiStyle, onToggleStyle }) {
  const limit = Math.min(config.reevaluation.crewUI.crewMax ?? 6, 6);
  const chosenIds = new Set(state.crew.map(member => member.id));
  return <main className="crew-assembly" data-menu-style={uiStyle}>
    <MenuStyleSwitch uiStyle={uiStyle} onToggleStyle={onToggleStyle}/>
    <header className="crew-assembly__header">
      <button type="button" className="crew-back" onClick={()=>dispatch({type:'BACK_TO_PREPARATION'})}>← Cargo</button>
      <div><span className="crew-eyebrow">MISSION PREPARATION · STEP 2</span>
        <h1>Choose your crew</h1>
        <p>Pick up to {limit} astronauts. Place them in matching departments after landing.</p>
      </div>
    </header>
    <div className="crew-assembly__summary" aria-label="Mission selection summary">
      <span><Icon type="rocket" size={19}/> {SHIPS[state.ship].name}</span>
      <span><Icon type="info" size={19}/> {PLANETS[state.destination].label}</span>
      <span><Icon type="crew" size={19}/> {state.crew.length}/{limit} chosen</span>
      <span><Icon type="supplies" size={19}/> Cargo: {state.cargo.air + state.cargo.supplies + state.cargo.battery}</span>
    </div>
    <div className="crew-assembly__layout crew-assembly__layout--selection">
      <section className="crew-assembly__roster" aria-label="Choose up to six astronauts">
        <div className="crew-assembly__title"><h2>Meet your crew</h2><span>{state.crew.length}/{limit} selected</span></div>
        <div className="crew-assembly__candidates" data-guide-anchor="crew-candidates">
          {state.candidates.map(candidate=>{
            const chosen = chosenIds.has(candidate.id);
            const room = ROOMS[candidate.specialty];
            return <div className="crew-assembly__candidate" data-selected={chosen?'true':'false'}
              style={{'--crew-accent':ROOM_ACCENTS[candidate.specialty]}} key={candidate.id}>
              <span className="crew-assembly__portrait"><Astronaut suit={candidate.suit}/></span>
              <strong>{candidate.name}</strong>
              <small className="crew-assembly__specialty"><Icon type={room.icon} size={15}/> {room.name}</small>
              <span className="crew-assembly__color-name">{CREW_COLOR_NAMES[candidate.specialty]} suit</span>
              <button type="button" className="crew-assembly__choose" aria-pressed={chosen}
                disabled={!chosen && state.crew.length>=limit}
                aria-label={`${chosen?'Remove':'Choose'} ${candidate.name}, ${CREW_COLOR_NAMES[candidate.specialty]} suit, ${room.name}`}
                onClick={()=>dispatch({type:'TOGGLE_CANDIDATE',id:candidate.id})}>
                {chosen ? '✓ On the team' : state.crew.length >= limit ? `Team full` : '+ Select'}
              </button>
            </div>;
          })}
        </div>
        <p className="crew-assembly__select-hint"><Icon type="info" size={17}/> Each astronaut has a matching room color and icon. You can assign anyone anywhere once landed.</p>
      </section>
      <section className="crew-assembly__ship-panel crew-assembly__ship-panel--selection" aria-label="Your mission crew">
        <div className="crew-assembly__title"><h2>{SHIPS[state.ship].name}</h2><span>{state.crew.length} astronauts aboard</span></div>
        <img className="crew-assembly__ship-picture" src={`/art/ship-${state.ship}-sealed.svg`} alt={`Your selected ${SHIPS[state.ship].name} spacecraft`}/>
        <h3>Ready for landing</h3>
        <div className="crew-assembly__chosen-grid" aria-label="Selected astronaut colors and specialties">
          {state.crew.map(member=><div className="crew-assembly__chosen" key={member.id} style={{'--crew-accent':ROOM_ACCENTS[member.specialty]}}>
            <span><Icon type={ROOMS[member.specialty].icon} size={20}/></span>
            <div><strong>{member.name}</strong><small>{ROOMS[member.specialty].name} · {CREW_COLOR_NAMES[member.specialty]}</small></div>
          </div>)}
        </div>
        <p className="crew-assembly__instructions"><Icon type="move" size={18}/> After landing, drag or tap astronauts into rooms with matching colors.</p>
      </section>
    </div>
    {state.error && <p className="crew-error" role="alert">{state.error}</p>}
    <div className="crew-assembly__actions" data-guide-anchor="launch">
      <button type="button" className="crew-primary" disabled={!state.crew.length}
        onClick={()=>dispatch({type:'LAUNCH'})}><Icon type="rocket" size={21}/> Launch with {state.crew.length} astronaut{state.crew.length!==1?'s':''} <span aria-hidden="true">→</span></button>
      {state.destination==='mars' && <small>Mars is an illustrated mission setting. Archived DONKI events are not Martian surface readings.</small>}
    </div>
  </main>;
}

function CrewToken({ member, picked, small = false, onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onClick }) {
  return <button type="button" className={`crew-token ${small ? 'crew-token--small' : ''} ${picked ? 'is-picked' : ''} ${member.awayUntilDay !== null ? 'is-away' : ''}`}
    style={{'--crew-accent':ROOM_ACCENTS[member.specialty]}}
    aria-label={`${member.name}, ${CREW_COLOR_NAMES[member.specialty]} suit${member.room ? `, working in ${ROOMS[member.room].name}` : member.awayUntilDay ? ', on expedition' : ', in crew dock'}. ${member.room ? 'Drag to move, or select the department.' : 'Select to place.'}`}
    aria-pressed={picked} disabled={member.awayUntilDay !== null}
    onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerCancel} onClick={onClick}>
    <Astronaut suit={member.suit} size={small ? 'small' : 'normal'} reacting={picked}/>
    {!small && <span className="crew-token__name">{member.name}</span>}
  </button>;
}

function Stat({ icon, label, value, max, className = '' }) {
  const percent = max > 0 ? Math.max(0, Math.min(100, value/max*100)) : 0;
  return <div className={`crew-stat ${className}`} aria-label={`${label}: ${value} of ${max} game units`}>
    <span className="crew-stat__label"><Icon type={icon} size={21}/><span>{label}</span><strong>{value}<small>/{max}</small></strong></span>
    <span className="crew-stat__bar"><span style={{ width: `${percent}%` }}/></span>
  </div>;
}

function Hud({ config, state, preview }) {
  const game = state.session.game;
  const cap = c3BatteryCapacity(game, config);
  return <header className="crew-hud">
    <div className="crew-hud__day"><small>MISSION DAY</small><strong>{game.day} <span>/ {config.missionLengthDays}</span></strong></div>
    <div className="crew-hud__meters" data-guide-anchor="meters"><Stat icon="air" label="Air" value={game.meters.air} max={config.meterMax}/>
      <Stat icon="supplies" label="Supplies" value={game.meters.supplies} max={config.meterMax}/>
      <Stat icon="safety" label="Safety" value={game.meters.safety} max={config.meterMax} className="crew-stat--safety"/></div>
    <div className="crew-hud__extras"><span title="Generated Energy"><Icon type="energy" size={18}/> <strong>{preview.used ?? 0}/{preview.generation ?? '—'}</strong></span>
      <span title="Battery"><Icon type="battery" size={18}/> <strong>{game.battery}/{cap}</strong></span>
      <span title="Research Points"><Icon type="science" size={18}/> <strong>{game.research.available}</strong></span></div>
  </header>;
}

const STORM_LABELS = ['Quiet', 'Minor', 'Moderate', 'Severe'];

function ForecastBar({ level, day, config }) {
  if (level === null) return null;
  const min = config.stormLevelRange[0];
  const max = config.stormLevelRange[1];
  const levels = Array.from({ length: max - min + 1 }, (_, i) => i + min);
  return <section className="crew-forecast" data-guide-anchor="forecast" data-level={level} aria-label={`Day's game storm forecast: ${STORM_LABELS[level] ?? level}`}>
    <div className="crew-forecast__identity"><Icon type="storm" size={25}/>
      <span><small>STORM FORECAST · DAY {day}</small><strong>{STORM_LABELS[level] ?? `Level ${level}`}</strong></span>
    </div>
    <div className="crew-forecast__levels" aria-hidden="true">{levels.map(n => <span key={n} data-active={n <= level ? 'true' : 'false'}/>)}</div>
    <p>Game estimate · may differ by one level. Actual archived event is revealed after the day.</p>
  </section>;
}

function RoomActions({ state, config, dispatch }) {
  const room = state.focusedRoom;
  const def = ROOMS[room];
  const game = state.session.game;
  const plan = state.session.plan;
  const cost = c3UpgradeCost(room, game, config);
  const isStaffed = crewInRoom(state.crew, room);
  const worker = state.crew.find(c => c.room === room && c.awayUntilDay === null);
  const c3 = config.reevaluation.c3;
  const discovery = room === 'science' ? discoveryOptions(config) : null;
  const unseenStudies = discoveryCatalog.length - state.lifetimeDiscoveryIds.length;
  return <section className="crew-room-actions" style={{'--room-accent':ROOM_ACCENTS[room]}} aria-label={`${def.name} actions`}>
    <div className="crew-room-actions__head"><span className="crew-room-actions__icon"><Icon type={def.icon}/></span>
      <div><strong>{def.name}</strong><small>Level {game.roomLevels[room]} · {isStaffed ? 'Crew working' : 'Needs astronaut'}</small></div></div>
    <div className="crew-room-actions__buttons">
      {worker && <button type="button" aria-pressed={state.pickedCrewId===worker.id}
        onClick={() => dispatch({type:'PICK_CREW',id:worker.id})}>
        <Icon type="move" size={18}/> Move {worker.name} <small>{CREW_COLOR_NAMES[worker.specialty]} suit</small>
      </button>}
      {cost && <button type="button" className={plan.upgradeRoom === room ? 'is-active' : ''} aria-pressed={plan.upgradeRoom === room}
        onClick={() => dispatch({ type: 'TOGGLE_ACTION', action: 'UPGRADE', room })} title="Builds after this day; effects start tomorrow">
        <Icon type="research" size={18}/> Upgrade <small>{cost.points} R + {cost.energy} ⚡</small></button>}
      {room === 'lifeSupport' && <button type="button" aria-pressed={plan.care} className={plan.care ? 'is-active' : ''}
        onClick={() => dispatch({ type: 'TOGGLE_ACTION', action: 'CARE' })}><Icon type="safety" size={18}/> Crew care <small>−{c3.care.suppliesCost} Supplies</small></button>}
      {room === 'power' && Array.from({ length: c3.battery.maxChargePerDay }, (_, i) => <button type="button" key={i}
        aria-pressed={plan.charge === i+1} className={plan.charge === i+1 ? 'is-active' : ''}
        onClick={() => dispatch({ type: 'TOGGLE_ACTION', action: 'CHARGE', amount: i+1 })}><Icon type="battery" size={18}/> Store {i+1} ⚡</button>)}
      {room === 'comms' && <button type="button" aria-pressed={plan.requestAdvice} className={plan.requestAdvice ? 'is-active' : ''}
        onClick={() => dispatch({ type: 'TOGGLE_ACTION', action: 'ADVICE' })}><Icon type="radio" size={18}/> Earth advice <small>−{c3.comms.sendEnergyCost} ⚡</small></button>}
      {room === 'science' && Object.entries(c3.expeditions).map(([kind, spec]) => <button type="button" key={kind}
        aria-pressed={plan.expedition === kind} className={plan.expedition === kind ? 'is-active' : ''}
        onClick={() => dispatch({ type: 'TOGGLE_ACTION', action: 'EXPEDITION', kind })} title={`${spec.label}: ${spec.duration} turns, -${spec.airCost} Air, -${spec.suppliesCost} Supplies, -${spec.energyCost} Energy. Crew must be available in dock.`}>
        <Icon type="rocket" size={18}/> {spec.label} <small>{spec.duration}d · −{spec.airCost} Air/−{spec.suppliesCost} Supply</small></button>)}
      {!cost && room !== 'science' && room !== 'lifeSupport' && room !== 'power' && room !== 'comms' && <span className="crew-muted">Maximum upgrade reached</span>}
    </div>
    {game.comms.lastAdvice && room === 'comms' && <p className="crew-room-actions__notice">Earth: {game.comms.lastAdvice.message}</p>}
    {game.expedition.active && room === 'science' && <p className="crew-room-actions__notice">EVA returns after Day {game.expedition.active.dueDay}</p>}
    {discovery && <p className="science-lab-specialist-hint" role="status">
      <Icon type="science" size={18}/>{unseenStudies === 0
        ? 'All NASA study references collected! Science still earns normal Research Points.'
        : worker?.specialty === 'science'
          ? `Specialist ready! ${state.discoveryProgress.qualifiedDays % discovery.daysPerDiscovery}/${discovery.daysPerDiscovery} lab days complete. Power Science Lab to earn +${discovery.bonusResearchPoints} bonus Research.`
          : 'Only the blue Science Lab specialist can unlock a space-biology bonus. Other crew earn normal Science points.'}
    </p>}
    {!isStaffed && <p className="crew-room-actions__hint"><Icon type="move" size={16}/> Pick an astronaut, then choose this room.</p>}
  </section>;
}

export function CrewGameplay({ state, config, dispatch, mission, uiStyle = 'classic', onToggleStyle = () => {}, arriving = false }) {
  const game = state.session.game;
  const plan = state.session.plan;
  const preview = previewC3(state.session, config);
  const picked = state.pickedCrewId;
  const ghostRef = useRef(null);
  const dragRef = useRef(null);
  const suppressClickRef = useRef(false);
  const hoveredRef = useRef(null);
  const shellRef = useRef(null);
  const selectedCrew = state.crew.find(c => c.id === picked);
  const planet = state.destination;
  const ship = state.ship;
  const forecastLevel = c3WeatherEstimate(game.day, mission, config, state.session.seed);

  function roomAtPoint(x, y) {
    if (typeof document === 'undefined') return null;
    return document.elementFromPoint(x,y)?.closest?.('[data-drop-room]')?.getAttribute('data-drop-room') ?? null;
  }
  function dockAtPoint(x,y) {
    if (typeof document === 'undefined') return false;
    return Boolean(document.elementFromPoint(x,y)?.closest?.('[data-crew-dock]'));
  }
  function startDrag(member, event) {
    if (event.button !== 0 && event.pointerType === 'mouse') return;
    if (member.awayUntilDay !== null) return;
    suppressClickRef.current = false;
    dragRef.current = { id: member.id, x: event.clientX, y: event.clientY, moved: false };
    hoveredRef.current = null;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    if (ghostRef.current) {
      ghostRef.current.style.opacity = '0';
      ghostRef.current.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`;
    }
  }
  function moveDrag(event) {
    const d = dragRef.current;
    if (!d) return;
    if (!d.moved && Math.hypot(event.clientX-d.x,event.clientY-d.y) > (event.pointerType === 'touch' ? 14 : 9)) {
      d.moved = true;
      dispatch({ type: 'PICK_CREW', id: d.id, force: true });
    }
    if (!d.moved) return;
    if (ghostRef.current) {
      ghostRef.current.style.opacity = '1';
      ghostRef.current.style.transform = `translate3d(${event.clientX-34}px, ${event.clientY-72}px, 0)`;
    }
    const room = roomAtPoint(event.clientX,event.clientY);
    if (hoveredRef.current !== room) {
      hoveredRef.current = room;
      dispatch({ type: 'HOVER_ROOM', room });
    }
  }
  function stopDrag(event) {
    const d = dragRef.current;
    if (!d) return;
    dragRef.current = null;
    if (ghostRef.current) ghostRef.current.style.opacity = '0';
    if (d.moved) {
      // A drag already handled placement; suppress its synthetic click on release.
      suppressClickRef.current = true;
      const room = roomAtPoint(event.clientX,event.clientY);
      const dock = dockAtPoint(event.clientX,event.clientY);
      if (room || dock) dispatch({ type: 'PLACE_CREW', id: d.id, room: room ?? null });
      else dispatch({ type: 'HOVER_ROOM', room: null });
    }
    // A simple click is handled by the click event below, not by pointerup;
    // this prevents tapping a worker from stealing a room-selection click.
  }
  function cancelDrag() {
    dragRef.current = null;
    if (ghostRef.current) ghostRef.current.style.opacity = '0';
    dispatch({ type: 'HOVER_ROOM', room: null });
  }
  function astronautToken(member, small=false) {
    return <CrewToken key={member.id} member={member} small={small} picked={picked === member.id}
      onPointerDown={event => startDrag(member,event)} onPointerMove={moveDrag} onPointerUp={stopDrag} onPointerCancel={cancelDrag}
      onClick={event => {
        if (suppressClickRef.current) {
          suppressClickRef.current = false;
          event.stopPropagation();
          return;
        }
        // A tap on a worker in a room intentionally bubbles to that room.
        // Workers can still be dragged; Move buttons provide keyboard access.
        if (!member.room) dispatch({type:'PICK_CREW',id:member.id});
      }}/ >;
  }
  function tapRoom(room) {
    const occupant = state.crew.find(c=>c.room===room && c.awayUntilDay===null);
    // Do not accidentally swap an occupied worker: clicking their sprite still
    // focuses the room, as if the child clicked the hatch itself.
    dispatch(roomTapAction(room, picked, occupant?.id ?? null));
  }
  function clickRoom(event,room) {
    // Power-token buttons have their own action and must not reselect the room.
    if (event.target.closest('.crew-ship__power')) return;
    tapRoom(room);
  }
  const hovered = picked && state.hoverRoom;
  return <main ref={shellRef} className={`crew-play crew-play--${planet} ${arriving ? "crew-play--cinematic-arrival" : ""}`} data-menu-style={uiStyle}
    style={{ '--surface-art': `url('/art/${planet}-landscape.svg')` }}>
    <MenuStyleSwitch uiStyle={uiStyle} onToggleStyle={onToggleStyle}/>
    <Hud config={config} state={state} preview={preview}/>
    <ForecastBar level={forecastLevel} day={game.day} config={config}/>
    <section className="crew-landing" aria-label="Landed spacecraft and crew">
      <div className="crew-landing__stage">
        <div className="crew-landing__heading"><span>{PLANETS[planet].label.toUpperCase()} / DAY {game.day}</span>
          {planet === 'mars' && <small>Mars setting · archived DONKI events are not Mars surface readings</small>}</div>
        <aside className="crew-dock" data-guide-anchor="crew-dock" data-crew-dock="true" aria-label="Crew dock">
          <header><Icon type="crew" size={20}/><strong>YOUR CREW</strong><small>Pick & place</small></header>
          <div className="crew-dock__roster">
            {state.crew.filter(c => c.room === null).map(c => <div className="crew-dock__member" key={c.id} style={{'--crew-accent':ROOM_ACCENTS[c.specialty]}}>{astronautToken(c)}
              <span className="crew-dock__specialty" aria-label={`${CREW_COLOR_NAMES[c.specialty]} suit matches ${ROOMS[c.specialty].name}`}>
                <Icon type={ROOMS[c.specialty].icon} size={13}/>{ROOMS[c.specialty].name}
              </span>
              {c.awayUntilDay !== null && <small>On EVA</small>}</div>)}
            {state.crew.every(c => c.room !== null) && <p className="crew-dock__empty">Crew assigned. Tap a worker to move them.</p>}
          </div>
          {picked && <button type="button" className="crew-dock__return" onClick={() => dispatch({ type: 'PLACE_CREW', room: null })}>Return to dock</button>}
          <p><Icon type="move" size={16}/> Match suit colors to room outlines. Tap an astronaut, then tap an empty room.</p>
        </aside>
        <section className="crew-ship" data-guide-anchor="ship" data-ship={ship} aria-label={`${SHIPS[ship].name} spaceship departments; ${SHIP_DECK_LAYOUTS[ship].pattern}`} >
          <img className="crew-ship__illustration" src={`/art/ship-${ship}-sealed.svg`} alt="" draggable="false"/>
          <div className="crew-ship__rooms">
            {ROOM_IDS.map(room => {
              const worker = state.crew.find(c => c.room === room && c.awayUntilDay === null);
              const powered = POWERED_ROOMS.includes(room);
              const level = game.roomLevels[room];
              const amount = powered ? plan.allocation[room] : null;
              const max = powered ? config.allocationRanges[room][1] : 0;
              const previewing = Boolean(selectedCrew && hovered === room);
              // A staffed department stays open; otherwise reveal only while placing crew.
              const showingInterior = Boolean(worker) || previewing;
              const canPlace = !worker || worker.id === selectedCrew?.id;
              return <div key={room} data-drop-room={room} data-room-open={showingInterior ? 'true' : 'false'} data-room-color={ROOMS[room].color}
                style={{...shipHatchStyle(ship,room), '--room-accent':ROOM_ACCENTS[room]}}
                className={`crew-ship__room crew-ship__room--${room} ${state.focusedRoom===room?'is-focused':''} ${previewing?'is-hovered':''} ${worker?'has-crew':''}`}
                onPointerEnter={() => picked && dispatch({ type: 'HOVER_ROOM', room })}
                onPointerLeave={() => picked && dispatch({ type: 'HOVER_ROOM', room: null })}
                onClick={event=>clickRoom(event,room)}>
                {showingInterior && <img className="crew-ship__interior" src={`/art/room-${room}.svg`} alt="" aria-hidden="true" draggable="false"/>}
                <button type="button" className="crew-ship__room-select" aria-label={`${ROOMS[room].name}, ${ROOMS[room].color} department, level ${level}, ${worker?`${worker.name} assigned`:'empty'}. ${picked ? canPlace ? 'Place selected astronaut; interior open' : 'Occupied; select department' : 'Select department'}.`}
                  onFocus={() => picked && dispatch({ type: 'HOVER_ROOM', room })}
                  onBlur={() => picked && dispatch({ type: 'HOVER_ROOM', room: null })}
                  >
                  <Icon type={ROOMS[room].icon} size={31}/>
                  <span className="crew-ship__level">{level}</span>
                </button>
                {worker && <div className="crew-ship__worker">{astronautToken(worker,true)}</div>}
                {powered && worker && <div className="crew-ship__power" aria-label={`Energy for ${ROOMS[room].name}: ${amount} of ${max}`}>
                  {Array.from({length:max},(_,i)=>{
                    const desired = amount===i+1 ? 0 : i+1;
                    return <button type="button" key={i} className={i<amount?'is-on':''} title={`Set ${ROOMS[room].name} Energy to ${desired}`}
                      aria-label={`Set ${ROOMS[room].name} Energy to ${desired}`}
                      onClick={() => dispatch({ type: 'SET_POWER', room, amount: desired })}><Icon type="energy" size={15}/></button>;
                  })}
                </div>}
                {powered && !worker && <span className="crew-ship__zero-energy" aria-label="Zero Energy without a worker">0 ⚡</span>}
              </div>;
            })}
          </div>
          {hovered && <p className="crew-ship__hover-hint" role="status">{ROOMS[hovered].name}: {state.crew.some(c => c.room === hovered && c.awayUntilDay === null && c.id !== picked) ? 'Occupied' : 'Release to assign'}</p>}
        </section>
      </div>
    </section>
    <div className="crew-play__bottom">
      <RoomActions state={state} config={config} dispatch={dispatch}/>
      <section className="crew-command" aria-label="Daily plan summary">
        <div className="crew-command__summary"><span className="crew-eyebrow">DAILY PLAN</span>
          <div><Icon type="energy" size={23}/><strong>{preview.used ?? 0} / {preview.generation ?? '—'}</strong><small>Energy</small></div>
          <div><Icon type="battery" size={21}/><strong>{game.battery}</strong><small>Stored</small></div>
          <div><Icon type="science" size={21}/><strong>{game.research.available}</strong><small>Research</small></div>
          {game.comms.pending && <small><Icon type="radio" size={15}/> Earth reply pending</small>}
          {game.expedition.active && <small><Icon type="rocket" size={15}/> Expedition underway</small>}
        </div>
        {state.error && <p className="crew-play__error" role="alert">{state.error}</p>}
        <button type="button" className="crew-primary crew-command__run" data-guide-anchor="run-day" onClick={() => dispatch({ type: 'COMMIT_DAY' })}><Icon type="rocket" size={20}/> Run Day {game.day} <span aria-hidden="true">→</span></button>
        <small className="crew-command__note">All meters use simplified game units.</small>
      </section>
    </div>
    {selectedCrew && <div className="crew-drag-ghost" ref={ghostRef} aria-hidden="true"><Astronaut suit={selectedCrew.suit} reacting/></div>}
    {!selectedCrew && <div className="crew-drag-ghost" ref={ghostRef} aria-hidden="true"/>}
  </main>;
}

export function CrewDayReport({ state, config, mission, dispatch, uiStyle = 'classic', onToggleStyle = () => {}, exiting = false }) {
  const reveal = state.session.reveal;
  const history = reveal.history;
  const events = reveal.sourceEvents || [];
  const forecastLevel = c3WeatherEstimate(reveal.day, mission, config, state.session.seed);
  const won = state.session.game.status === 'succeeded';
  const failed = state.session.game.status === 'failed';
  return <main className={`crew-report crew-report--${state.destination} smp-report-layout ${exiting ? "is-exiting" : ""}`} data-menu-style={uiStyle} style={{ '--surface-art': `url('/art/${state.destination}-landscape.svg')` }}>
    <MenuStyleSwitch uiStyle={uiStyle} onToggleStyle={onToggleStyle}/>
    <div className="smp-report-layout__grid">
    <section className="crew-report__card" data-guide-anchor="report"><span className="crew-eyebrow">MISSION LOG · DAY {reveal.day}</span><h1>{won ? 'Mission accomplished!' : failed ? 'Mission ended' : 'Day complete!'}</h1>
      <div className="crew-report__deltas">{Object.entries({air:'Air',supplies:'Supplies',safety:'Safety'}).map(([key,label]) => <div key={key}>
        <Icon type={key} size={34}/><span>{label}</span><strong>{history.meterDeltas[key]>0?'+':''}{history.meterDeltas[key]}</strong><small>{reveal.after[key]} remaining</small></div>)}</div>
      <div className="crew-report__progress"><span><Icon type="science" size={20}/> Research +{history.research.gained}</span><span><Icon type="battery" size={20}/> Battery {history.energy.batteryAfter}</span></div>
      {history.discoveryBonus && <p className="science-report-bonus" role="status">✦ Science Lab breakthrough · +{history.discoveryBonus.points} bonus Research Points</p>}
      {history.events?.length > 0 && <div className="crew-report__events"><h2>What happened</h2>{history.events.map((e,i)=><p key={i}>✓ {e}</p>)}</div>}
      <section className="crew-report__nasa"><span className="crew-eyebrow">ARCHIVED NASA DATA · DONKI</span>
        <p className="crew-report__forecast"><Icon type="storm" size={21}/> Forecast: <strong>{STORM_LABELS[forecastLevel] ?? `Level ${forecastLevel}`}</strong> · Actual game level: <strong>{STORM_LABELS[history.stormLevel] ?? `Level ${history.stormLevel}`}</strong></p>
        <p>Forecasts can be off by one level. Game storm levels are not radiation doses.</p>
        {events.length ? <><ul>{events.slice(0,3).map((e,i)=><li key={i}>{e.label} <small>ID: {e.sourceId}</small></li>)}</ul>
          {events.length>3 && <details><summary>Show {events.length-3} more events</summary><ul>{events.slice(3).map((e,i)=><li key={i}>{e.label} <small>ID: {e.sourceId}</small></li>)}</ul></details>}</>
          : <p>No archived events were listed today.</p>}</section>
      <ScienceCard card={scienceCardForHistory(cards,state.session.game.history,config)}/>
      <button type="button" className="crew-primary" onClick={() => dispatch({ type: 'CONTINUE' })}>{state.session.game.status==='running'?'Next day →':'See results →'}</button>
    </section>
    <ReportShipStage ship={state.ship} destination={state.destination}/>
    </div>
    {state.discoveryProgress.popupId && <DiscoveryPopup id={state.discoveryProgress.popupId}
      points={discoveryOptions(config)?.bonusResearchPoints ?? 0} uiStyle={uiStyle}
      onClose={() => dispatch({type:'DISMISS_DISCOVERY'})}/>}
  </main>;
}

function Debrief({ state, config, mission, dispatch, uiStyle = 'classic', onToggleStyle = () => {} }) {
  const d = c3Debrief(state.session.game, mission);
  return <main className={`crew-debrief crew-debrief--${state.destination} smp-debrief-layout`} data-menu-style={uiStyle} style={{ '--surface-art': `url('/art/${state.destination}-landscape.svg')` }}>
    <MenuStyleSwitch uiStyle={uiStyle} onToggleStyle={onToggleStyle}/>
    <div className="smp-debrief-layout__grid">
    <section className="crew-debrief__card" data-guide-anchor="debrief"><div className="crew-debrief__icon"><Icon type={d.status==='succeeded'?'trophy':'info'} size={44}/></div>
      <span className="crew-eyebrow">FINAL MISSION REPORT</span><h1>{d.status==='succeeded'?'Mission success!':'Mission complete — try again'}</h1>
      <p>{d.status==='succeeded'?'Your crew protected the outpost for all ten days.':d.reason==='safety'?'Crew Safety ran low. Try more shelter power or crew care.':d.reason==='air'?'Air ran low. Give Life Support more power.':d.reason==='supplies'?'Supplies ran low. Prepare your cargo and grow food earlier.':'Your crew needs stronger resource reserves. Try a new approach.'}</p>
      <p className="smp-debrief__mission">{SHIPS[state.ship].name} · {PLANETS[state.destination].label} · {d.daysCompleted}/{config.missionLengthDays} days</p>
      <div className="crew-debrief__score"><span><Icon type="science"/> {d.researchScore} research</span><span><Icon type="rocket"/> {d.expeditionsCompleted} expeditions</span></div>
      <div className="crew-debrief__buttons"><button type="button" className="crew-primary" onClick={() => dispatch({ type: 'RETRY' })}>Try again</button>
        <button type="button" className="crew-secondary" onClick={() => dispatch({ type: 'OPEN_COLLECTION' })}>
          <Icon type="research" size={18}/> Discovered ({state.discoveryProgress.runIds.length})</button>
        <button type="button" className="crew-secondary" onClick={() => dispatch({ type: 'BACK_TO_MENU' })}>Main menu</button></div>
      <small>Game resources are simplified. Space-weather events come from archived NASA DONKI records.</small>
    </section>
    <EndingShipStage ship={state.ship} status={d.status}/>
    </div>
  </main>;
}

export default function CrewMissionExperience({ config, mission }) {
  const [state, dispatch] = useReducer((s,a) => reduceCrewExperience(s,a,config,mission),config,
    cfg => ({ ...initCrewExperience(cfg), lifetimeDiscoveryIds: loadDiscoveryIds(
      browserDiscoveryStorage(), discoveryCatalog) }));
  const [uiStyle, setUiStyle] = useState('classic');
  const [cinematic, setCinematic] = useState(null);
  const [reportExiting, setReportExiting] = useState(false);
  // A light, non-blocking guide, separate from the mission reducer and resource engine.
  const [guidePreferences, setGuidePreferences] = useState(() => readGuidePreferences(browserGuideStorage()));
  const [guide, setGuide] = useState(null);
  const guideStage = guideStageForState(state, cinematic || reportExiting);
  const previousGuideStage = useRef(null);
  useEffect(() => {
    // A new screen starts a new chapter, never resurrecting a dismissed old chapter.
    if (previousGuideStage.current === guideStage) return;
    previousGuideStage.current = guideStage;
    setGuide(null);
    if (!guideStage || guidePreferences.disabledAuto || guidePreferences.seenStages.includes(guideStage)) return;
    setGuide({stage: guideStage, index: 0});
    setGuidePreferences(previous => writeGuidePreferences(browserGuideStorage(), markGuideStageSeen(previous, guideStage)));
  }, [guideStage, guidePreferences]);
  const openGuide = () => {
    if (!guideStage) return;
    setGuide({stage: guideStage, index: 0});
    setGuidePreferences(previous => writeGuidePreferences(browserGuideStorage(), markGuideStageSeen(previous, guideStage)));
  };
  const skipGuide = () => {
    setGuide(null);
    setGuidePreferences(previous => writeGuidePreferences(browserGuideStorage(), skipAutomaticGuide(previous)));
  };
  const guidedScreen = content => <>
    {content}
    {guideStage && <TutorialHelpButton onClick={openGuide} stage={guideStage}/>}
    {guide?.stage === guideStage && <TutorialGuide key={guideStage} stage={guideStage} stepIndex={guide.index}
      onStep={index => setGuide(current => current?.stage === guideStage ? {...current, index} : current)}
      onClose={() => setGuide(null)} onSkipAll={skipGuide} styleName={uiStyle}/>}
  </>;
  const toggleUiStyle = () => setUiStyle(nextMenuStyle);

  // Pure simulation remains authoritative. Only validated plans get an interstitial.
  const act = (action) => {
    if (cinematic || reportExiting) return;
    if (action.type === 'LAUNCH' && state.stage === 'crew-assembly') {
      const validCargo = validateCargo(state.cargo, config, config.reevaluation.crewUI).ok;
      const validCrew = state.crew.length > 0;
      dispatch(action);
      if (validCargo && validCrew) setCinematic({ kind:'launch', ship: state.ship, destination: state.destination });
      return;
    }
    if (action.type === 'COMMIT_DAY' && state.stage === 'play' && state.session?.screen === 'planning') {
      const budget = previewC3(state.session, config);
      const staffed = checkCrewStaffing(state.crew, state.session.plan);
      if (canBeginDayAnimation(true, budget.ok, staffed.ok)) {
        const forecast = c3WeatherEstimate(state.session.game.day, mission, config, state.session.seed);
        setCinematic({kind:'day', day:state.session.game.day, forecast, ship:state.ship, destination:state.destination});
      } else {
        dispatch(action); // show the existing resource/staffing error without an animation
      }
      return;
    }
    if (action.type === 'CONTINUE' && state.stage === 'play' && state.session?.screen === 'report') {
      setReportExiting(true);
      return;
    }
    if (action.type === 'RETRY' && state.stage === 'play' && state.session?.screen === 'debrief') {
      dispatch(action);
      setCinematic({ kind:'launch', ship: state.ship, destination: state.destination });
      return;
    }
    dispatch(action);
  };

  // Exit animation completes before the next planning/debrief screen is mounted.
  useEffect(() => {
    if (!reportExiting) return;
    const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const timer = setTimeout(() => {
      dispatch({type:'CONTINUE'});
      setReportExiting(false);
    }, reduced ? 0 : CINEMATIC_DURATIONS.reportExit);
    return () => clearTimeout(timer);
  }, [reportExiting]);

  useEffect(() => {
    saveDiscoveryIds(browserDiscoveryStorage(),
      state.lifetimeDiscoveryIds, discoveryCatalog);
  }, [state.lifetimeDiscoveryIds]);

  const finishCinematic = () => {
    if (cinematic?.kind === 'day') dispatch({type:'COMMIT_DAY'});
    setCinematic(null);
  };

  if (state.collectionScope) {
    const lifetime = state.collectionScope === 'lifetime';
    const ids = lifetime ? state.lifetimeDiscoveryIds : state.discoveryProgress.runIds;
    return guidedScreen(<DiscoveryCollection ids={ids} styleName={uiStyle}
      title={lifetime ? 'Your discoveries' : 'Discovered this mission'}
      subtitle={lifetime ? 'A collection of space-biology investigations from all your missions.' : 'Space-biology investigations your science specialist completed during this mission.'}
      onBack={() => act({type:'CLOSE_COLLECTION'})}
      onReset={lifetime ? () => { clearDiscoveryIds(browserDiscoveryStorage()); act({type:'RESET_SAVED_DISCOVERIES'}); } : undefined}
      headerAction={<MenuStyleSwitch uiStyle={uiStyle} onToggleStyle={toggleUiStyle}/>} />);
  }
  if (state.stage === 'menu') return guidedScreen(<ShipPicker state={state} dispatch={act} uiStyle={uiStyle} onToggleStyle={toggleUiStyle}/>);
  if (state.stage === 'preparation') return guidedScreen(<Preparation state={state} config={config} dispatch={act} uiStyle={uiStyle} onToggleStyle={toggleUiStyle}/>);
  if (state.stage === 'crew-assembly') return guidedScreen(<CrewAssembly state={state} config={config} dispatch={act} uiStyle={uiStyle} onToggleStyle={toggleUiStyle}/>);

  if (cinematic?.kind === 'day') {
    return <DayPassage key={`day-${cinematic.day}`} ship={cinematic.ship} destination={cinematic.destination}
      day={cinematic.day} forecastLevel={cinematic.forecast}
      min={config.stormLevelRange[0]} max={config.stormLevelRange[1]}
      onComplete={finishCinematic}/>;
  }
  if (cinematic?.kind === 'launch') {
    return <>
      <div inert aria-hidden="true"><CrewGameplay state={state} config={config} mission={mission}
        dispatch={act} uiStyle={uiStyle} onToggleStyle={toggleUiStyle} arriving/></div>
      <LaunchCinematic key={`launch-${state.session?.game.day ?? 1}`} ship={cinematic.ship}
        destination={cinematic.destination} onComplete={finishCinematic}/>
    </>;
  }
  if (state.session.screen === 'report') return guidedScreen(<CrewDayReport state={state} config={config} mission={mission}
    dispatch={act} uiStyle={uiStyle} onToggleStyle={toggleUiStyle} exiting={reportExiting}/>);
  if (state.session.screen === 'debrief') {
    // Victory plays a homecoming, defeat uses symbolic drifting ship fragments.
    endingMotion(state.session.game.status);
    return guidedScreen(<Debrief state={state} config={config} mission={mission}
      dispatch={act} uiStyle={uiStyle} onToggleStyle={toggleUiStyle}/>);
  }
  return guidedScreen(<CrewGameplay state={state} config={config} mission={mission} dispatch={act}
    uiStyle={uiStyle} onToggleStyle={toggleUiStyle}/>);
}
