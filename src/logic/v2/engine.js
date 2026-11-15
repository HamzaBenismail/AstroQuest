/**
 * Phase Reevaluation B — candidate pure engine.
 * All resource quantities are simplified GAME UNITS, not NASA measurements.
 * Source mission JSON is immutable; no network, DOM, React or hidden randomness.
 * This engine is additive, leaving the original Phase 3 engine untouched.
 */
import { createSeededRng } from '../game.js';

export const CONSUMERS = Object.freeze(['lifeSupport', 'shield', 'greenhouse', 'science']);
export const REQUEST_KINDS = Object.freeze(['weather-review', 'research-advice']);
export const UPGRADES = Object.freeze(['air-recycler', 'weather-analyst']);
export const METER_KEYS = Object.freeze(['air', 'supplies', 'safety']);

export function requireV2(config) {
  const v = config.reevaluation;
  if (!v || v.version !== 2 || !v.research || !v.comms) {
    throw new Error('Reevaluation B config not applied. See REEVALUATION-B-README.md');
  }
  return v;
}

const clamp = (x, config) => Math.min(config.meterMax, Math.max(config.meterMin ?? 0, x));

export function energyForDay(day, config) {
  if (!Number.isInteger(day) || day < 1 || day > config.missionLengthDays) throw new RangeError('Invalid day');
  return config.powerBudget.sunlitDays.includes(day) ? config.powerBudget.sunlit : requireV2(config).reducedDayEnergy;
}

export function initialPlan(config) {
  return Object.fromEntries(CONSUMERS.map(key => [key, config.allocationRanges[key][0]]));
}

export function createV2State(config, mission) {
  requireV2(config);
  if (!mission || !Array.isArray(mission.days) || mission.days.length !== config.missionLengthDays) {
    throw new TypeError('A full approved mission is required');
  }
  return {
    missionId: mission.missionId,
    day: 1,
    completedDays: 0,
    status: 'running',
    reason: null,
    meters: { air: config.startingMeters.air, supplies: config.startingMeters.food, safety: requireV2(config).startingSafety },
    greenhouseYesterday: config.initialGreenhouseYesterday,
    researchTotal: 0,
    upgrade: null,
    upgradeDay: null,
    comms: { pending: null, lastResponse: null, weatherBoostDay: null },
    history: [],
  };
}

export function validateV2Plan(state, allocation, requestKind, config) {
  const v = requireV2(config);
  if (!state || state.status !== 'running') return { ok: false, reason: 'Mission is not running' };
  if (!allocation || typeof allocation !== 'object' || Array.isArray(allocation)) return { ok: false, reason: 'Missing allocations' };
  if (Object.keys(allocation).length !== CONSUMERS.length) return { ok: false, reason: 'Provide four allocations' };
  let used = 0;
  for (const key of CONSUMERS) {
    const [min, max] = config.allocationRanges[key];
    if (!Number.isInteger(allocation[key]) || allocation[key] < min || allocation[key] > max) {
      return { ok: false, reason: `${key} must be between ${min} and ${max}` };
    }
    used += allocation[key];
  }
  if (requestKind !== null) {
    if (!REQUEST_KINDS.includes(requestKind)) return { ok: false, reason: 'Unknown Earth request' };
    if (state.comms.pending) return { ok: false, reason: 'Earth is still working on your last request' };
    if (state.day + v.comms.baseResponseTurns + v.comms.interferenceExtraTurns >= config.missionLengthDays) {
      return { ok: false, reason: 'Not enough mission days remain for a useful reply' };
    }
    used += v.comms.sendEnergyCost;
  }
  const budget = energyForDay(state.day, config);
  if (used > budget) return { ok: false, reason: `Plan uses ${used} of ${budget} Energy` };
  return { ok: true, used, budget, remaining: budget - used, reason: null };
}

export function v2Forecast(day, state, mission, config, seed) {
  const v = requireV2(config);
  const record = mission.days[day - 1];
  if (!record || record.day !== day) throw new Error(`Missing mission day ${day}`);
  const improved = state.upgrade === 'weather-analyst' && state.upgradeDay < day || state.comms.weatherBoostDay === day;
  const table = improved ? v.research.improvedForecastErrorTable : config.forecastErrorTable;
  const rng = createSeededRng(seed);
  const index = Math.floor(rng(day) * table.length);
  const [min, max] = config.stormLevelRange;
  return Math.min(max, Math.max(min, record.stormLevel + table[index]));
}

export function selectUpgrade(state, kind, config) {
  const v = requireV2(config);
  if (!UPGRADES.includes(kind)) throw new Error('Unknown upgrade');
  if (state.status !== 'running' || state.upgrade || state.researchTotal < v.research.unlockThreshold) {
    throw new Error('Research upgrade is not available');
  }
  return { ...state, upgrade: kind, upgradeDay: state.completedDays };
}

