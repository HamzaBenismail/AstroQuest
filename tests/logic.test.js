import { describe, it, expect } from 'vitest'
import {
  createInitialState,
  validateAllocation,
  makeForecast,
  simulateDay,
  scoreMission,
  createSeededRng,
} from '../src/logic/index.js'
import config from '../src/data/config.json'
import { createFixtureMission } from './helpers/fixtures.js'

// Required rule tests, §12. Numbered to match the spec exactly.
// Test #9 (mission-data validation) lives in tests/mission-data.test.js (Phase 2).

describe('rule test #1: allocation budget rejection', () => {
  it('rejects an allocation whose sum exceeds the day budget', () => {
    // day 1 is sunlit, budget 10 (config.powerBudget.sunlit)
    const result = validateAllocation({ lifeSupport: 4, shield: 3, greenhouse: 3, science: 1 }, 1, config)
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('budget-exceeded')
  })

  it('accepts an allocation exactly at the day budget', () => {
    const result = validateAllocation({ lifeSupport: 4, shield: 3, greenhouse: 3, science: 0 }, 1, config)
    expect(result.ok).toBe(true)
  })

  it('rejects an allocation whose sum exceeds the lower night budget', () => {
    // day 5 is a night day, budget 7 (config.powerBudget.night)
    const result = validateAllocation({ lifeSupport: 4, shield: 3, greenhouse: 1, science: 0 }, 5, config)
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('budget-exceeded')
  })
})

describe('rule test #2: air formula', () => {
  it('computes air = air + lifeSupport - AIR_USE, clamped to 0..meterMax', () => {
    const mission = createFixtureMission([0, 0, 0, 0, 0, 0, 0, 0, 0, 0])
    let state = createInitialState(config, mission)
    const startingAir = state.meters.air
    const lifeSupport = 2
    const nextState = simulateDay(
      state,
      { lifeSupport, shield: 0, greenhouse: 0, science: 0 },
      mission,
      config,
    )
    const expectedAir = Math.min(config.meterMax, Math.max(0, startingAir + lifeSupport - config.airUse))
    expect(nextState.meters.air).toBe(expectedAir)
  })

  it('clamps air at meterMax when life support pushes it over the top', () => {
    const mission = createFixtureMission([0, 0, 0, 0, 0, 0, 0, 0, 0, 0])
    let state = createInitialState(config, mission)
    // drive air to the ceiling over a few days with max life support
    for (let i = 0; i < 5 && state.status === 'running'; i++) {
      state = simulateDay(state, { lifeSupport: 4, shield: 0, greenhouse: 2, science: 0 }, mission, config)
    }
    expect(state.meters.air).toBeLessThanOrEqual(config.meterMax)
  })
})

describe('rule test #3: food formula', () => {
  it('day 1 uses config.initialGreenhouseYesterday for the food update', () => {
    const mission = createFixtureMission([0, 0, 0, 0, 0, 0, 0, 0, 0, 0])
    const state = createInitialState(config, mission)
    expect(state.greenhouseYesterday).toBe(config.initialGreenhouseYesterday)

    const startingFood = state.meters.food
    const next = simulateDay(state, { lifeSupport: 3, shield: 0, greenhouse: 2, science: 0 }, mission, config)
    const expectedFood = Math.min(
      config.meterMax,
      Math.max(0, startingFood - config.foodUse + config.initialGreenhouseYesterday),
    )
    expect(next.meters.food).toBe(expectedFood)
  })

  it("day 2's food update uses day 1's greenhouse allocation, not day 2's", () => {
    const mission = createFixtureMission([0, 0, 0, 0, 0, 0, 0, 0, 0, 0])
    const state1 = createInitialState(config, mission)
    const day1Greenhouse = 3
    const state2 = simulateDay(
      state1,
      { lifeSupport: 3, shield: 0, greenhouse: day1Greenhouse, science: 0 },
      mission,
      config,
    )
    expect(state2.greenhouseYesterday).toBe(day1Greenhouse)

    const day2GreenhouseAllocation = 0 // deliberately different from day 1's, to prove it isn't used yet
    const state3 = simulateDay(
      state2,
      { lifeSupport: 3, shield: 0, greenhouse: day2GreenhouseAllocation, science: 0 },
      mission,
      config,
    )
    const expectedFood = Math.min(
      config.meterMax,
      Math.max(0, state2.meters.food - config.foodUse + day1Greenhouse),
    )
    expect(state3.meters.food).toBe(expectedFood)
  })
})

