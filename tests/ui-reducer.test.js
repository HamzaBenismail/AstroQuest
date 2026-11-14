import { describe, it, expect } from 'vitest'
import { gameReducer, createInitialUiState } from '../src/ui/gameReducer.js'
import config from '../src/data/config.json'
import realMission from '../src/data/missions/gannon-storm-2024.json'
import { createFixtureMission } from './helpers/fixtures.js'

const SEED = 42

function reduce(config, mission, state, action) {
  return gameReducer(config, mission, state, action)
}

describe('F2: allocation cap', () => {
  it('clamps SET_ALLOCATION to the config range for that consumer', () => {
    let state = reduce(config, realMission, createInitialUiState(), { type: 'START', seed: SEED })
    state = reduce(config, realMission, state, { type: 'SET_ALLOCATION', key: 'shield', value: 99 })
    expect(state.allocation.shield).toBe(config.allocationRanges.shield[1])

    state = reduce(config, realMission, state, { type: 'SET_ALLOCATION', key: 'shield', value: -5 })
    expect(state.allocation.shield).toBe(config.allocationRanges.shield[0])
  })

  it('refuses to COMMIT an allocation that exceeds the day budget, even if dispatched directly', () => {
    let state = reduce(config, realMission, createInitialUiState(), { type: 'START', seed: SEED })
    // day 1 is sunlit, budget 10 — this totals 11
    state = reduce(config, realMission, state, { type: 'SET_ALLOCATION', key: 'lifeSupport', value: 4 })
    state = reduce(config, realMission, state, { type: 'SET_ALLOCATION', key: 'shield', value: 3 })
    state = reduce(config, realMission, state, { type: 'SET_ALLOCATION', key: 'greenhouse', value: 3 })
    state = reduce(config, realMission, state, { type: 'SET_ALLOCATION', key: 'science', value: 1 })
    const total =
      state.allocation.lifeSupport + state.allocation.shield + state.allocation.greenhouse + state.allocation.science
    expect(total).toBe(11) // over the day-1 budget of 10

    const beforeCommit = state
    state = reduce(config, realMission, state, { type: 'COMMIT' })
    expect(state).toBe(beforeCommit) // COMMIT was a no-op — the day did not advance
  })

  it('accepts a COMMIT exactly at the day budget', () => {
    let state = reduce(config, realMission, createInitialUiState(), { type: 'START', seed: SEED })
    state = reduce(config, realMission, state, { type: 'SET_ALLOCATION', key: 'lifeSupport', value: 4 })
    state = reduce(config, realMission, state, { type: 'SET_ALLOCATION', key: 'shield', value: 3 })
    state = reduce(config, realMission, state, { type: 'SET_ALLOCATION', key: 'greenhouse', value: 3 })
    state = reduce(config, realMission, state, { type: 'SET_ALLOCATION', key: 'science', value: 0 })
    state = reduce(config, realMission, state, { type: 'COMMIT' })
    expect(state.awaitingAdvance).toBe(true)
    expect(state.gameState.day).toBe(2)
  })
})

describe('F3: day loop advancing', () => {
  it('ADVANCE moves to the next day with a reset allocation while the mission is running', () => {
    let state = reduce(config, realMission, createInitialUiState(), { type: 'START', seed: SEED })
    state = reduce(config, realMission, state, { type: 'SET_ALLOCATION', key: 'lifeSupport', value: 3 })
    state = reduce(config, realMission, state, { type: 'SET_ALLOCATION', key: 'shield', value: 3 })
    state = reduce(config, realMission, state, { type: 'SET_ALLOCATION', key: 'greenhouse', value: 2 })
    state = reduce(config, realMission, state, { type: 'COMMIT' })
    expect(state.awaitingAdvance).toBe(true)

    state = reduce(config, realMission, state, { type: 'ADVANCE' })
    expect(state.awaitingAdvance).toBe(false)
    expect(state.screen).toBe('day')
    expect(state.allocation).toEqual({ lifeSupport: 0, shield: 0, greenhouse: 0, science: 0 })
  })

  it('reaches the debrief screen via a failed outcome on the real mission data', () => {
    let state = reduce(config, realMission, createInitialUiState(), { type: 'START', seed: SEED })
    // Neglect the shield against real storms — loss should be reachable.
    while (state.screen === 'day') {
      state = reduce(config, realMission, state, { type: 'SET_ALLOCATION', key: 'lifeSupport', value: 3 })
      state = reduce(config, realMission, state, { type: 'SET_ALLOCATION', key: 'shield', value: 0 })
      state = reduce(config, realMission, state, { type: 'SET_ALLOCATION', key: 'greenhouse', value: 2 })
      state = reduce(config, realMission, state, { type: 'SET_ALLOCATION', key: 'science', value: 1 })
      state = reduce(config, realMission, state, { type: 'COMMIT' })
      state = reduce(config, realMission, state, { type: 'ADVANCE' })
    }
    expect(state.screen).toBe('debrief')
    expect(state.debrief.status).toBe('failed')
  })

  it('reaches the debrief screen via a succeeded outcome on a synthetic calm fixture', () => {
    const calmFixture = createFixtureMission([0, 0, 0, 0, 0, 0, 0, 0, 0, 0])
    let state = reduce(config, calmFixture, createInitialUiState(), { type: 'START', seed: SEED })
    while (state.screen === 'day') {
      const day = state.gameState.day
      const budget = day <= 4 ? config.powerBudget.sunlit : config.powerBudget.night
      const lifeSupport = Math.min(4, budget - 1 - 2)
      state = reduce(config, calmFixture, state, { type: 'SET_ALLOCATION', key: 'lifeSupport', value: lifeSupport })
      state = reduce(config, calmFixture, state, { type: 'SET_ALLOCATION', key: 'shield', value: 1 })
      state = reduce(config, calmFixture, state, { type: 'SET_ALLOCATION', key: 'greenhouse', value: 2 })
      state = reduce(config, calmFixture, state, { type: 'COMMIT' })
      state = reduce(config, calmFixture, state, { type: 'ADVANCE' })
    }
    expect(state.screen).toBe('debrief')
    expect(state.debrief.status).toBe('succeeded')
  })
})

describe('RESTART', () => {
  it('returns to a clean day-1 state after playing partway through', () => {
    let state = reduce(config, realMission, createInitialUiState(), { type: 'START', seed: SEED })
    state = reduce(config, realMission, state, { type: 'SET_ALLOCATION', key: 'lifeSupport', value: 3 })
    state = reduce(config, realMission, state, { type: 'SET_ALLOCATION', key: 'shield', value: 3 })
    state = reduce(config, realMission, state, { type: 'SET_ALLOCATION', key: 'greenhouse', value: 2 })
    state = reduce(config, realMission, state, { type: 'COMMIT' })
    state = reduce(config, realMission, state, { type: 'ADVANCE' })
    expect(state.gameState.day).toBe(2)

    state = reduce(config, realMission, state, { type: 'RESTART', seed: SEED + 1 })
    expect(state.screen).toBe('day')
    expect(state.gameState.day).toBe(1)
    expect(state.allocation).toEqual({ lifeSupport: 0, shield: 0, greenhouse: 0, science: 0 })
  })
})
