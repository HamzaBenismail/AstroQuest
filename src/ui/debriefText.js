const METER_NAMES = {
  air: 'air',
  food: 'food',
  safety: 'crew safety',
}

const METER_ADVICE = {
  air: 'Try giving life support more power.',
  food: 'Try giving the greenhouse more power earlier in the mission.',
  safety: 'Try giving the shield more power on stormy days.',
}

// Gentle, instructive copy for the debrief (F7, §7.4) — never scary or graphic.
export function describeOutcome(debrief, config) {
  const totalDays = config.missionLengthDays

  if (debrief.status === 'succeeded') {
    return {
      title: 'Mission Complete!',
      message: `The crew made it through all ${totalDays} days safe and sound. Great work, Commander.`,
    }
  }

  if (debrief.reason === 'objectives-not-met') {
    return {
      title: 'Mission Ended',
      message: `The crew survived all ${totalDays} days, but they were not safe enough at the end. Try balancing power more evenly next time.`,
    }
  }

  const meters = Array.isArray(debrief.reason) ? debrief.reason : []
  const names = meters.map((m) => METER_NAMES[m] ?? m).join(' and ')
  const advice = meters.map((m) => METER_ADVICE[m]).filter(Boolean).join(' ')

  return {
    title: 'Mission Ended',
    message: `The crew ran out of ${names} on day ${debrief.daysCompleted}. ${advice}`,
  }
}