describe('rule test #4: damage examples', () => {
  function damageFor(level, shield) {
    const mission = createFixtureMission([level, 0, 0, 0, 0, 0, 0, 0, 0, 0])
    const state = createInitialState(config, mission)
    const startingSafety = state.meters.safety
    const next = simulateDay(state, { lifeSupport: 3, shield, greenhouse: 2, science: 0 }, mission, config)
    return { startingSafety, resultingSafety: next.meters.safety }
  }

  it('severe (level 3) with shield 3 -> damage 1', () => {
    const { startingSafety, resultingSafety } = damageFor(3, 3)
    expect(startingSafety - resultingSafety).toBe(1)
  })

  it('severe (level 3) with shield 0 -> damage 8', () => {
    const { startingSafety, resultingSafety } = damageFor(3, 0)
    expect(startingSafety - resultingSafety).toBe(8)
  })

  it('calm (level 0) with shield 0 -> damage 1', () => {
    const { startingSafety, resultingSafety } = damageFor(0, 0)
    expect(startingSafety - resultingSafety).toBe(1)
  })

  it('calm (level 0) with shield >= 1 -> +1 safety recovery, capped at meterMax', () => {
    const { startingSafety, resultingSafety } = damageFor(0, 1)
    expect(resultingSafety).toBe(Math.min(config.meterMax, startingSafety + 1))
  })
})

describe('rule test #5: failure on any meter <= 0', () => {
  it('fails with reason naming air when air is starved to zero', () => {
    const mission = createFixtureMission([0, 0, 0, 0, 0, 0, 0, 0, 0, 0])
    let state = createInitialState(config, mission)
    // starve air: lifeSupport 0 every day, airUse 3/day, starting air 5 -> fails within 2 days
    while (state.status === 'running') {
      state = simulateDay(state, { lifeSupport: 0, shield: 0, greenhouse: 2, science: 0 }, mission, config)
    }
    expect(state.status).toBe('failed')
    expect(state.reason).toContain('air')
  })

  it('fails with reason naming safety when unshielded against severe storms', () => {
    const mission = createFixtureMission([3, 3, 3, 3, 3, 3, 3, 3, 3, 3])
    let state = createInitialState(config, mission)
    while (state.status === 'running') {
      state = simulateDay(state, { lifeSupport: 3, shield: 0, greenhouse: 2, science: 0 }, mission, config)
    }
    expect(state.status).toBe('failed')
    expect(state.reason).toContain('safety')
  })
})

describe('rule test #6: success condition', () => {
  it('succeeds only when day 10 completes with all meters >= successMinMeter', () => {
    // All-calm synthetic fixture: shield>=1 on a calm day recovers safety each day (§4.2),
    // so a steady, generous strategy should comfortably clear the bar by day 10.
    const mission = createFixtureMission([0, 0, 0, 0, 0, 0, 0, 0, 0, 0])
    let state = createInitialState(config, mission)
    while (state.status === 'running') {
      const budget = state.day <= 4 ? config.powerBudget.sunlit : config.powerBudget.night
      const lifeSupport = Math.min(config.allocationRanges.lifeSupport[1], budget - 1 - 2)
      state = simulateDay(state, { lifeSupport, shield: 1, greenhouse: 2, science: 0 }, mission, config)
    }
    expect(state.status).toBe('succeeded')
    expect(state.meters.air).toBeGreaterThanOrEqual(config.successMinMeter)
    expect(state.meters.food).toBeGreaterThanOrEqual(config.successMinMeter)
    expect(state.meters.safety).toBeGreaterThanOrEqual(config.successMinMeter)
  })

  it("does not succeed on day 10 if no meter hit 0 but one meter stayed below the success bar (status: 'failed', reason: 'objectives-not-met')", () => {
    // Days 1-9 calm (level 0), day 10 severe (level 3). Shield 1 on the calm days means
    // zero damage AND the +1 recovery bonus (§4.2: level==0 && shield>=1), so safety
    // climbs to and stays at the meterMax (10) through day 9 without ever dropping.
    // On day 10, dropping shield to 0 against a severe (level 3) storm deals damage
    // stormDamage[3] (7) + 1 (the shield==0 penalty) = 8, landing safety at 10-8=2 —
    // below successMinMeter (3) but still > 0, so it is NOT an immediate <=0 failure.
    const mission = createFixtureMission([0, 0, 0, 0, 0, 0, 0, 0, 0, 3])
    let state = createInitialState(config, mission)

    for (let day = 1; day <= 9; day++) {
      state = simulateDay(state, { lifeSupport: 4, shield: 1, greenhouse: 2, science: 0 }, mission, config)
      expect(state.status).toBe('running')
    }
    expect(state.meters.safety).toBe(config.meterMax)

    state = simulateDay(state, { lifeSupport: 4, shield: 0, greenhouse: 2, science: 0 }, mission, config)

    expect(state.status).toBe('failed')
    expect(state.reason).toBe('objectives-not-met')
    expect(state.meters.safety).toBeGreaterThan(0)
    expect(state.meters.safety).toBeLessThan(config.successMinMeter)
    // air and food both comfortably cleared the bar — only safety missed it
    expect(state.meters.air).toBeGreaterThanOrEqual(config.successMinMeter)
    expect(state.meters.food).toBeGreaterThanOrEqual(config.successMinMeter)
  })
})

