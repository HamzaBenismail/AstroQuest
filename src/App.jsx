import { useReducer } from 'react'
import config from './data/config.json'
import mission from './data/missions/gannon-storm-2024.json'
import { createGameReducer, createInitialUiState } from './ui/gameReducer.js'
import { BriefingScreen } from './ui/BriefingScreen.jsx'
import { DayScreen } from './ui/DayScreen.jsx'
import { DebriefScreen } from './ui/DebriefScreen.jsx'
import './App.css'

const reducer = createGameReducer(config, mission)

function App() {
  const [uiState, dispatch] = useReducer(reducer, undefined, createInitialUiState)

  if (uiState.screen === 'briefing') {
    return (
      <main>
        <BriefingScreen config={config} onStart={() => dispatch({ type: 'START', seed: Date.now() })} />
      </main>
    )
  }

  if (uiState.screen === 'day') {
    return (
      <main>
        <DayScreen config={config} uiState={uiState} dispatch={dispatch} />
      </main>
    )
  }

  return (
    <main>
      <DebriefScreen
        config={config}
        debrief={uiState.debrief}
        onTryAgain={() => dispatch({ type: 'RESTART', seed: Date.now() })}
      />
    </main>
  )
}

export default App
