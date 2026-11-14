import { describe, it, expect } from 'vitest'
import { deriveSceneState } from '../src/App.jsx'
import { gameReducer, createInitialUiState } from '../src/ui/gameReducer.js'
import config from '../src/data/config.json'
import realMission from '../src/data/missions/gannon-storm-2024.json'

const SEED = 7

describe('deriveSceneState (Phase 5 scene wiring)', () => {
  it('returns an idle, calm scene on the briefing screen', () => {
    const scene = deriveSceneState(createInitialUiState(), config)
    expect(scene.isNight).toBe(false)
    expect(scene.lowAir).toBe(false)
    expect(scene.shieldValue).toBe(0)
    expect(scene.revealed).toBeNull()
  })

  it('reflects the live draft allocation while planning a sunlit day', () => {
    let state = gameReducer(config, realMission, createInitialUiState(), { type: 'START', seed: SEED })
    state = gameReducer(config, realMission, state, { type: 'SET_ALLOCATION', key: 'shield', value: 2 })
    state = gameReducer(config, realMission, state, { type: 'SET_ALLOCATION', key: 'greenhouse', value: 3 })

    const scene = deriveSceneState(state, config)
    expect(scene.isNight).toBe(false) // day 1 is sunlit
    expect(scene.shieldValue).toBe(2)
    expect(scene.greenhouseValue).toBe(3)
    expect(scene.revealed).toBeNull()
  })

  it('flags night once the mission reaches a non-sunlit day', () => {
    let state = gameReducer(config, realMission, createInitialUiState(), { type: 'START', seed: SEED })
    // real days 1-4 are level [2,2,3,2] (gannon-storm-2024) — shield 3 (the config max) is
    // needed to survive day 3 (severe) without failing before reaching day 5.
    for (let i = 0; i < 4; i++) {
      state = gameReducer(config, realMission, state, { type: 'SET_ALLOCATION', key: 'lifeSupport', value: 4 })
      state = gameReducer(config, realMission, state, { type: 'SET_ALLOCATION', key: 'shield', value: 3 })
      state = gameReducer(config, realMission, state, { type: 'SET_ALLOCATION', key: 'greenhouse', value: 2 })
      state = gameReducer(config, realMission, state, { type: 'COMMIT' })
      expect(state.gameState.status).not.toBe('failed')
      state = gameReducer(config, realMission, state, { type: 'ADVANCE' })
    }
    expect(state.gameState.day).toBe(5) // first night day per config.powerBudget.sunlitDays
    const scene = deriveSceneState(state, config)
    expect(scene.isNight).toBe(true)
  })

  it('exposes the real revealed level and events during the post-commit reveal step', () => {
    let state = gameReducer(config, realMission, createInitialUiState(), { type: 'START', seed: SEED })
    state = gameReducer(config, realMission, state, { type: 'SET_ALLOCATION', key: 'lifeSupport', value: 3 })
    state = gameReducer(config, realMission, state, { type: 'SET_ALLOCATION', key: 'shield', value: 2 })
    state = gameReducer(config, realMission, state, { type: 'SET_ALLOCATION', key: 'greenhouse', value: 2 })
    state = gameReducer(config, realMission, state, { type: 'COMMIT' })

    const scene = deriveSceneState(state, config)
    expect(scene.revealed).not.toBeNull()
    expect(scene.revealed.level).toBe(realMission.days[0].stormLevel)
    expect(scene.revealed.events).toEqual(realMission.days[0].events)
    // allocation used for that day is still readable for the dome/plants visuals
    expect(scene.shieldValue).toBe(2)
    expect(scene.greenhouseValue).toBe(2)
  })

  it('flags low air once the air meter drops to 30% of meterMax or below', () => {
    let state = gameReducer(config, realMission, createInitialUiState(), { type: 'START', seed: SEED })
    // starve air deliberately (lifeSupport 0) to cross the low-air threshold quickly
    state = gameReducer(config, realMission, state, { type: 'SET_ALLOCATION', key: 'lifeSupport', value: 0 })
    state = gameReducer(config, realMission, state, { type: 'SET_ALLOCATION', key: 'greenhouse', value: 2 })
    state = gameReducer(config, realMission, state, { type: 'COMMIT' })
    state = gameReducer(config, realMission, state, { type: 'ADVANCE' })

    expect(state.gameState.meters.air).toBeLessThanOrEqual(config.meterMax * 0.3)
    const scene = deriveSceneState(state, config)
    expect(scene.lowAir).toBe(true)
  })
})