describe('rule test #7: seeded forecast determinism and bounds', () => {
  const mission = createFixtureMission([2, 2, 3, 2, 3, 3, 2, 3, 3, 3])

  it('the same seed produces the same forecast sequence', () => {
    const rngA = createSeededRng(123)
    const rngB = createSeededRng(123)
    const seqA = mission.days.map((d) => makeForecast(d.day, mission, rngA, config))
    const seqB = mission.days.map((d) => makeForecast(d.day, mission, rngB, config))
    expect(seqA).toEqual(seqB)
  })

  it('every forecast stays within the valid range and within 1 of the real level', () => {
    for (let seed = 0; seed < 50; seed++) {
      const rng = createSeededRng(seed)
      for (const d of mission.days) {
        const forecast = makeForecast(d.day, mission, rng, config)
        expect(forecast).toBeGreaterThanOrEqual(config.stormLevelRange[0])
        expect(forecast).toBeLessThanOrEqual(config.stormLevelRange[1])
        expect(Math.abs(forecast - d.stormLevel)).toBeLessThanOrEqual(1)
      }
    }
  })
})

describe('rule test #8: nothing is hardcoded — changing config changes outcomes', () => {
  it('changing airUse changes the resulting air value', () => {
    const mission = createFixtureMission([0, 0, 0, 0, 0, 0, 0, 0, 0, 0])
    const state = createInitialState(config, mission)
    const allocation = { lifeSupport: 2, shield: 0, greenhouse: 2, science: 0 }

    const resultWithDefaultConfig = simulateDay(state, allocation, mission, config)

    const higherAirUseConfig = { ...config, airUse: config.airUse + 2 }
    const resultWithChangedConfig = simulateDay(state, allocation, mission, higherAirUseConfig)

    expect(resultWithChangedConfig.meters.air).not.toBe(resultWithDefaultConfig.meters.air)
    expect(resultWithChangedConfig.meters.air).toBe(resultWithDefaultConfig.meters.air - 2)
  })

  it('changing shieldProtection changes the resulting safety value', () => {
    const mission = createFixtureMission([3, 0, 0, 0, 0, 0, 0, 0, 0, 0])
    const state = createInitialState(config, mission)
    const allocation = { lifeSupport: 2, shield: 2, greenhouse: 2, science: 0 }

    const resultWithDefaultConfig = simulateDay(state, allocation, mission, config)

    const strongerShieldConfig = { ...config, shieldProtection: config.shieldProtection + 1 }
    const resultWithChangedConfig = simulateDay(state, allocation, mission, strongerShieldConfig)

    expect(resultWithChangedConfig.meters.safety).not.toBe(resultWithDefaultConfig.meters.safety)
  })
})

describe('score tracking', () => {
  it('accumulates the sum of science allocations over the mission', () => {
    const mission = createFixtureMission([0, 0, 0, 0, 0, 0, 0, 0, 0, 0])
    let state = createInitialState(config, mission)
    const scienceEachDay = 1
    // shield 1 on these calm days keeps safety recovering (§4.2) rather than draining,
    // so the mission reaches day 10 without an unrelated meter failure interrupting it.
    for (let i = 0; i < 10; i++) {
      state = simulateDay(
        state,
        { lifeSupport: 3, shield: 1, greenhouse: 2, science: scienceEachDay },
        mission,
        config,
      )
      expect(state.status).not.toBe('failed')
    }
    expect(scoreMission(state)).toBe(scienceEachDay * 10)
  })
})
