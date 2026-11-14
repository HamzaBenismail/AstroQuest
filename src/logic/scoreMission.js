// §4.1: Score = sum of Science allocations over the mission, already accumulated in state.
export function scoreMission(state) {
  return state.scienceTotal
}
