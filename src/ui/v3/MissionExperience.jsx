import { useReducer } from 'react';
import CutawaySceneC from '../../scene/CutawaySceneC.jsx';
import {
  c3BatteryCapacity, c3Debrief, c3Generation, c3UpgradeCost,
  EXPEDITIONS_C3, ROOMS_C3,
} from '../../logic/v3/engine.js';
import { initC3Session, reduceC3Session, previewC3 } from './controller.js';
import ScienceCard from '../ScienceCard.jsx';
import VerifiedFact from '../VerifiedFact.jsx';
import cards from '../../data/cards.json';
import { chooseScienceCard, scienceCardForHistory } from '../science-content.js';
import './experience.css';

const ROOM_NAMES = {
  lifeSupport:'Life Support', greenhouse:'Greenhouse', power:'Power Station',
  science:'Science Lab', shield:'Storm Shelter', comms:'Communications',
};
const METER_NAMES = {
  air: ['Air','◌'], supplies: ['Supplies','▣'], safety: ['Crew Safety','◇'],
};
const ROOM_DESCRIPTIONS = {
  lifeSupport:'Make breathable Air and care for the crew.',
  greenhouse:'Grow food for tomorrow. Water is handled by life support.',
  power:'Save Energy today, or use stored Energy when needed.',
  science:'Earn Research Points, upgrade systems, and launch EVA tasks.',
  shield:'Prepare the protective shelter. Materials remain in place.',
  comms:'Ask Earth for advice. Responses need time to arrive.',
};
const BENEFITS = {
  lifeSupport:'Each Energy unit supports Air production today.',
  greenhouse:'Production adds to the next day’s Supplies.',
  science:'Science uses Energy and earns Research Points.',
  shield:'Shelter power protects crew readiness from game storm damage.',
};
const WEATHER = ['Quiet','Minor','Moderate','Severe'];

function Meter({ name, meter, config }) {
  const [label, symbol] = METER_NAMES[name];
  const percent = Math.round(meter / config.meterMax * 100);
  const low = meter <= config.reevaluation.c3.advisor.lowMeterThreshold;
  return <div className="c3-meter" aria-label={`${label}: ${meter} of ${config.meterMax} game units`}>
    <div className="c3-meter__head"><span aria-hidden="true">{symbol}</span><span>{label}</span><strong>{meter}/{config.meterMax}</strong></div>
    <div className="c3-meter__track"><span className={low?'c3-meter__fill is-low':'c3-meter__fill'} style={{width:`${percent}%`}}/></div>
  </div>;
}

function TopBar({ config, session, preview }) {
  const { game } = session;
  return <header className="c3-topbar">
    <div className="c3-topbar__title"><small>MOONBASE / MISSION CONTROL</small><strong>Day {game.day} <span>of {config.missionLengthDays}</span></strong></div>
    <div className="c3-topbar__meters">
      {Object.keys(METER_NAMES).map(key => <Meter key={key} name={key} meter={game.meters[key]} config={config}/>)}
    </div>
    <div className="c3-topbar__economy"><span>Energy <strong>{preview.used}/{preview.generation}</strong> generated</span><span>Battery <strong>{game.battery}/{c3BatteryCapacity(game,config)}</strong></span><span>Research <strong>{game.research.available}</strong> spendable</span></div>
  </header>;
}

function Stepper({ label, value, range, onDelta, note }) {
  return <div className="c3-stepper-block">
    <div className="c3-stepper-block__head"><strong>{label}</strong><span>{range[0]}–{range[1]} game units</span></div>
    <div className="c3-stepper"><button type="button" disabled={value <= range[0]} aria-label={`Decrease ${label}`} onClick={()=>onDelta(-1)}>−</button>
      <output aria-live="polite" aria-label={`${label}: ${value}`}>{value}</output>
      <button type="button" disabled={value >= range[1]} aria-label={`Increase ${label}`} onClick={()=>onDelta(1)}>+</button></div>
    <p className="c3-help">{note}</p>
  </div>;
}

function UpgradeOffer({ room, session, config, dispatch }) {
  const current = session.game.roomLevels[room];
  const cost = c3UpgradeCost(room, session.game, config);
  const selected = session.plan.upgradeRoom === room;
  return <div className="c3-upgrade" aria-label={`Upgrade ${ROOM_NAMES[room]}`}>
    <div className="c3-upgrade__head"><strong>Room upgrade</strong><span>Level {current} / {config.reevaluation.c3.upgrades.maxLevel}</span></div>
    {cost ? <>
      <p>Next level: {cost.points} Research Points + {cost.energy} Energy.</p>
      <p className="c3-help">Built at day's end. Improved performance begins tomorrow.</p>
      <button type="button" className={selected?'c3-option is-selected':'c3-option'} aria-pressed={selected}
        disabled={!selected && session.game.research.available < cost.points}
        onClick={()=>dispatch({type:'UPGRADE',room})}>{selected?'Cancel planned upgrade':`Plan ${ROOM_NAMES[room]} Level ${cost.nextLevel}`}</button>
    </> : <p>Maximum level reached.</p>}
    {session.plan.upgradeRoom && session.plan.upgradeRoom !== room && <p className="c3-help">An upgrade is already planned for {ROOM_NAMES[session.plan.upgradeRoom]} today.</p>}
  </div>;
}

