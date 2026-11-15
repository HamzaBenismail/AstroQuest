import { useReducer } from 'react';
import CutawayScene from '../../scene/CutawayScene.jsx';
import { v2Debrief } from '../../logic/v2/engine.js';
import { ROOMS, initV2Session, reduceV2Session, previewV2 } from './controller.js';
import './experience.css';
import cards from '../../data/cards.json';
import ScienceCard from '../ScienceCard.jsx';
import VerifiedFact from '../VerifiedFact.jsx';
import { chooseScienceCard, scienceCardForHistory } from '../science-content.js';

const LEVELS = ['Quiet', 'Minor', 'Moderate', 'Severe'];
const METERS = [
  { id: 'air', label: 'Air', symbol: '◌' },
  { id: 'supplies', label: 'Supplies', symbol: '◧' },
  { id: 'safety', label: 'Crew Safety', symbol: '◇' },
];
const BENEFITS = {
  lifeSupport: 'Air systems need power every day.',
  greenhouse: 'Today’s greenhouse work helps Supplies on the following day.',
  shield: 'Shelter readiness reduces damage from an actual storm.',
  science: 'Research earns progress toward one useful upgrade.',
};

function StatBar({ label, value, max, symbol }) {
  const percent = Math.round(value / max * 100);
  return <div className="v2-stat" aria-label={`${label}: ${value} of ${max} game units`}>
    <div className="v2-stat__head"><span><span aria-hidden="true">{symbol}</span> {label}</span><strong>{value}<small>/{max}</small></strong></div>
    <div className="v2-stat__track"><span style={{width:`${percent}%`}} className={value < max * .3 ? 'is-low' : ''}/></div>
  </div>;
}

function HUD({ game, config, budget, used }) {
  return <header className="v2-hud" aria-label="Mission status">
    <div className="v2-hud__day"><span className="v2-kicker">MOONBASE / MISSION CONTROL</span><strong>Day {game.day} <span>of {config.missionLengthDays}</span></strong></div>
    <div className="v2-hud__meters">{METERS.map(m => <StatBar key={m.id} {...m} value={game.meters[m.id]} max={config.meterMax}/>)}</div>
    <div className="v2-energy"><span>ENERGY</span><strong>{used} <small>/ {budget}</small></strong><small>game units used today</small></div>
  </header>;
}

function AllocationStepper({ room, allocation, config, dispatch, preview }) {
  const key = room.action;
  const [min, max] = config.allocationRanges[key];
  return <div className="v2-stepper-block">
    <p className="v2-kicker">POWER ALLOCATION</p>
    <div className="v2-stepper"><button type="button" aria-label={`Decrease ${room.name} power`} disabled={allocation[key] <= min}
      onClick={() => dispatch({type:'ALLOCATE',consumer:key,delta:-1})}>−</button>
      <output aria-live="polite" aria-label={`${room.name}: ${allocation[key]} power units`}>{allocation[key]}</output>
      <button type="button" aria-label={`Increase ${room.name} power`} disabled={allocation[key] >= max || preview.remaining <= 0}
        onClick={() => dispatch({type:'ALLOCATE',consumer:key,delta:1})}>+</button></div>
    <p className="v2-caption">{BENEFITS[key]}</p>
    <p className="v2-caption">Range: {min}–{max} game units</p>
  </div>;
}

