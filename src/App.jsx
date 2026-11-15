import { useMemo, useReducer, useState } from 'react';
import config from './data/config.json';
import { initialSession, reduceSession } from './ui/session.js';
import BriefingScreen from './ui/BriefingScreen.jsx';
import DayScreen from './ui/DayScreen.jsx';
import DayResult from './ui/DayResult.jsx';
import DebriefScreen from './ui/DebriefScreen.jsx';
import DataGate from './ui/DataGate.jsx';
import LunarScene from './scene/LunarScene.jsx';
import MissionExperience from './ui/v2/MissionExperience.jsx';
import MissionExperienceC from './ui/v3/MissionExperience.jsx';
import SourcesScreen from './ui/SourcesScreen.jsx';
import MissionPrep from './prep/MissionPrep.jsx';
import { IconInfo } from './ui/icons.jsx';
import './ui/science.css';

// Bundled at BUILD time. The browser never requests NASA data.
const missionFiles = import.meta.glob('./data/missions/*.json', { eager: true, import: 'default' });

export function missionGateStatus(config, missions) {
  if (config.stormMapping?.status !== 'approved') {
    return { issue: 'The team has not approved the storm-level mapping.' };
  }
  const mission = Object.values(missions)[0];
  if (!mission) return { issue: 'No approved, archived mission file has been generated.' };
  if (mission.dataSource !== 'NASA DONKI (archived data)' ||
      mission.site !== config.site || mission.days?.length !== config.missionLengthDays) {
    return { issue: 'Mission files do not match the approved Phase 2 format.' };
  }
  return { mission };
}

export function MissionApp({ config: gameConfig, mission }) {
  const [session, dispatch] = useReducer(
    (state, action) => reduceSession(state, action, gameConfig, mission),
    null,
    () => initialSession(gameConfig, mission),
  );
  if (session.screen === 'briefing') {
    return <main className="page"><BriefingScreen config={gameConfig} mission={mission}
      onStart={() => dispatch({ type: 'START' })}/></main>;
  }
  if (session.screen === 'planning' || session.screen === 'reveal') {
    const content = session.screen === 'planning'
      ? <DayScreen config={gameConfig} session={session}
          onAllocate={(consumer, delta) => dispatch({ type: 'ALLOCATE', consumer, delta })}
          onCommit={() => dispatch({ type: 'COMMIT' })}
          onRestart={() => dispatch({ type: 'RESTART' })}/>
      : <DayResult config={gameConfig} reveal={session.reveal}
          onContinue={() => dispatch({ type: 'CONTINUE' })}/>;
    return (
      <main className="page phase5-page">
        <div className="lunar-mission-shell">
          <LunarScene config={gameConfig} session={session}
            onSelectRoom={session.screen === 'planning' ? room => {
              document.getElementById(`allocation-${room}`)?.focus();
            } : undefined}/>
          <div className="phase5-ui-layer">{content}</div>
        </div>
      </main>
    );
  }
  return <main className="page"><DebriefScreen config={gameConfig} game={session.game}
    mission={mission} onRestart={() => dispatch({ type: 'RESTART' })}/></main>;
}

/**
 * Fold the player's cargo choices into the config the engine reads.
 *
 * The engine is untouched: it still takes its starting Air, Supplies and
 * battery charge from config, so loading the cargo bay is just a different
 * config. The prep screen hands out exactly the approved default total, so a
 * default load reproduces today's balance and no load can exceed it.
 */
export function applyPrep(config, prep) {
  if (!prep) return config;
  const c3 = config.reevaluation.c3;
  return {
    ...config,
    startingMeters: { ...config.startingMeters, air: prep.cargo.air, food: prep.cargo.supplies },
    reevaluation: {
      ...config.reevaluation,
      c3: { ...c3, battery: { ...c3.battery, initialCharge: prep.cargo.battery } },
    },
  };
}

export default function App() {
  const [showSources, setShowSources] = useState(false);
  const [prep, setPrep] = useState(null);
  const ready = missionGateStatus(config, missionFiles);
  const playConfig = useMemo(() => applyPrep(config, prep), [prep]);

  const v3 = prep
    ? <MissionExperienceC key={prep.startedAt} config={playConfig} mission={ready.mission} prep={prep}
        onReconfigure={() => setPrep(null)}/>
    : <MissionPrep config={config}
        onReady={choices => setPrep({ ...choices, startedAt: Date.now() })}/>;

  const game = ready.issue ? <DataGate issue={ready.issue}/>
    : config.reevaluation?.version === 3
      ? v3
    : config.reevaluation?.version === 2
      ? <MissionExperience config={config} mission={ready.mission}/>
      : <MissionApp config={config} mission={ready.mission}/>;
  return <>
    {game}
    {showSources
      ? <SourcesScreen onClose={() => setShowSources(false)}/>
      : <button className="sources-button" type="button" onClick={() => setShowSources(true)}
          title="Where our data comes from" aria-label="Where our data comes from">
          <IconInfo size={24}/>
        </button>}
  </>;
}
