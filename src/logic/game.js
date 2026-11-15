/**
 * F3 — Pure, deterministic mission rules (CLAUDE.md §4.2, §8.3).
 *
 * All resource values are simplified GAME UNITS, not engineering quantities.
 * The game runs on already embedded, archived mission data; it makes no API calls.
 *
 * State contract:
 * - `day` is the next decision day while running; when terminal, it is the last played day.
 * - `completedDays` is the number of successfully applied daily updates.
 * - `meters` contains air, food and safety.
 * - `greenhouseYesterday` applies to the next daily food update.
 * - `history` records committed actions and resulting meters without mutating input state.
 *
 * TODO(VERIFY): CLAUDE.md §4.1 does not define the outcome when day 10 ends
 * with every meter above 0 but at least one below `successMinMeter`.
 * We throw an explicit error rather than invent a fourth status or silently winning.
 */

const CONSUMERS = ['lifeSupport', 'shield', 'greenhouse', 'science'];
const METER_NAMES = ['air', 'food', 'safety'];

function clamp(value, config) {
  return Math.max(config.meterMin, Math.min(config.meterMax, value));
}

function assertDay(day, config) {
  if (!Number.isInteger(day) || day < 1 || day > config.missionLengthDays) {
    throw new RangeError(`Day must be between 1 and ${config.missionLengthDays}`);
  }
}

function missionDay(day, mission, config) {
  assertDay(day, config);
  if (!mission || !Array.isArray(mission.days) ||
      mission.days.length !== config.missionLengthDays) {
    throw new TypeError('Mission must contain the configured number of days');
  }
  const record = mission.days[day - 1];
  if (!record || record.day !== day || !Number.isInteger(record.stormLevel) ||
      record.stormLevel < config.stormLevelRange[0] ||
      record.stormLevel > config.stormLevelRange[1]) {
    throw new TypeError(`Invalid mission storm record for day ${day}`);
  }
  return record;
}

export function createInitialState(config, mission) {
  missionDay(1, mission, config);
  for (const name of METER_NAMES) {
    const meter = config.startingMeters[name];
    if (!Number.isFinite(meter) || meter < config.meterMin || meter > config.meterMax) {
      throw new TypeError(`Invalid starting meter: ${name}`);
    }
  }
  return {
    missionId: mission.missionId,
    day: 1,
    completedDays: 0,
    status: 'running',
    reason: null,
    meters: { ...config.startingMeters },
    greenhouseYesterday: config.initialGreenhouseYesterday,
    history: [],
  };
}

export function getPowerBudget(day, config) {
  assertDay(day, config);
  return config.powerBudget.sunlitDays.includes(day)
    ? config.powerBudget.sunlit
    : config.powerBudget.night;
}

export function validateAllocation(allocation, day, config) {
  if (!Number.isInteger(day) || day < 1 || day > config.missionLengthDays) {
    return { ok: false, reason: 'Invalid mission day' };
  }
  if (!allocation || typeof allocation !== 'object' || Array.isArray(allocation)) {
    return { ok: false, reason: 'Allocation must contain all four power consumers' };
  }
  if (Object.keys(allocation).length !== CONSUMERS.length ||
      CONSUMERS.some(name => !Object.hasOwn(allocation, name))) {
    return { ok: false, reason: 'Allocation must contain exactly four power consumers' };
  }
  let total = 0;
  for (const name of CONSUMERS) {
    const value = allocation[name];
    const range = config.allocationRanges[name];
    if (!Number.isInteger(value) || value < range[0] || value > range[1]) {
      return { ok: false, reason: `${name} allocation must be an integer between ${range[0]} and ${range[1]}` };
    }
    total += value;
  }
  if (total > getPowerBudget(day, config)) {
    return { ok: false, reason: `Total ${total} exceeds daily power budget ${getPowerBudget(day, config)}` };
  }
  return { ok: true, reason: null };
}

/**
 * Create a deterministic day-indexed source of uniform [0,1) samples.
 * The hash constants below define a PRNG algorithm, NOT game-rule numbers.
 * Calling the same day twice never advances or mutates RNG state.
 */
export function createSeededRng(seed) {
  if (!Number.isSafeInteger(seed)) throw new TypeError('Seed must be a safe integer');
  return (day) => {
    if (!Number.isInteger(day) || day < 1) throw new TypeError('RNG day must be a positive integer');
    let n = (seed ^ Math.imul(day, 0x9e3779b1)) >>> 0;
    n = Math.imul(n ^ (n >>> 16), 0x7feb352d);
    n = Math.imul(n ^ (n >>> 15), 0x846ca68b);
    n = (n ^ (n >>> 16)) >>> 0;
    return n / 0x100000000;
  };
}

