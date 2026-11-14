import ShipScene from './components/ShipScene';
import { ROOM_INFO, DAILY_POWER, type RoomId, type SystemId } from './game/types';
import { budgetUsed } from './game/simulation';
import { useMissionStore } from './store/useMissionStore';

const systemList: { key: SystemId; title: string; code: string; accent: string; room: RoomId }[] = [
  { key: 'lifeSupport', title: 'Life support', code: 'O₂', accent: 'teal', room: 'lifeSupport' },
  { key: 'communications', title: 'Communications', code: 'TX', accent: 'blue', room: 'communications' },
  { key: 'science', title: 'Science lab', code: 'SC', accent: 'amber', room: 'science' }
];

function Meter({ name, value, unit, color, warning }: { name: string; value: number; unit: string; color: string; warning?: boolean }) {
  return (
    <div className="meter">
      <div className="meter-label"><span>{name}</span><b className={warning ? 'danger-text' : ''}>{value}<small>{unit}</small></b></div>
      <div className="meter-rail"><div className={`meter-fill ${color}`} style={{ width: `${Math.max(0, Math.min(value, 100))}%` }} /></div>
    </div>
  );
}

function PowerControls() {
  const { budget, shelterPrepared, status, changePower, toggleShelter, selectRoom } = useMissionStore();
  const used = budgetUsed(budget, shelterPrepared);
  return (
    <section className="power-section">
      <div className="section-title"><span>POWER DISTRIBUTION</span><span className="power-used">{used} <span className="muted">/ {DAILY_POWER} UNITS</span></span></div>
      <div className="budget-track">
        <div className="segment teal" style={{ width: `${budget.lifeSupport * 10}%` }} />
        <div className="segment blue" style={{ width: `${budget.communications * 10}%` }} />
        <div className="segment amber" style={{ width: `${budget.science * 10}%` }} />
        <div className="segment coral" style={{ width: `${(shelterPrepared ? 2 : 0) * 10}%` }} />
      </div>
      <div className="systems">
        {systemList.map((system) => (
          <div key={system.key} className="system-row">
            <button className="system-name" onClick={() => selectRoom(system.room)}>
              <span className={`system-dot ${system.accent}`} />
              <span>{system.title}</span>
            </button>
            <div className="stepper">
              <button aria-label={`Reduce ${system.title} power`} disabled={status !== 'active' || budget[system.key] <= 0} onClick={() => changePower(system.key, -1)}>−</button>
              <strong>{budget[system.key]}</strong>
              <button aria-label={`Increase ${system.title} power`} disabled={status !== 'active' || used >= DAILY_POWER} onClick={() => changePower(system.key, 1)}>+</button>
            </div>
          </div>
        ))}
      </div>
      <button type="button" className={`shield-toggle ${shelterPrepared ? 'enabled' : ''}`} disabled={status !== 'active' || (!shelterPrepared && used > 8)} onClick={toggleShelter}>
        <span className="shield-icon">⬡</span>
        <span><strong>{shelterPrepared ? 'Shelter prepared' : 'Prepare radiation shelter'}</strong><small>Costs 2 power units per sol</small></span>
        <span className="toggle-indicator"><span /></span>
      </button>
      <div className="budget-explainer">Unused allocations save power in the station battery. Critical systems still use 2 units of background power each sol.</div>
    </section>
  );
}