function ExpeditionDesk({ session, config, dispatch }) {
  const active = session.game.expedition.active;
  return <div className="c3-feature"><h3>Expedition desk</h3>
    <p className="c3-help">Send a prepared crew. Air, Supplies, and Energy are spent now.</p>
    {active ? <p role="status" className="c3-status">Crew away: {config.reevaluation.c3.expeditions[active.kind].label}. Returns after Day {active.dueDay}.</p>
      : <div className="c3-option-list">{EXPEDITIONS_C3.map(kind => {
        const task = config.reevaluation.c3.expeditions[kind];
        const selected = session.plan.expedition === kind;
        return <button type="button" key={kind} aria-pressed={selected} className={selected?'c3-option is-selected':'c3-option'}
          onClick={()=>dispatch({type:'EXPEDITION',kind})}>
          <strong>{task.label}</strong>
          <span>Cost: {task.airCost} Air, {task.suppliesCost} Supplies, {task.energyCost} Energy</span>
          <span>Returns in {task.duration} turn{task.duration === 1 ? '' : 's'} · Reward: {Object.entries(task.reward).map(([k,v])=>`${v} ${k}`).join(', ')}</span>
        </button>;
      })}</div>}
    <p className="c3-help">Scenario rewards are simplified game resources, not NASA measurements.</p>
  </div>;
}

function CommsDesk({ session, config, dispatch }) {
  const { comms } = session.game;
  const selected = session.plan.requestAdvice;
  return <div className="c3-feature"><h3>Earth research advice</h3>
    <VerifiedFact factId="fact-comm-delay"/>
    {comms.pending ? <p className="c3-status" role="status">Reply pending. Expected after Day {comms.pending.dueDay}.{comms.pending.postponed ? ' Already delayed once.' : ''}</p>
      : <button type="button" className={selected?'c3-option is-selected':'c3-option'} aria-pressed={selected}
        onClick={()=>dispatch({type:'ADVICE'})}>
        {selected?'Cancel advice request':`Request advice · ${config.reevaluation.c3.comms.sendEnergyCost} Energy`}
      </button>}
    {comms.lastAdvice && <div className="c3-advice" aria-live="polite">
      <strong>Earth response · received Day {comms.lastAdvice.receivedDay}</strong>
      <p>{comms.lastAdvice.message}</p>
      <p>Suggested upgrade: {comms.lastAdvice.recommendedUpgrade ? ROOM_NAMES[comms.lastAdvice.recommendedUpgrade] : 'All rooms are fully upgraded'}.</p>
      <p className="c3-help">{comms.lastAdvice.weatherEstimate === null ? 'No additional warning available.' :
        `Possible next-day game weather: ${WEATHER[comms.lastAdvice.weatherEstimate]}. This is not an official NASA forecast.`}</p>
    </div>}
    <p className="c3-help">Replies use simulated processing time. Storm interference is a game rule, not a documented Moon-link outage.</p>
  </div>;
}

