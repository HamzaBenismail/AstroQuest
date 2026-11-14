// Synthetic test fixtures ONLY — never used as shipped mission data. Real embedded
// missions live in src/data/missions/ (Phase 2, real DONKI data). These fixtures exist
// so Phase 3's rule tests can exercise the engine's generic behavior (including a
// reachable 'succeeded' path) independently of how severe any particular real mission
// window turns out to be.
export function createFixtureMission(stormLevels, missionId = 'fixture-test-mission') {
  return {
    missionId,
    title: 'Synthetic test fixture (not real NASA data)',
    site: 'moon',
    dataSource: 'synthetic test fixture — game units, not NASA data',
    window: { start: '2000-01-01', end: '2000-01-10' },
    days: stormLevels.map((level, i) => ({
      day: i + 1,
      date: `2000-01-${String(i + 1).padStart(2, '0')}`,
      stormLevel: level,
      events: [],
    })),
  }
}
