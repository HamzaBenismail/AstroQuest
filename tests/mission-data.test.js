import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import config from '../src/data/config.json'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const MISSIONS_DIR = path.join(__dirname, '..', 'src', 'data', 'missions')

function loadMissions() {
  return readdirSync(MISSIONS_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(path.join(MISSIONS_DIR, f), 'utf-8')))
}

describe('mission data validation (rule test #9)', () => {
  const missions = loadMissions()

  it('finds at least one mission file', () => {
    expect(missions.length).toBeGreaterThan(0)
  })

  it.each(missions.map((m) => [m.missionId, m]))('%s has exactly missionLengthDays days', (_, mission) => {
    expect(mission.days).toHaveLength(config.missionLengthDays)
  })

  it.each(missions.map((m) => [m.missionId, m]))('%s has only valid storm levels (0-3)', (_, mission) => {
    for (const day of mission.days) {
      expect(day.stormLevel).toBeGreaterThanOrEqual(config.stormLevelRange[0])
      expect(day.stormLevel).toBeLessThanOrEqual(config.stormLevelRange[1])
    }
  })

  it.each(missions.map((m) => [m.missionId, m]))('%s has a sourceId on every event', (_, mission) => {
    for (const day of mission.days) {
      for (const event of day.events) {
        expect(event.sourceId).toBeTruthy()
      }
    }
  })

  it.each(missions.map((m) => [m.missionId, m]))('%s is labelled as archived NASA data', (_, mission) => {
    expect(mission.dataSource).toMatch(/archived/i)
  })
})
