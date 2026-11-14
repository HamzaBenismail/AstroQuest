import { clamp } from './clamp.js'

// §4.1/§C5: forecast = real level ± an entry from forecastErrorTable, clamped to the
// valid storm-level range. rng is injected so the sequence is reproducible from a seed.
export function makeForecast(day, mission, rng, config) {
  const missionDay = mission.days.find((d) => d.day === day)
  const realLevel = missionDay.stormLevel

  const table = config.forecastErrorTable
  const index = Math.floor(rng() * table.length)
  const error = table[index]

  const [min, max] = config.stormLevelRange
  return clamp(realLevel + error, min, max)
}
