import { describe, it, expect } from 'vitest';
import { applyPrep } from '../src/App.jsx';
import { cargoLimits } from '../src/prep/MissionPrep.jsx';
import { createC3State, requireC3, c3BatteryCapacity } from '../src/logic/v3/engine.js';
import original from '../src/data/config.json';

const mission = {
  missionId: 'PREP-TEST',
  site: 'moon',
  dataSource: 'TEST ONLY',
  days: Array.from({ length: original.missionLengthDays }, (_, i) => ({
    day: i + 1, date: `synthetic-${i}`, stormLevel: 1, events: [],
  })),
};

const prep = cargo => ({ shipId: 'titan', destination: 'moon', cargo, assignments: {} });

describe('mission prep — cargo reaches the engine without changing it', () => {
  it('hands out exactly the approved default total, no more', () => {
    const limits = cargoLimits(original);
    const base = limits.base;
    expect(limits.total).toBe(base.air + base.supplies + base.battery);
    // The default load must reproduce today's approved starting position.
    expect(base.air).toBe(original.startingMeters.air);
    expect(base.supplies).toBe(original.startingMeters.food);
    expect(base.battery).toBe(original.reevaluation.c3.battery.initialCharge);
  });

  it('keeps a derived config valid for the v3 engine', () => {
    const config = applyPrep(original, prep({ air: 4, supplies: 4, battery: 1 }));
    expect(() => requireC3(config)).not.toThrow();
    expect(config.reevaluation.version).toBe(3);
    expect(config.missionLengthDays).toBe(original.missionLengthDays);
  });

  it('starts the mission on the loaded cargo', () => {
    const config = applyPrep(original, prep({ air: 4, supplies: 4, battery: 1 }));
    const state = createC3State(config, mission);
    expect(state.meters.air).toBe(4);
    expect(state.meters.supplies).toBe(4);
    expect(state.battery).toBe(1);
    expect(state.meters.safety).toBe(original.reevaluation.startingSafety);
    expect(state.battery).toBeLessThanOrEqual(c3BatteryCapacity(state, config));
  });

  it('leaves the original config untouched', () => {
    const before = JSON.stringify(original);
    applyPrep(original, prep({ air: 9, supplies: 2, battery: 2 }));
    expect(JSON.stringify(original)).toBe(before);
  });

  it('runs on config defaults when no prep happened', () => {
    expect(applyPrep(original, null)).toBe(original);
    const state = createC3State(original, mission);
    expect(state.meters.air).toBe(original.startingMeters.air);
  });
});