function RoomPanel({ session, config, preview, dispatch }) {
  const room = session.selectedRoom;
  const c = config.reevaluation.c3;
  const actionable = ['lifeSupport','greenhouse','science','shield'].includes(room);
  const space = c3BatteryCapacity(session.game,config);
  return <aside className="c3-panel" aria-label="Room management panel">
    <small className="c3-eyebrow">SELECTED ROOM · LEVEL {session.game.roomLevels[room]}</small>
    <h2>{ROOM_NAMES[room]}</h2><p>{ROOM_DESCRIPTIONS[room]}</p>
    {actionable && <Stepper label={`${ROOM_NAMES[room]} Energy`} value={session.plan.allocation[room]}
      range={config.allocationRanges[room]} note={BENEFITS[room]}
      onDelta={delta=>dispatch({type:'ALLOCATE',consumer:room,delta})}/>}
    {room === 'lifeSupport' && <div className="c3-feature"><h3>Crew care</h3><p>Restore up to {c.care.safetyGain} Crew Safety for {c.care.energyCost} Energy and {c.care.suppliesCost} Supplies.</p>
      <p className="c3-help">Safety is crew readiness, not a measure of radiation exposure. Crew care needs recovery time.</p>
      <button type="button" aria-pressed={session.plan.care} className={session.plan.care?'c3-option is-selected':'c3-option'} onClick={()=>dispatch({type:'CARE'})}>
        {session.plan.care?'Cancel crew care':'Schedule crew care'}</button></div>}
    {room === 'power' && <div className="c3-feature"><h3>Energy storage</h3>
      <p>Generated today: <strong>{preview.generation}</strong> · Battery: <strong>{session.game.battery}/{space}</strong></p>
      <p>Planned automatic battery draw: <strong>{preview.batteryDraw}</strong></p>
      <Stepper label="Battery charge today" value={session.plan.charge} range={[0,Math.min(c.battery.maxChargePerDay,space)]}
        onDelta={delta=>dispatch({type:'CHARGE',delta})} note="Only spare generated Energy can be stored; stored power is used automatically when needed."/>
      <p className="c3-help">Unused Energy not stored is lost after today.</p>
    </div>}
    {room === 'science' && <div className="c3-feature"><h3>Research progress</h3>
      <p>Lifetime research: <strong>{session.game.research.earned}</strong> · Available: <strong>{session.game.research.available}</strong></p>
      <p className="c3-help">Spend Points on upgrades without reducing your lifetime research score.</p>
      <ExpeditionDesk session={session} config={config} dispatch={dispatch}/>
    </div>}
    {room === 'shield' && <VerifiedFact factId="fact-shielding"/>}
    {room === 'comms' && <CommsDesk session={session} config={config} dispatch={dispatch}/>}
    <UpgradeOffer room={room} session={session} config={config} dispatch={dispatch}/>
    <nav className="c3-rooms-list" aria-label="Switch outpost room">
      {ROOMS_C3.map(key=><button type="button" key={key} aria-pressed={key===room} onClick={()=>dispatch({type:'SELECT_ROOM',room:key})}>{ROOM_NAMES[key]} <small>Lv {session.game.roomLevels[key]}</small></button>)}
    </nav>
  </aside>;
}

function Briefing({ config, mission, onStart }) {
  return <main className="c3-intro-wrap"><section className="c3-intro">
    <small className="c3-eyebrow">ASTROQUEST · JUNIOR ASTRONAUT MISSION TRAINER</small>
    <h1>Build a stronger Moon outpost.</h1>
    <p>Keep Air, Supplies, and Crew Safety high for {config.missionLengthDays} days.</p>
    <ol><li>Select a room to plan its Energy.</li><li>Earn Research Points and upgrade any room to Level 3.</li>
      <li>Store spare Energy. Care for the crew when needed.</li><li>Request Earth advice or send a prepared expedition.</li>
      <li>Finish each day and learn from the report.</li></ol>
    <ScienceCard card={chooseScienceCard(cards,{stage:'briefing'})}/>
    <p className="c3-help">All meters and upgrade costs are simplified game units. Space-weather reports use {mission.dataSource}.</p>
    <button className="c3-primary" type="button" onClick={onStart}>Start mission</button>
  </section></main>;
}

function Report({ config, session, onContinue }) {
  const { reveal, game } = session;
  const h = reveal.history;
  return <main className="c3-report-wrap"><article className="c3-report">
    <small className="c3-eyebrow">DAY {reveal.day} / MISSION REPORT</small><h1>Here's what changed.</h1>
    <div className="c3-result-grid">{Object.keys(METER_NAMES).map(name=><div key={name} className="c3-result-stat">
      <span>{METER_NAMES[name][0]}</span><strong>{h.meterDeltas[name]>=0?'+':''}{h.meterDeltas[name]}</strong><small>Now {reveal.after[name]}/{config.meterMax}</small>
    </div>)}</div>
    <div className="c3-report__stats"><p>Research earned today: <strong>+{h.research.gained}</strong> · Spent: <strong>{h.research.spent}</strong></p>
      <p>Battery: <strong>{h.energy.batteryAfter}</strong> · Charged: <strong>{h.energy.stored}</strong> · Used from battery: <strong>{h.energy.drawn}</strong></p>
    </div>
    <h2>Outpost achievements</h2>
    {h.events.length ? <ul className="c3-feedback-list">{h.events.map((e,i)=><li key={i}>{e}</li>)}</ul> : <p>You completed your plan. Review your resources for tomorrow.</p>}
    <h2>Archived NASA space-weather records</h2>
    <p><strong>{WEATHER[h.stormLevel]}</strong> — simplified storm level, not a lunar radiation dose.</p>
    {reveal.sourceEvents.length ? <><ul className="c3-source-list">{reveal.sourceEvents.slice(0,3).map((e,i)=><li key={`${e.sourceId}-${i}`}>{e.label} <small>NASA DONKI ID: {e.sourceId}</small></li>)}</ul>
      {reveal.sourceEvents.length>3 && <details className="c3-more-events"><summary>Show {reveal.sourceEvents.length-3} more archived event records</summary><ul className="c3-source-list">{reveal.sourceEvents.slice(3).map((e,i)=><li key={`${e.sourceId}-extra-${i}`}>{e.label} <small>NASA DONKI ID: {e.sourceId}</small></li>)}</ul></details>}</>
      : <p>No event records were listed for this day.</p>}
    <ScienceCard card={scienceCardForHistory(cards,game.history,config)}/>
    <button className="c3-primary" type="button" onClick={onContinue}>{game.status==='running'?'Plan next day':'See final debrief'}</button>
  </article></main>;
}

