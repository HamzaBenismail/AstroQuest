import {
  createInitialState,
  validateAllocation,
  makeForecast,
  simulateDay,
  buildDebrief,
  createSeededRng,
  clamp,
} from '../logic/index.js'

function createEmptyAllocation() {
  return { lifeSupport: 0, shield: 0, greenhouse: 0, science: 0 }
}

export function createInitialUiState() {
  return {
    screen: 'briefing', // 'briefing' | 'day' | 'debrief'
    gameState: null,
    forecasts: [],
    allocation: createEmptyAllocation(),
    awaitingAdvance: false,
    revealResult: null,
    debrief: null,
  }
}

// Builds a fresh playthrough. `seed` is injected by the caller (the UI layer may use
// Date.now() for variety between sessions — that's fine outside src/logic, which must
// stay pure; here we just thread a seed through to the pure, seeded RNG).
function startMission(config, mission, seed) {
  const rng = createSeededRng(seed)
  const gameState = createInitialState(config, mission)
  const forecasts = mission.days.map((d) => makeForecast(d.day, mission, rng, config))
  return {
    screen: 'day',
    gameState,
    forecasts,
    allocation: createEmptyAllocation(),
    awaitingAdvance: false,
    revealResult: null,
    debrief: null,
  }
}

// `config` and `mission` are closed over by the caller via a bound reducer (see
// createGameReducer below), so this stays a plain, easily testable reducer function.
export function gameReducer(config, mission, state, action) {
  switch (action.type) {
    case 'START':
      return startMission(config, mission, action.seed)

    case 'SET_ALLOCATION': {
      const [min, max] = config.allocationRanges[action.key]
      const value = clamp(action.value, min, max)
      return { ...state, allocation: { ...state.allocation, [action.key]: value } }
    }

    case 'COMMIT': {
      const day = state.gameState.day
      const check = validateAllocation(state.allocation, day, config)
      if (!check.ok) return state // defense in depth; the commit button is disabled already

      const missionDay = mission.days.find((d) => d.day === day)
      const previousMeters = state.gameState.meters
      const nextGameState = simulateDay(state.gameState, state.allocation, mission, config)

      return {
        ...state,
        gameState: nextGameState,
        awaitingAdvance: true,
        revealResult: {
          day,
          level: missionDay.stormLevel,
          events: missionDay.events,
          previousMeters,
          meters: nextGameState.meters,
          status: nextGameState.status,
        },
      }
    }

    case 'ADVANCE': {
      if (state.gameState.status !== 'running') {
        return {
          ...state,
          screen: 'debrief',
          debrief: buildDebrief(state.gameState, mission),
          awaitingAdvance: false,
          revealResult: null,
        }
      }
      return {
        ...state,
        awaitingAdvance: false,
        revealResult: null,
        allocation: createEmptyAllocation(),
      }
    }

    case 'RESTART':
      return startMission(config, mission, action.seed)

    default:
      return state
  }
}

export function createGameReducer(config, mission) {
  return (state, action) => gameReducer(config, mission, state, action)
}
