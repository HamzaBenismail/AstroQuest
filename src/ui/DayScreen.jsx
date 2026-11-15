import { allocationPreview } from './session.js';
import Meters from './Meters.jsx';
import AllocationControls from './AllocationControls.jsx';
import TermHelp from './TermHelp.jsx';

export const STORM_LABELS = ['None', 'Minor', 'Moderate', 'Severe'];

export default function DayScreen({ config, session, onAllocate, onCommit, onRestart }) {
  const preview = allocationPreview(session.allocation, session.game.day, config);
  return (
    <div className="game-layout">
      <header className="topbar">
        <div>
          <p className="eyebrow">Mission control</p>
          <h1>Day {session.game.day} of {config.missionLengthDays}</h1>
        </div>
        <button className="secondary" type="button" onClick={onRestart}>Restart</button>
      </header>
      <Meters values={session.game.meters} config={config}/>
      <section className="forecast panel" aria-labelledby="forecast-title">
        <p className="eyebrow">Game forecast · Archived NASA data</p>
        <h2 id="forecast-title">Storm warning: {STORM_LABELS[session.forecast]}</h2>
        <p>The warning may be one level higher or lower.</p>
        <p className="note">This is a simplified game warning, not a real space-weather forecast.</p>
      </section>
      <AllocationControls config={config} allocation={session.allocation} preview={preview}
        onAllocate={onAllocate}/>
      <TermHelp/>
      {session.error && <p className="error" role="alert">{session.error}</p>}
      <div className="action-bar">
        <button className="primary" type="button" onClick={onCommit} disabled={!preview.ok}>
          Commit today's plan
        </button>
      </div>
    </div>
  );
}