function Debrief({ config, session, mission, onRestart }) {
  const result = c3Debrief(session.game,mission);
  const reason = result.reason === 'objectives-not-met' ? 'Your crew survived, but a final resource was below the mission goal.'
    : result.reason === 'air' ? 'Air ran out. Try stronger Life Support or a timely upgrade.'
    : result.reason === 'supplies' ? 'Supplies ran out. Power the Greenhouse earlier or retrieve a cache.'
    : result.reason === 'safety' ? 'Crew readiness fell too low. Combine shelter power with care or maintenance.'
    : 'You managed your outpost successfully.';
  return <main className="c3-report-wrap"><article className="c3-report">
    <small className="c3-eyebrow">MISSION DEBRIEF</small>
    <h1>{result.status==='succeeded'?'Outpost mission achieved!':'Mission finished. Adjust your plan.'}</h1>
    <p>{reason}</p>
    <div className="c3-result-grid">{Object.keys(METER_NAMES).map(name=><div className="c3-result-stat" key={name}><span>{METER_NAMES[name][0]}</span><strong>{result.meters[name]}</strong><small>Game units</small></div>)}</div>
    <p>Days completed: <strong>{result.daysCompleted}/{config.missionLengthDays}</strong></p>
    <p>Lifetime Research score: <strong>{result.researchScore}</strong> · Unspent: <strong>{result.researchAvailable}</strong></p>
    <p>Expeditions returned: <strong>{result.expeditionsCompleted}</strong></p>
    <h2>Final room levels</h2>
    <div className="c3-level-grid">{ROOMS_C3.map(room=><span key={room}>{ROOM_NAMES[room]}: <strong>Lv {result.upgrades[room]}</strong></span>)}</div>
    {result.pendingRequest && <p className="c3-help">A request remained pending when the mission ended.</p>}
    <p className="c3-help">Real events: {result.source}. Game meters and expedition rewards are simplified, not measurements.</p>
    <button className="c3-primary" type="button" onClick={onRestart}>Try again</button>
  </article></main>;
}

export default function MissionExperienceC({ config, mission }) {
  const [session, dispatch] = useReducer((state,action)=>reduceC3Session(state,action,config,mission),null,()=>initC3Session(config,mission));
  if(session.screen==='briefing') return <Briefing config={config} mission={mission} onStart={()=>dispatch({type:'START'})}/>;
  if(session.screen==='report') return <Report config={config} session={session} onContinue={()=>dispatch({type:'CONTINUE'})}/>;
  if(session.screen==='debrief') return <Debrief config={config} session={session} mission={mission} onRestart={()=>dispatch({type:'RESTART'})}/>;
  const preview = previewC3(session,config);
  return <main className="c3-app">
    <TopBar config={config} session={session} preview={preview}/>
    <div className="c3-day-note"><div><small className="c3-eyebrow">MISSION PLANNING</small>
      <p>Weather is uncertain. Earth advice can help, but the decision is yours.</p></div>
      <button type="button" onClick={()=>dispatch({type:'RESTART'})}>Restart</button></div>
    <div className="c3-main-grid">
      <CutawaySceneC config={config} session={session} onSelectRoom={room=>dispatch({type:'SELECT_ROOM',room})}/>
      <RoomPanel config={config} session={session} preview={preview} dispatch={dispatch}/>
    </div>
    <footer className="c3-footer">
      <div><strong>Energy plan: {preview.used} / {preview.generation} generated</strong>
        <p>Available stored Energy: {session.game.battery} · Charge planned: {session.plan.charge}</p>
        <small>One shared Energy budget · All resources are game units</small>
        {session.error && <p className="c3-error" role="alert">{session.error}</p>}
      </div>
      <button type="button" className="c3-primary" disabled={!preview.ok} onClick={()=>dispatch({type:'COMMIT'})}>Run this day</button>
    </footer>
  </main>;
}
