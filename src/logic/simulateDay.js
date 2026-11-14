import { clamp } from './clamp.js'
import { validateAllocation } from './validateAllocation.js'

// §4.2 daily update, computed from the previous meter values, then clamped.
// `reason` on a failed status is either an array of meter names that hit <=0, or the
// string 'objectives-not-met' (day 10 completed without a meter failure, but the §4.1
// success bar — all meters >= successMinMeter — was not met; see CLAUDE.md §15).
export function simulateDay(state, allocation, mission, config) {
  if (state.status !== 'running') {
    throw new Error(`simulateDay called on a mission that is not running (status: ${state.status})`)
  }

  const check = validateAllocation(allocation, state.day, config)
  if (!check.ok) {
    throw new Error(`Invalid allocation for day ${state.day}: ${check.reason}`)
  }

  const missionDay = mission.days.find((d) => d.day === state.day)
  if (!missionDay) {
    throw new Error(`Mission has no data for day ${state.day}`)
  }
  const level = missionDay.stormLevel

  const { lifeSupport, shield, greenhouse, science } = allocation
  const meterMax = config.meterMax

  const air = clamp(state.meters.air + lifeSupport - config.airUse, 0, meterMax)
  const food = clamp(state.meters.food - config.foodUse + state.greenhouseYesterday, 0, meterMax)

  const stormDamage = config.stormDamage[String(level)]
  const rawDamage = Math.max(0, stormDamage - config.shieldProtection * shield) + (shield === 0 ? 1 : 0)
  const safetyRecovery = level === 0 && shield >= 1 ? 1 : 0
  const safety = clamp(state.meters.safety - rawDamage + safetyRecovery, 0, meterMax)

  const failedMeters = []
  if (air <= 0) failedMeters.push('air')
  if (food <= 0) failedMeters.push('food')
  if (safety <= 0) failedMeters.push('safety')

  let status = 'running'
  let reason = null

  if (failedMeters.length > 0) {
    status = 'failed'
    reason = failedMeters
  } else if (state.day === config.missionLengthDays) {
    const metSuccessBar =
      air >= config.successMinMeter &&
      food >= config.successMinMeter &&
      safety >= config.successMinMeter
    if (metSuccessBar) {
      status = 'succeeded'
    } else {
      status = 'failed'
      reason = 'objectives-not-met'
    }
  }

  const historyEntry = {
    day: state.day,
    allocation: { ...allocation },
    stormLevel: level,
    meters: { air, food, safety },
  }

  return {
    day: state.day + 1,
    meters: { air, food, safety },
    greenhouseYesterday: greenhouse,
    scienceTotal: state.scienceTotal + science,
    status,
    reason,
    missionId: state.missionId,
    history: [...state.history, historyEntry],
  }
}
