import { describe, it, expect } from 'vitest'
import config from '../src/data/config.json'

describe('project setup smoke test', () => {
  it('loads config.json with the mission length set', () => {
    expect(config.missionLengthDays).toBe(10)
  })
})
