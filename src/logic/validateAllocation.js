import { getDayBudget } from './budget.js'

const CONSUMERS = ['lifeSupport', 'shield', 'greenhouse', 'science']

// §4.1 allocation rule: each consumer within its config range, and the sum must not
// exceed the day's power budget.
export function validateAllocation(allocation, day, config) {
  for (const key of CONSUMERS) {
    const [min, max] = config.allocationRanges[key]
    const value = allocation[key]
    if (typeof value !== 'number' || value < min || value > max) {
      return { ok: false, reason: `${key}-out-of-range` }
    }
  }

  const total = CONSUMERS.reduce((sum, key) => sum + allocation[key], 0)
  const budget = getDayBudget(day, config)
  if (total > budget) {
    return { ok: false, reason: 'budget-exceeded' }
  }

  return { ok: true, reason: null }
}
