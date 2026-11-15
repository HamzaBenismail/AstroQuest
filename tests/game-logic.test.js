import { describe, expect, it } from 'vitest';
import config from '../src/data/config.json';
import {
  createInitialState,
  createSeededRng,
  getPowerBudget,
  validateAllocation,
  makeForecast,
  simulateDay,
  scoreMission,
  buildDebrief,
} from '../src/logic/game.js';
import { validateMission } from '../scripts/donki-utils.js';

// Synthetic IN-MEMORY fixtures; never shipped or labelled as NASA observations.
const calm = () => Array.from({ length: config.missionLengthDays }, () => config.stormLevelRange[0]);
const missionFor = (levels = calm()) => ({
  missionId: 'synthetic-test-only',
  title: 'Synthetic test fixture (not NASA data)',
  site: config.site,
  dataSource: 'NASA DONKI (archived data)', // schema string tested; not a factual claim about this fixture
  window: { start: '2024-05-08', end: '2024-05-17' },
  days: levels.map((stormLevel, i) => ({
    day: i + 1,
    date: `2024-05-${String(i + 8).padStart(2, '0')}`,
    stormLevel,
    events: [],
  })),
});
const allocation = (overrides = {}) => ({ lifeSupport: 4, shield: 1, greenhouse: 2, science: 0, ...overrides });
const play = (mission, allocations) => allocations.reduce(
  (state, action) => simulateDay(state, action, mission, config),
  createInitialState(config, mission),
);

describe('F3 — Required rule tests (CLAUDE.md §12)', () => {
  it('1. rejects power allocations exceeding the budget (and enforces per-consumer integer ranges)', () => {
    expect(getPowerBudget(1, config)).toBe(10);
    expect(getPowerBudget(5, config)).toBe(7);
    expect(validateAllocation(allocation({ science: 3 }), 1, config).ok).toBe(true); // 10
    expect(validateAllocation(allocation({ science: 3 }), 5, config).ok).toBe(false); // 10 > 7
    expect(validateAllocation(allocation({ lifeSupport: 5 }), 1, config).ok).toBe(false);
    expect(validateAllocation(allocation({ shield: 0.5 }), 1, config).ok).toBe(false);
    expect(validateAllocation({ lifeSupport: 4 }, 1, config).ok).toBe(false);
    expect(validateAllocation(allocation({ science: -1 }), 1, config).ok).toBe(false);
    expect(validateAllocation(allocation({ science: 0 }), 11, config).ok).toBe(false);
  });

  it('2. updates air from previous value + life support - air use, clamped to 0..10', () => {
    const mission = missionFor();
    const start = createInitialState(config, mission);
    const next = simulateDay(start, allocation(), mission, config);
    expect(next.meters.air).toBe(6); // 5 + 4 - 3
    const cap = simulateDay({ ...start, meters: { ...start.meters, air: 10 } }, allocation(), mission, config);
    expect(cap.meters.air).toBe(10);
    expect(start.meters.air).toBe(5); // no mutation
  });

  it('3. uses initial greenhouse yesterday on day 1 and the day-1 allocation on day 2', () => {
    const mission = missionFor();
    const state = createInitialState(config, mission);
    const day1 = simulateDay(state, allocation({ greenhouse: 3 }), mission, config);
    expect(day1.meters.food).toBe(3); // 4 - 2 + initial 1
    expect(day1.greenhouseYesterday).toBe(3);
    const day2 = simulateDay(day1, allocation(), mission, config);
    expect(day2.meters.food).toBe(4); // 3 - 2 + previous 3
  });

  it('4. shield damage cases: severe 3→1, severe 0→8, calm 0→1, calm shield→recovery', () => {
    const severe = missionFor([3, ...calm().slice(1)]);
    const safe = simulateDay(createInitialState(config, severe), allocation({ shield: 3, greenhouse: 0 }), severe, config);
    expect(safe.meters.safety).toBe(7); // starting 8 - 1
    const unshielded = simulateDay(createInitialState(config, severe), allocation({ shield: 0 }), severe, config);
    expect(unshielded.meters.safety).toBe(0); // damage 7 + 1
    expect(unshielded.status).toBe('failed');
    const quiet = missionFor();
    expect(simulateDay(createInitialState(config, quiet), allocation({ shield: 0 }), quiet, config).meters.safety).toBe(7);
    expect(simulateDay(createInitialState(config, quiet), allocation(), quiet, config).meters.safety).toBe(9);
    const startingMax = createInitialState(config, quiet);
    const capped = simulateDay({ ...startingMax, meters: { ...startingMax.meters, safety: 10 } }, allocation(), quiet, config);
    expect(capped.meters.safety).toBe(10);
  });

  it('5. any depleted meter fails, identifies the failed meter and prevents further turns', () => {
    const m = missionFor();
    const starting = createInitialState(config, m);
    for (const meter of ['air', 'food', 'safety']) {
      const state = { ...starting, meters: { air: 10, food: 10, safety: 10, [meter]: 1 } };
      const a = meter === 'safety' ? allocation({ shield: 0 }) : allocation({ lifeSupport: 0, greenhouse: 0 });
      const result = simulateDay(state, a, m, config);
      expect(result.status).toBe('failed');
      expect(result.reason).toBe(meter);
      expect(() => simulateDay(result, allocation(), m, config)).toThrow(/ended/);
    }
  });

  it('6. success only after 10 days with all meters at or above success minimum', () => {
    const m = missionFor();
    const first = simulateDay(createInitialState(config, m), allocation(), m, config);
    expect(first.status).toBe('running');
    const success = play(m, Array.from({ length: config.missionLengthDays }, () => allocation()));
    expect(success.status).toBe('succeeded');
    expect(success.completedDays).toBe(config.missionLengthDays);
    for (const meter of Object.values(success.meters)) expect(meter).toBeGreaterThanOrEqual(config.successMinMeter);
  });

  it('7. seeded forecasts reproduce identically, stay in range, and differ by at most 1', () => {
    const levels = Array.from({ length: config.missionLengthDays }, (_, i) => i % 4);
    const m = missionFor(levels);
    const first = createSeededRng(2048);
    const second = createSeededRng(2048);
    const a = m.days.map(x => makeForecast(x.day, m, first, config));
    const b = m.days.map(x => makeForecast(x.day, m, second, config));
    expect(a).toEqual(b);
    for (let i = 0; i < a.length; i++) {
      expect(a[i]).toBeGreaterThanOrEqual(config.stormLevelRange[0]);
      expect(a[i]).toBeLessThanOrEqual(config.stormLevelRange[1]);
      expect(Math.abs(a[i] - levels[i])).toBeLessThanOrEqual(1);
    }
    expect(() => makeForecast(1, m, () => 1, config)).toThrow(/RNG/);
  });

  it('8. changing config changes output (the rule has no hard-coded air consumption)', () => {
    const m = missionFor();
    const starting = createInitialState(config, m);
    const original = simulateDay(starting, allocation(), m, config);
    const altered = simulateDay(starting, allocation(), m, { ...config, airUse: config.airUse + 1 });
    expect(original.meters.air).toBe(6);
    expect(altered.meters.air).toBe(5);
  });

  it('9. validates mission day count, storm levels and event source IDs', () => {
    const m = missionFor();
    expect(validateMission(m, config)).toBe(true);
    const wrongDays = { ...m, days: m.days.slice(1) };
    expect(() => validateMission(wrongDays, config)).toThrow();
    const wrongLevel = { ...m, days: m.days.map((d, i) => i === 0 ? { ...d, stormLevel: 99 } : d) };
    expect(() => validateMission(wrongLevel, config)).toThrow();
    const missingId = { ...m, days: m.days.map((d, i) => i === 0 ? { ...d, events: [{ type: 'FLR', label: 'test-only', sourceId: '' }] } : d) };
    expect(() => validateMission(missingId, config)).toThrow(/sourceId/);
  });
});

