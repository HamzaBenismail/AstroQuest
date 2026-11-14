import { scoreMission } from './scoreMission.js'

// Structured result for the Phase 4 debrief screen (F7). This returns data only —
// turning `reason` into gentle, kid-friendly copy (§7.4) is a UI concern, not logic's.
export function buildDebrief(state, mission) {
  return {
    status: state.status,
    reason: state.reason,
    daysCompleted: state.day - 1,
    meters: state.meters,
    score: scoreMission(state),
    missionId: state.missionId,
    missionTitle: mission.title,
    history: state.history,
  }
}
