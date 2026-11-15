import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import config from '../src/data/config.json';
import { buildMission, normalizeDonkiEvent, validateMission, missionDates } from '../scripts/donki-utils.js';

const proposal = config.stormMapping;

const syntheticRecords = {
  // TEST-ONLY values. These are invented fixtures, never NASA observations or game assets.
  FLR: [{ flrID: 'SYNTHETIC-FLR-1', beginTime: '2024-05-08T10:00Z', classType: 'M2.3' }],
  SEP: [{ sepID: 'SYNTHETIC-SEP-1', eventTime: '2024-05-09T11:00Z' }],
  CME: [{ activityID: 'SYNTHETIC-CME-1', startTime: '2024-05-09T12:00Z' }],
  GST: [{ gstID: 'SYNTHETIC-GST-1', startTime: '2024-05-10T13:00Z' }],
};

function draftMission() {
  return buildMission({
    datasets: syntheticRecords,
    dates: missionDates('2024-05-08', config.missionLengthDays),
    config, mapping: proposal,
    missionId: 'synthetic-test-only', title: 'Synthetic fixture',
  });
}

describe('F4: mission JSON schema / deterministic mapper', () => {
  it('normalizes a synthetic flare using fields present in the DONKI schema', () => {
    expect(normalizeDonkiEvent('FLR', syntheticRecords.FLR[0], proposal)).toEqual({
      date: '2024-05-08',
      level: 2,
      event: { type: 'FLR', label: 'Solar flare, class M2.3', sourceId: 'SYNTHETIC-FLR-1' },
    });
  });

  it('rejects unexpected raw schemas instead of guessing IDs or class', () => {
    expect(() => normalizeDonkiEvent('FLR', { beginTime: '2024-05-08T10:00Z', classType: 'M2.3' }, proposal)).toThrow(/flrID/);
    expect(() => normalizeDonkiEvent('FLR', { flrID: 'id', beginTime: '2024-05-08T10:00Z', classType: 'unverified' }, proposal)).toThrow(/classType/);
  });

  it('creates consecutive days, correct mapped levels and traceable labels', () => {
    const mission = draftMission();
    expect(validateMission(mission, config)).toBe(true);
    expect(mission.days).toHaveLength(config.missionLengthDays);
    expect(mission.days[0].stormLevel).toBe(2);
    expect(mission.days[1].stormLevel).toBe(3);
    expect(mission.days[2].stormLevel).toBe(0);
    expect(mission.days[0].events[0].sourceId).toBe('SYNTHETIC-FLR-1');
    expect(mission.days[0].date).toBe('2024-05-08');
    expect(mission.days[9].date).toBe('2024-05-17');
  });

  it('rejects missing IDs, wrong count, invalid levels or mismatched dates', () => {
    const invalid = draftMission();
    invalid.days[0].events[0].sourceId = '';
    expect(() => validateMission(invalid, config)).toThrow(/sourceId/);
    invalid.days[0].events[0].sourceId = 'SYNTHETIC-FLR-1';
    invalid.days[0].stormLevel = 5;
    expect(() => validateMission(invalid, config)).toThrow(/stormLevel/);
    invalid.days[0].stormLevel = 2;
    invalid.days[1].date = '2024-05-15';
    expect(() => validateMission(invalid, config)).toThrow(/date/);
    invalid.days.splice(0, 1);
    expect(() => validateMission(invalid, config)).toThrow(/exactly/);
  });
});

describe('F4: Phase 2 real mission exit gate (must pass before Phase 3)', () => {
  const dir = new URL('../src/data/missions/', import.meta.url);
  const names = readdirSync(dir).filter(name => name.endsWith('.json'));
  it('contains at least one approved, archived NASA mission', () => {
    expect(config.stormMapping.status).toBe('approved');
    expect(names.length).toBeGreaterThanOrEqual(1);
  });
  for (const file of names) {
    it(`validates ${file}`, () => {
      const mission = JSON.parse(readFileSync(new URL(file, dir), 'utf8'));
      expect(validateMission(mission, config)).toBe(true);
      expect(mission.days.some(day => day.stormLevel > 0)).toBe(true);
      expect(mission.days.every(day => day.events.every(event => event.sourceId.length > 0))).toBe(true);
    });
  }
});