describe('F3 — Additional contract and integration tests', () => {
  it('rejects an invalid day and corrupt mission rather than guessing', () => {
    const m = missionFor();
    expect(() => createInitialState(config, { ...m, days: m.days.slice(1) })).toThrow();
    expect(() => makeForecast(11, m, createSeededRng(1), config)).toThrow();
  });

  it('does not mutate state, allocations, mission, or config', () => {
    const m = missionFor();
    const a = allocation();
    const s = createInitialState(config, m);
    const snapshot = JSON.stringify([s, a, m, config]);
    simulateDay(s, a, m, config);
    expect(JSON.stringify([s, a, m, config])).toBe(snapshot);
  });

  it('scores the sum of science allocations and emits a finished debrief', () => {
    const m = missionFor();
    const actions = Array.from({ length: config.missionLengthDays }, (_, i) =>
      i < 4 ? allocation({ science: 3 }) : allocation());
    const done = play(m, actions);
    expect(done.status).toBe('succeeded');
    expect(scoreMission(done)).toBe(12);
    const debrief = buildDebrief(done, m);
    expect(debrief).toMatchObject({ status: 'succeeded', score: 12, completedDays: 10 });
    expect(debrief.history).toHaveLength(config.missionLengthDays);
  });

  it('supports a full simulated 10-day success and an early failure with different actions', () => {
    const m = missionFor();
    const succeeded = play(m, Array.from({ length: config.missionLengthDays }, () => allocation()));
    expect(succeeded.status).toBe('succeeded');
    const zero = { lifeSupport: 0, shield: 0, greenhouse: 0, science: 0 };
    const first = simulateDay(createInitialState(config, m), zero, m, config);
    const failed = simulateDay(first, zero, m, config);
    expect(failed.status).toBe('failed');
    expect(failed.reason).toBe('air');
    expect(buildDebrief(failed, m).status).toBe('failed');
  });

  it('flags the unresolved final-day state without inventing another win/loss rule', () => {
    const m = missionFor();
    const firstNine = play(m, Array.from({ length: config.missionLengthDays - 1 }, () => allocation()));
    expect(firstNine.status).toBe('running');
    const ambiguousState = { ...firstNine, meters: { ...firstNine.meters, air: 2 } };
    expect(() => simulateDay(ambiguousState, allocation({ lifeSupport: 3 }), m, config))
      .toThrow(/team decision required/);
  });

  it('never reads a forecast instead of the real storm level', () => {
    const m = missionFor([3, ...calm().slice(1)]);
    const state = createInitialState(config, m);
    const realOutcome = simulateDay(state, allocation({ shield: 3, greenhouse: 0 }), m, config);
    expect(realOutcome.history[0].stormLevel).toBe(3);
    expect(realOutcome.meters.safety).toBe(7);
  });
});
