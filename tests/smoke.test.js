import { describe, it, expect } from 'vitest';
import config from '../src/data/config.json';

describe('Phase 1 configuration smoke test', () => {
  it('loads the config and sets the mission length to ten days', () => {
    expect(config.missionLengthDays).toBe(10);
  });
});