export function simulateV2Day(state, allocation, requestKind, mission, config, forecastShown) {
  const v = requireV2(config);
  if (state.missionId !== mission.missionId || state.history.length !== state.completedDays) throw new Error('Invalid mission state');
  const check = validateV2Plan(state, allocation, requestKind, config);
  if (!check.ok) throw new Error(check.reason);
  const eventDay = mission.days[state.day - 1];
  if (!eventDay || eventDay.day !== state.day || !Number.isInteger(eventDay.stormLevel)) throw new Error('Invalid archived mission record');
  const level = eventDay.stormLevel;
  if (level < config.stormLevelRange[0] || level > config.stormLevelRange[1]) throw new Error('Invalid game storm level');
  const old = state.meters;
  const recyclerActive = state.upgrade === 'air-recycler' && state.upgradeDay < state.day;
  const airUse = recyclerActive ? Math.max(v.research.airUseMin, config.airUse - v.research.airUseReduction) : config.airUse;
  const meters = {
    air: clamp(old.air + allocation.lifeSupport - airUse, config),
    supplies: clamp(old.supplies - config.foodUse + state.greenhouseYesterday, config),
    safety: 0,
  };
  const penalty = allocation.shield === config.allocationRanges.shield[0] ? config.zeroShieldSafetyPenalty : (config.meterMin ?? 0);
  const damage = Math.max(config.meterMin ?? 0, config.stormDamage[String(level)] - config.shieldProtection * allocation.shield) + penalty;
  const recovery = level === config.stormLevelRange[0] && allocation.shield >= config.calmShieldRecoveryMinAllocation
    ? config.calmShieldRecovery : (config.meterMin ?? 0);
  meters.safety = clamp(old.safety - damage + recovery, config);

  let pending = state.comms.pending ? { ...state.comms.pending } : null;
  let lastResponse = state.comms.lastResponse ? { ...state.comms.lastResponse } : null;
  let weatherBoostDay = state.comms.weatherBoostDay;
  if (requestKind) {
    pending = { kind: requestKind, requestedDay: state.day, dueDay: state.day + v.comms.baseResponseTurns, postponed: false };
  }
  let communicationEvent = requestKind ? 'Request sent to Earth (simulated processing time).' : null;
  if (pending && state.day >= pending.dueDay) {
    if (!pending.postponed && level >= v.comms.interferenceStormLevel) {
      pending = { ...pending, postponed: true, dueDay: state.day + v.comms.interferenceExtraTurns };
      communicationEvent = 'Reply postponed by simulated storm interference. This is a game rule.';
    } else {
      lastResponse = { kind: pending.kind, deliveredDay: state.day };
      weatherBoostDay = pending.kind === 'weather-review' ? state.day + 1 : weatherBoostDay;
      communicationEvent = pending.kind === 'weather-review'
        ? 'Earth sent a clearer game forecast for the next day.'
        : 'Earth advises: protect Air and Supplies while watching the storm forecast.';
      pending = null;
    }
  }

  const completedDays = state.completedDays + 1;
  const researchTotal = state.researchTotal + allocation.science * v.research.pointsPerPower;
  const depleted = METER_KEYS.find(name => meters[name] <= config.failureMeterThreshold);
  let status = depleted ? 'failed' : 'running';
  let reason = depleted ?? null;
  if (status === 'running' && completedDays === config.missionLengthDays) {
    status = METER_KEYS.every(name => meters[name] >= config.successMinMeter) ? 'succeeded' : 'failed';
    if (status === 'failed') reason = 'objectives-not-met';
  }
  const historyEntry = {
    day: state.day, date: eventDay.date, forecast: forecastShown, stormLevel: level,
    sourceIds: eventDay.events.map(event => event.sourceId),
    allocation: { ...allocation }, request: requestKind, energyUsed: check.used,
    meters: { ...meters }, researchTotal, communicationEvent,
    meterDeltas: Object.fromEntries(METER_KEYS.map(name => [name, meters[name] - old[name]])),
  };
  return {
    ...state, day: status === 'running' ? state.day + 1 : state.day,
    completedDays, status, reason, meters,
    greenhouseYesterday: allocation.greenhouse, researchTotal,
    comms: { pending, lastResponse, weatherBoostDay },
    history: [...state.history, historyEntry],
  };
}

export function v2Debrief(state, mission) {
  if (state.status === 'running' || state.missionId !== mission.missionId) throw new Error('Mission must be finished');
  return {
    status: state.status, reason: state.reason, daysCompleted: state.completedDays,
    score: state.researchTotal, meters: { ...state.meters },
    upgrade: state.upgrade, pendingRequest: state.comms.pending,
    source: mission.dataSource,
  };
}