function RoomPanel({ session, config, dispatch, preview }) {
  const room = ROOMS.find(x => x.id === session.selectedRoom) ?? ROOMS[0];
  const comms = session.game.comms;
  return <aside className="v2-room-panel" aria-label="Room management">
    <div className="v2-room-panel__heading"><span className="v2-kicker">SELECTED MODULE</span><h2>{room.name}</h2><p>{room.desc}</p></div>
    {room.action ? <AllocationStepper room={room} allocation={session.allocation} config={config} dispatch={dispatch} preview={preview}/> : null}
    {room.id === 'shield' && <><VerifiedFact factId="fact-shielding"/><VerifiedFact factId="fact-dose"/></>}
    {room.id === 'power' && <VerifiedFact factId="fact-lunar-night"/>}
    {room.id === 'comms' && <VerifiedFact factId="fact-comm-delay"/>}
    {room.id === 'power' && <div className="v2-power-breakdown">
      <strong>Today's energy plan</strong>
      {ROOMS.filter(item => item.action).map(item => <p key={item.id}><span>{item.name}</span><strong>{session.allocation[item.action]}</strong></p>)}
      <p><span>Earth message</span><strong>{session.requestKind ? config.reevaluation.comms.sendEnergyCost : 0}</strong></p>
      <p className="v2-power-breakdown__total"><span>Used / Available</span><strong>{preview.used} / {preview.budget}</strong></p>
      <small>Unused Energy is lost after this day.</small>
    </div>}
    {room.id === 'science' && <div className="v2-research-status">
      <p>Research earned: <strong>{session.game.researchTotal}</strong> / {config.reevaluation.research.unlockThreshold} for an upgrade</p>
      {session.game.upgrade && <p>Active upgrade: <strong>{session.game.upgrade === 'air-recycler' ? 'Air Recycler' : 'Weather Analyst'}</strong></p>}
      <p className="v2-caption">Build research, then choose one upgrade for the remaining mission.</p>
    </div>}
    {room.id === 'comms' && <div className="v2-communications">
      <p className="v2-kicker">EARTH CONNECTION</p>
      {comms.pending ? <p role="status">Request pending: {comms.pending.kind === 'weather-review' ? 'Weather Review' : 'Research Advice'} · expected after day {comms.pending.dueDay} report{comms.pending.postponed ? ' (delayed once)' : ''}.</p>
        : <><p>Select one request. Sending it uses {config.reevaluation.comms.sendEnergyCost} Energy today.</p>
          <button type="button" className={session.requestKind === 'weather-review' ? 'is-chosen' : ''} aria-pressed={session.requestKind === 'weather-review'}
            onClick={() => dispatch({type:'REQUEST',kind:'weather-review'})}>Weather Review</button>
          <button type="button" className={session.requestKind === 'research-advice' ? 'is-chosen' : ''} aria-pressed={session.requestKind === 'research-advice'}
            onClick={() => dispatch({type:'REQUEST',kind:'research-advice'})}>Research Advice</button>
          <p className="v2-caption">The reply takes simulated processing turns. Storms may postpone it once.</p></>}
      {comms.lastResponse && <p className="v2-reply">Last reply: {comms.lastResponse.kind === 'weather-review' ? 'Forecast help' : 'Research advice'} received on day {comms.lastResponse.deliveredDay}.</p>}
      {session.forecast === config.stormLevelRange[1] && <p className="v2-caption">Forecast: severe. The simulated link may be interrupted.</p>}
    </div>}
    <nav aria-label="Switch rooms" className="v2-room-switcher">
      {ROOMS.map(item => <button key={item.id} type="button" aria-pressed={room.id === item.id}
        onClick={() => dispatch({type:'SELECT_ROOM',room:item.id})}>{item.name}</button>)}
    </nav>
  </aside>;
}

function Briefing({ config, mission, onStart }) {
  return <main className="v2-start"><div className="v2-start__card">
    <p className="v2-kicker">JUNIOR ASTRONAUT MISSION TRAINER / REEVALUATION B</p>
    <h1>Run a Moon base. Keep your crew safe.</h1>
    <p>Plan Energy for {config.missionLengthDays} days. Build research and prepare for real archived space-weather events.</p>
    <ol><li>Choose a room inside your outpost.</li><li>Share Energy between Air, greenhouse, research and shelter.</li>
      <li>Send optional requests to Earth. Replies take simulated processing turns.</li><li>Commit your plan. Read the report. Improve your next choice.</li></ol>
    <p className="v2-caption">All survival meters and Energy are game units. Storm reports use {mission.dataSource}. Forecasts are game estimates.</p>
    <ScienceCard card={chooseScienceCard(cards, {stage: 'briefing'})}/>
    <button type="button" className="v2-main-button" onClick={onStart}>Launch Mission</button>
    <p className="v2-caption">Independent educational prototype. Not a NASA forecasting tool.</p>
  </div></main>;
}

function DayReport({ session, config, onContinue }) {
  const { reveal } = session;
  const deltas = reveal.history.meterDeltas;
  const eventCount = reveal.events.length;
  return <main className="v2-report-wrap"><article className="v2-report">
    <p className="v2-kicker">DAY {reveal.day} / MISSION LOG</p><h1>Day {reveal.day} complete</h1>
    <p>Game forecast: <strong>{LEVELS[reveal.forecast]}</strong> · Actual game storm: <strong>{LEVELS[reveal.realLevel]}</strong></p>
    <p className="v2-caption">Storm categories are simplified game levels, not real lunar radiation doses.</p>
    <div className="v2-report__deltas">{METERS.map(m => <div key={m.id}><span>{m.label}</span><strong>{deltas[m.id] >= 0 ? '+' : ''}{deltas[m.id]}</strong><small>Now {reveal.after[m.id]} of {config.meterMax}</small></div>)}</div>
    <h2>Archived NASA event records</h2>
    {eventCount ? <><ul className="v2-events">{reveal.events.slice(0, 4).map((e, index) => <li key={`${e.sourceId}-${index}`}>{e.label} <small>DONKI ID: {e.sourceId}</small></li>)}</ul>
      {eventCount > 4 && <p className="v2-caption">And {eventCount - 4} more archived events in this day.</p>}</> : <p>No recorded events in this mission window for this day.</p>}
    {reveal.history.communicationEvent && <p className="v2-comm-event">{reveal.history.communicationEvent}</p>}
    <p>Research: <strong>{session.game.researchTotal} points</strong></p>
    <ScienceCard card={scienceCardForHistory(cards, session.game.history, config)}/>
    <button type="button" className="v2-main-button" onClick={onContinue}>{reveal.status === 'running' ? 'Plan next day' : 'See debrief'}</button>
  </article></main>;
}