function App() {
  const state = useMissionStore();
  const { selectedRoom, day, totalDays, oxygen, battery, radiation, research, messages, status, report, history } = state;
  const room = ROOM_INFO[selectedRoom];
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand"><div className="brand-mark"><span className="orbit-ring" />✦</div><span>ORBITAL<span className="brand-sub"> / MISSION TRAINER</span></span></div>
        <div className="top-center"><span className="on-dot" /> ARES STATION<span className="separator">/</span> MARS HABITAT 01</div>
        <div className="header-right"><span className="demo-chip">INTERACTIVE PROTOTYPE</span><span className="header-version">V 0.1</span></div>
      </header>
      <div className="page-content">
        <div className="intro-bar">
          <div><div className="eyebrow"><span className="eyebrow-line" /> EXPEDITION 01 / THE RED FRONTIER</div><h1>Keep the crew alive<span className="period">.</span></h1><p>Five sols. One isolated Mars outpost. Every watt counts.</p></div>
          <div className="objective"><span className="objective-label">MISSION OBJECTIVE</span><strong>Survive 5 Martian sols</strong><small>Balance life support, research and radiation exposure.</small></div>
        </div>
        <div className="game-grid">
          <div className="primary-column">
            <div className="scene-frame">
              <div className="scene-topline"><span><span className="live-point" /> LIVE HABITAT FEED</span><span>CAM 01 — CUTAWAY</span></div>
              <ShipScene />
              <div className="scene-bottomline"><span><span className="crosshair">⌖</span> CLICK A ROOM TO INSPECT</span><span>6 SYSTEMS ONLINE <span className="accent-cyan">●</span></span></div>
            </div>
            <div className="below-grid">
              <section className="room-detail">
                <div className="detail-heading"><span className="detail-icon">▣</span><div><div className="tiny-label">SELECTED MODULE — {room.code}</div><h2>{room.name}</h2></div><div className="nominal">● ONLINE</div></div>
                <p>{room.description}</p><div className="fact-line"><span>⌁</span><span>{room.note}</span></div>
              </section>
              <section className={`event-card ${report.kind}`}>
                <div className="tiny-label">MISSION LOG / SOL {String(report.day).padStart(2, '0')}</div>
                <h3>{report.headline}</h3>
                <p>{report.explanation}</p>
                {history.length > 0 && <div className="effect-chips">{report.effects.map((effect) => <span key={effect}>{effect}</span>)}</div>}
              </section>
            </div>
            <footer className="bottom-note"><span>EDUCATIONAL SIMULATION</span><span>Values and events are illustrative game mechanics, not live NASA measurements.</span></footer>
          </div>
          <aside className="control-panel">
            <div className="panel-heading"><span>MISSION CONTROL</span><span className={`control-status ${status}`}>{status === 'active' ? '● OPERATIONAL' : status === 'won' ? '● COMPLETE' : '● MISSION LOST'}</span></div>
            <div className="sol-area"><div className="sol-indicator"><div><div className="tiny-label">CURRENT SOL</div><div className="sol-big">{String(day).padStart(2, '0')} <span>/ {String(totalDays).padStart(2, '0')}</span></div></div><div className="sol-planet">◐</div></div>
              <div className="day-progress">{Array.from({ length: totalDays }, (_, i) => <div key={i} className={`day-mark ${i < day ? 'filled' : ''}`}><span>{String(i + 1).padStart(2, '0')}</span></div>)}</div>
            </div>
            {day === 2 && <div className="storm-warning">⚠ SOLAR EVENT FORECAST FOR SOL 03</div>}
            {day === 3 && <div className="storm-warning danger-warning">⚠ SOLAR EVENT IN PROGRESS</div>}
            <div className="readouts"><div className="section-title"><span>STATION VITALS</span><span className="muted">LIVE</span></div>
              <Meter name="OXYGEN RESERVES" value={oxygen} unit="%" color="teal" warning={oxygen < 30}/>
              <Meter name="BATTERY CHARGE" value={battery} unit="%" color="blue" warning={battery < 30}/>
              <Meter name="RADIATION RISK" value={radiation} unit="/100" color="coral" warning={radiation >= 50}/>
              <div className="secondary-vitals"><div><span>RESEARCH</span><strong>{research}<small> PTS</small></strong></div><div><span>TRANSMISSIONS</span><strong>{messages}<small> SENT</small></strong></div></div>
            </div>
            <PowerControls />
            {status === 'active' ? <button className="advance-button" onClick={state.advanceSol}><span>ADVANCE TO NEXT SOL</span><span className="arrow-button">→</span></button> : <div className={`finish-card ${status}`}><strong>{status === 'won' ? 'MISSION SURVIVED' : 'MISSION FAILED'}</strong><span>{status === 'won' ? `Your crew survived all five sols and earned ${research} research points.` : 'Adjust your resource strategy and try again.'}</span></div>}
            <button className="reset-button" onClick={state.reset}>↻ &nbsp; RESTART MISSION</button>
          </aside>
        </div>
        <div className="credits"><span>ORBITAL / A JUNIOR ASTRONAUT TRAINER DEMO</span><span>React · TypeScript · PixiJS · Zustand</span></div>
      </div>
    </div>
  );
}

export default App;
