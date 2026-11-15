/**
 * Dependency-free F3 rule check for environments without npm/Vitest.
 * Synthetic fixtures only. This does NOT replace npm test or a real NASA mission test.
 * Run: node tests/phase3-node-check.mjs
 */
import assert from 'node:assert/strict';
import config from '../src/data/config.json' with { type: 'json' };
import { validateMission } from '../scripts/donki-utils.js';
import { createInitialState, createSeededRng, validateAllocation, makeForecast,
  simulateDay, scoreMission, buildDebrief } from '../src/logic/game.js';

const mission = (levels = Array(config.missionLengthDays).fill(0)) => ({
  missionId: 'synthetic-test-only', title: 'Synthetic fixture, not NASA data', site: config.site,
  dataSource: 'NASA DONKI (archived data)',
  window: { start: '2024-05-08', end: '2024-05-17' },
  days: levels.map((stormLevel, i) => ({ day: i + 1, date: `2024-05-${String(i + 8).padStart(2, '0')}`, stormLevel, events: [] })),
});
const alloc = (changes = {}) => ({ lifeSupport: 4, shield: 1, greenhouse: 2, science: 0, ...changes });
const m = mission();
let passed = 0;
function check(name, test) {
  try { test(); passed++; process.stdout.write(`PASS ${name}\n`); }
  catch (error) { process.stderr.write(`FAIL ${name}: ${error.stack}\n`); process.exitCode = 1; }
}
check('1. budget and valid ranges', () => {
  assert.equal(validateAllocation(alloc({ science: 3 }), 1, config).ok, true);
  assert.equal(validateAllocation(alloc({ science: 3 }), 5, config).ok, false);
  assert.equal(validateAllocation(alloc({ shield: .5 }), 1, config).ok, false);
});
check('2. air update and clamp', () => {
  const s = createInitialState(config, m), out = simulateDay(s, alloc(), m, config);
  assert.equal(out.meters.air, 6);
  assert.equal(simulateDay({ ...s, meters: { ...s.meters, air: 10 } }, alloc(), m, config).meters.air, 10);
});
check('3. delayed greenhouse', () => {
  const day1 = simulateDay(createInitialState(config, m), alloc({ greenhouse: 3 }), m, config);
  assert.equal(day1.meters.food, 3);
  assert.equal(simulateDay(day1, alloc(), m, config).meters.food, 4);
});
check('4. storm and calm damage', () => {
  const severe = mission([3, ...Array(config.missionLengthDays - 1).fill(0)]);
  assert.equal(simulateDay(createInitialState(config, severe), alloc({ shield: 3, greenhouse: 0 }), severe, config).meters.safety, 7);
  assert.equal(simulateDay(createInitialState(config, severe), alloc({ shield: 0 }), severe, config).meters.safety, 0);
  assert.equal(simulateDay(createInitialState(config, m), alloc({ shield: 0 }), m, config).meters.safety, 7);
  assert.equal(simulateDay(createInitialState(config, m), alloc(), m, config).meters.safety, 9);
});
check('5. failure reasons', () => {
  const s = createInitialState(config, m);
  for (const meter of ['air', 'food', 'safety']) {
    const input = { ...s, meters: { air: 10, food: 10, safety: 10, [meter]: 1 } };
    const result = simulateDay(input, meter === 'safety' ? alloc({ shield: 0 }) : alloc({ lifeSupport: 0, greenhouse: 0 }), m, config);
    assert.equal(result.status, 'failed'); assert.equal(result.reason, meter);
  }
});
check('6. ten-day success only', () => {
  let s = createInitialState(config, m);
  for (let i = 0; i < config.missionLengthDays; i++) {
    s = simulateDay(s, alloc(), m, config);
    assert.equal(s.status, i === config.missionLengthDays - 1 ? 'succeeded' : 'running');
  }
  assert.equal(s.completedDays, config.missionLengthDays);
});
check('7. deterministic injected RNG forecasts', () => {
  const levels = Array.from({ length: config.missionLengthDays }, (_, i) => i % 4), storm = mission(levels);
  const a = storm.days.map(d => makeForecast(d.day, storm, createSeededRng(17), config));
  const b = storm.days.map(d => makeForecast(d.day, storm, createSeededRng(17), config));
  assert.deepEqual(a, b);
  a.forEach((forecast, i) => { assert(forecast >= 0 && forecast <= 3); assert(Math.abs(forecast - levels[i]) <= 1); });
});
check('8. rules read values from config', () => {
  const s = createInitialState(config, m);
  assert.notEqual(simulateDay(s, alloc(), m, config).meters.air,
    simulateDay(s, alloc(), m, { ...config, airUse: config.airUse + 1 }).meters.air);
});
check('9. mission schema and IDs', () => {
  assert.equal(validateMission(m, config), true);
  assert.throws(() => validateMission({ ...m, days: m.days.slice(1) }, config));
  const invalid = structuredClone(m); invalid.days[0].events = [{ type: 'FLR', label: 'synthetic', sourceId: '' }];
  assert.throws(() => validateMission(invalid, config), /sourceId/);
});
check('additional: score, debrief, immutable input, ambiguous day 10', () => {
  let s = createInitialState(config, m); const original = structuredClone(s);
  for (let i = 0; i < config.missionLengthDays; i++) s = simulateDay(s, alloc(), m, config);
  assert.deepEqual(createInitialState(config, m), original);
  assert.equal(scoreMission(s), 0);
  assert.equal(buildDebrief(s, m).status, 'succeeded');
  let beforeLast = createInitialState(config, m);
  for (let i = 0; i < config.missionLengthDays - 1; i++) beforeLast = simulateDay(beforeLast, alloc(), m, config);
  assert.throws(() => simulateDay({ ...beforeLast, meters: { ...beforeLast.meters, air: 2 } }, alloc({ lifeSupport: 3 }), m, config), /team decision required/);
});
process.stdout.write(`${passed}/10 local synthetic rule groups passed\n`);