function UpgradeChoice({ config, game, onChoose }) {
  return <main className="v2-report-wrap"><section className="v2-report">
    <p className="v2-kicker">RESEARCH MILESTONE REACHED</p><h1>Choose one outpost upgrade</h1>
    <p>Your Science work earned an improvement. Choose carefully; you can only take one.</p>
    <div className="v2-upgrades"><button type="button" onClick={() => onChoose('air-recycler')}><strong>Air Recycler</strong><span>Uses {config.reevaluation.research.airUseReduction} fewer Air units each future day.</span></button>
      <button type="button" onClick={() => onChoose('weather-analyst')}><strong>Weather Analyst</strong><span>Makes future game forecasts more reliable. Real NASA events stay unchanged.</span></button></div>
    <p className="v2-caption">Research earned: {game.researchTotal} points. These are simplified game upgrades.</p>
  </section></main>;
}

function Debrief({ session, mission, config, onRestart }) {
  const d = v2Debrief(session.game, mission);
  const reasons = {
    air: 'The crew needed more Air. Plan extra Life Support power next time.',
    supplies: 'Supplies ran low. Power the Greenhouse earlier.',
    safety: 'The Storm Shelter needed more power. Watch the forecast.',
    'objectives-not-met': 'The crew survived, but one final resource was below the goal.',
  };
  return <main className="v2-report-wrap"><article className="v2-report">
    <p className="v2-kicker">FINAL MISSION DEBRIEF</p><h1>{d.status === 'succeeded' ? 'Mission accomplished!' : 'Mission ended. Try a new strategy.'}</h1>
    <p>{d.status === 'succeeded' ? `You protected the crew and finished all ${config.missionLengthDays} days.` : reasons[d.reason] ?? 'Each choice teaches us something. Try again.'}</p>
    <div className="v2-report__deltas">{METERS.map(m => <div key={m.id}><span>{m.label}</span><strong>{d.meters[m.id]}</strong><small>Game units</small></div>)}</div>
    <p>Days completed: <strong>{d.daysCompleted} of {config.missionLengthDays}</strong></p><p>Research score: <strong>{d.score}</strong></p>
    <p>Upgrade: <strong>{d.upgrade ?? 'None'}</strong></p>
    {d.pendingRequest && <p className="v2-caption">An Earth request was still pending when the mission ended.</p>}
    <p className="v2-caption">Mission data: {d.source}. Not live. This is an independent project.</p>
    <button type="button" className="v2-main-button" onClick={onRestart}>Try again</button>
  </article></main>;
}

export default function MissionExperience({ config, mission }) {
  const [session, dispatch] = useReducer((state, action) => reduceV2Session(state, action, config, mission), null, () => initV2Session(config, mission));
  if (session.screen === 'briefing') return <Briefing config={config} mission={mission} onStart={() => dispatch({type:'START'})}/>;
  if (session.screen === 'report') return <DayReport config={config} session={session} onContinue={() => dispatch({type:'CONTINUE'})}/>;
  if (session.screen === 'upgrade') return <UpgradeChoice config={config} game={session.game} onChoose={kind => dispatch({type:'CHOOSE_UPGRADE',kind})}/>;
  if (session.screen === 'debrief') return <Debrief config={config} mission={mission} session={session} onRestart={() => dispatch({type:'RESTART'})}/>;
  const preview = previewV2(session, config);
  return <main className="v2-app">
    <HUD game={session.game} config={config} budget={preview.budget} used={preview.used}/>
    <section className="v2-forecast" aria-live="polite"><div><span className="v2-kicker">GAME WEATHER FORECAST</span>
      <strong>{LEVELS[session.forecast]} forecast</strong><span>Real level revealed after your plan</span></div>
      <button type="button" onClick={() => dispatch({type:'RESTART'})}>Restart</button></section>
    <div className="v2-layout">
      <CutawayScene config={config} session={session} onSelectRoom={room => dispatch({type:'SELECT_ROOM',room})}/>
      <RoomPanel session={session} config={config} dispatch={dispatch} preview={preview}/>
    </div>
    <footer className="v2-action"><div><strong>{preview.used} of {preview.budget} Energy used</strong><p>{preview.remaining} remain. Unspent Energy is lost.</p>
      <small>Simulated resource units · Archived NASA storm events</small></div>
      {session.error && <p role="alert" className="v2-error">{session.error}</p>}
      <button type="button" className="v2-main-button" disabled={!preview.ok} onClick={() => dispatch({type:'COMMIT'})}>Commit today's plan</button>
    </footer>
  </main>;
}