export function makeForecast(day, mission, rng, config) {
  const realLevel = missionDay(day, mission, config).stormLevel;
  if (typeof rng !== 'function') throw new TypeError('Forecast requires an injected seeded RNG');
  const sample = rng(day);
  if (!Number.isFinite(sample) || sample < 0 || sample >= 1) {
    throw new RangeError('RNG must return a finite number from 0 inclusive to 1 exclusive');
  }
  const table = config.forecastErrorTable;
  if (!Array.isArray(table) || table.length === 0) throw new TypeError('Missing forecast error table');
  const error = table[Math.floor(sample * table.length)];
  if (!Number.isInteger(error)) throw new TypeError('Forecast error must be an integer');
  return Math.max(config.stormLevelRange[0],
    Math.min(config.stormLevelRange[1], realLevel + error));
}

export function simulateDay(state, allocation, mission, config) {
  if (!state || state.status !== 'running') {
    throw new Error('Cannot simulate after the mission has ended');
  }
  if (state.missionId !== mission.missionId) {
    throw new Error('State and mission IDs do not match');
  }
  if (state.completedDays !== state.day - 1 || state.history.length !== state.completedDays) {
    throw new Error('Inconsistent game day/history state');
  }
  const { ok, reason } = validateAllocation(allocation, state.day, config);
  if (!ok) throw new RangeError(reason);

  // Source of storm severity is the REAL archived daily record, never a forecast.
  const { stormLevel: level } = missionDay(state.day, mission, config);
  const { air, food, safety } = state.meters;
  const nextAir = clamp(air + allocation.lifeSupport - config.airUse, config);
  const nextFood = clamp(food - config.foodUse + state.greenhouseYesterday, config);
  const damage = Math.max(config.meterMin,
    config.stormDamage[String(level)] - config.shieldProtection * allocation.shield)
    + (allocation.shield === config.allocationRanges.shield[0]
      ? config.zeroShieldSafetyPenalty : config.meterMin);
  const recovery = level === config.stormLevelRange[0] &&
    allocation.shield >= config.calmShieldRecoveryMinAllocation
    ? config.calmShieldRecovery : config.meterMin;
  const nextSafety = clamp(safety - damage + recovery, config);

  const meters = { air: nextAir, food: nextFood, safety: nextSafety };
  const failedMeter = METER_NAMES.find(name => meters[name] <= config.failureMeterThreshold);
  const completedDays = state.completedDays + 1;
  const completedMission = completedDays === config.missionLengthDays;
  const qualifiesForSuccess = METER_NAMES.every(name => meters[name] >= config.successMinMeter);

  // CLAUDE.md §4.1 has no definition for this nonzero, below-success final state.
  // Stop explicitly before committing a state that Phase 4 cannot resolve.
  if (!failedMeter && completedMission && !qualifiesForSuccess) {
    throw new Error('Unresolved final-day outcome: team decision required (CLAUDE.md §4.1)');
  }

  const status = failedMeter ? 'failed' : completedMission ? 'succeeded' : 'running';
  const nextDay = status === 'running' ? state.day + 1 : state.day;
  return {
    ...state,
    day: nextDay,
    completedDays,
    status,
    reason: failedMeter ?? null,
    meters,
    greenhouseYesterday: allocation.greenhouse,
    history: [
      ...state.history,
      {
        day: state.day,
        date: mission.days[state.day - 1].date,
        stormLevel: level,
        allocation: { ...allocation },
        meters: { ...meters },
      },
    ],
  };
}

export function scoreMission(state) {
  if (!state || !Array.isArray(state.history)) throw new TypeError('Missing mission history');
  return state.history.reduce((score, entry) => score + entry.allocation.science, 0);
}

export function buildDebrief(state, mission) {
  if (state.missionId !== mission.missionId) throw new Error('State and mission IDs do not match');
  if (state.status === 'running') throw new Error('Debrief requires a finished mission');
  return {
    missionId: state.missionId,
    status: state.status,
    reason: state.reason,
    completedDays: state.completedDays,
    score: scoreMission(state),
    meters: { ...state.meters },
    history: state.history.map(entry => ({
      ...entry,
      allocation: { ...entry.allocation },
      meters: { ...entry.meters },
    })),
    dataSource: mission.dataSource,
  };
}
