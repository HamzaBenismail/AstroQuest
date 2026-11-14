// §4.1 setup defaults, all read from config — nothing hardcoded (C9).
export function createInitialState(config, mission) {
  return {
    day: 1,
    meters: {
      air: config.startingMeters.air,
      food: config.startingMeters.food,
      safety: config.startingMeters.safety,
    },
    greenhouseYesterday: config.initialGreenhouseYesterday,
    scienceTotal: 0,
    status: 'running',
    reason: null,
    missionId: mission.missionId,
    history: [],
  }
}
