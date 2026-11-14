import { useReducer } from 'react'
import config from './data/config.json'
import mission from './data/missions/gannon-storm-2024.json'
import { createGameReducer, createInitialUiState } from './ui/gameReducer.js'
import { BriefingScreen } from './ui/BriefingScreen.jsx'
import { DayScreen } from './ui/DayScreen.jsx'
import { DebriefScreen } from './ui/DebriefScreen.jsx'
import { Scene } from './scene/Scene.jsx'
import './App.css'

const reducer = createGameReducer(config, mission)

// Derives the Scene's display-only props from the existing game/UI state. This is a read
// (field selection), not a rule computation — the Scene itself (src/scene) never sees the
// raw uiState shape, keeping it independent of §4 game rules (§8.2, C10 spirit).
export function deriveSceneState(uiState, config) {
  const idleScene = {
    isNight: false,
    lowAir: false,
    shieldValue: 0,
    shieldMax: config.allocationRanges.shield[1],
    lifeSupportValue: 0,
    lifeSupportMax: config.allocationRanges.lifeSupport[1],
    greenhouseValue: 0,
    greenhouseMax: config.allocationRanges.greenhouse[1],
    forecastLevel: 0,
    stormLevelMax: config.stormLevelRange[1],
    revealed: null,
  }

  if (uiState.screen !== 'day') return idleScene

  const { gameState, allocation, forecasts, awaitingAdvance, revealResult } = uiState
  const isNight = !config.powerBudget.sunlitDays.includes(gameState.day)
  const lowAir = gameState.meters.air <= config.meterMax * 0.3

  return {
    ...idleScene,
    isNight,
    lowAir,
    shieldValue: allocation.shield,
    lifeSupportValue: allocation.lifeSupport,
    greenhouseValue: allocation.greenhouse,
    forecastLevel: forecasts[gameState.day - 1] ?? 0,
    revealed: awaitingAdvance && revealResult ? revealResult : null,
  }
}

function App() {
  const [uiState, dispatch] = useReducer(reducer, undefined, createInitialUiState)
  const sceneState = deriveSceneState(uiState, config)

  if (uiState.screen === 'briefing') {
    return (
      <main>
        <Scene sceneState={sceneState} />
        <BriefingScreen config={config} onStart={() => dispatch({ type: 'START', seed: Date.now() })} />
      </main>
    )
  }

  if (uiState.screen === 'day') {
    return (
      <main>
        <Scene sceneState={sceneState} />
        <DayScreen config={config} uiState={uiState} dispatch={dispatch} />
      </main>
    )
  }

  return (
    <main>
      <Scene sceneState={sceneState} />
      <DebriefScreen
        config={config}
        debrief={uiState.debrief}
        onTryAgain={() => dispatch({ type: 'RESTART', seed: Date.now() })}
      />
    </main>
  )
}

export default App
