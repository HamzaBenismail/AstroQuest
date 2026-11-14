/**
 * Reevaluation C — pure, deterministic v3 gameplay rules.
 * Every resource quantity is a GAME UNIT, not a real engineering measurement.
 * NASA DONKI records are supplied as immutable archived mission inputs.
 */
import { createSeededRng } from '../game.js';

export const CONSUMERS = Object.freeze(['lifeSupport', 'greenhouse', 'science', 'shield']);
export const ROOMS_C3 = Object.freeze(['lifeSupport', 'greenhouse', 'power', 'science', 'shield', 'comms']);
export const METERS_C3 = Object.freeze(['air', 'supplies', 'safety']);
export const EXPEDITIONS_C3 = Object.freeze(['supply-retrieval', 'science-sampling', 'equipment-maintenance']);

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const jsonCopy = value => value == null ? value : JSON.parse(JSON.stringify(value));
const positiveInteger = n => Number.isInteger(n) && n >= 0;

export function requireC3(config) {
  const c = config?.reevaluation?.c3;
  if (config?.reevaluation?.version !== 3 || !c?.upgrades || !c?.battery || !c?.expeditions || !c?.care || !c?.comms || !c?.advisor) {
    throw new Error('Reevaluation C configuration not applied. Run npm run reevaluate:c -- --apply.');
  }
  return c;
}

export function createC3Plan(config) {
  requireC3(config);
  return {
    allocation: Object.fromEntries(CONSUMERS.map(key => [key, config.allocationRanges[key][0]])),
    charge: 0,
    care: false,
    requestAdvice: false,
    expedition: null,
    upgradeRoom: null,
  };
}

export function createC3State(config, mission) {
  const c = requireC3(config);
  if (!mission || !Array.isArray(mission.days) || mission.days.length !== config.missionLengthDays || !mission.days.every((d, i) => d?.day === i + 1 && Number.isInteger(d.stormLevel) && Array.isArray(d.events))) {
    throw new Error('A complete, ordered archived mission is required');
  }
  return {
    missionId: mission.missionId,
    day: 1,
    completedDays: 0,
    status: 'running',
    reason: null,
    meters: { air: config.startingMeters.air, supplies: config.startingMeters.food, safety: config.reevaluation.startingSafety },
    greenhouseYesterday: config.initialGreenhouseYesterday,
    research: { earned: 0, available: 0 },
    roomLevels: Object.fromEntries(ROOMS_C3.map(room => [room, c.upgrades.initialLevel])),
    battery: c.battery.initialCharge,
    comms: { pending: null, lastAdvice: null },
    expedition: { active: null, completed: [] },
    lastCareDay: null,
    history: [],
  };
}

export function c3BatteryCapacity(state, config) {
  const c = requireC3(config);
  return c.battery.baseCapacity + (state.roomLevels.power - c.upgrades.initialLevel) * c.battery.capacityPerPowerLevel;
}

export function c3Generation(state, config) {
  const c = requireC3(config);
  if (!Number.isInteger(state.day) || state.day < 1 || state.day > config.missionLengthDays) throw new RangeError('Invalid mission day');
  const base = config.powerBudget.sunlitDays.includes(state.day) ? config.powerBudget.sunlit : config.reevaluation.reducedDayEnergy;
  return base + (state.roomLevels.power - c.upgrades.initialLevel) * c.upgrades.effects.power.extraGenerationPerLevel;
}

export function c3UpgradeCost(room, state, config) {
  const c = requireC3(config);
  if (!ROOMS_C3.includes(room)) throw new Error(`Unknown room ${room}`);
  const current = state.roomLevels[room];
  if (current >= c.upgrades.maxLevel) return null;
  const points = c.upgrades.researchCostByNextLevel[String(current + 1)];
  if (!positiveInteger(points)) throw new Error('Missing upgrade point cost');
  return { points, energy: c.upgrades.energyCost, nextLevel: current + 1 };
}

export function c3ReplyTurns(state, config) {
  const c = requireC3(config);
  const extraLevels = state.roomLevels.comms - c.upgrades.initialLevel;
  return Math.max(c.comms.minResponseTurns, c.comms.baseResponseTurns - extraLevels * c.comms.turnReductionPerLevel);
}

export function validateC3Plan(state, plan, config) {
  const c = requireC3(config);
  const fail = reason => ({ ok: false, reason });
  if (!state || state.status !== 'running') return fail('The mission is not running');
  if (!plan || !plan.allocation || typeof plan.allocation !== 'object') return fail('Missing Energy plan');
  if (Object.keys(plan.allocation).length !== CONSUMERS.length) return fail('Exactly four allocations are required');
  let used = 0;
  for (const key of CONSUMERS) {
    const range = config.allocationRanges[key];
    const value = plan.allocation[key];
    if (!Number.isInteger(value) || value < range[0] || value > range[1]) return fail(`${key} must be between ${range[0]} and ${range[1]}`);
    used += value;
  }
  if (typeof plan.care !== 'boolean' || typeof plan.requestAdvice !== 'boolean') return fail('Care and advice must be true or false');
  if (!Number.isInteger(plan.charge) || plan.charge < 0) return fail('Battery charge must be a nonnegative integer');
  const spentSupplies = (plan.care ? c.care.suppliesCost : 0);
  let totalSuppliesCost = spentSupplies;
  let totalAirCost = 0;
  if (plan.care) {
    if (state.lastCareDay !== null && state.day - state.lastCareDay <= c.care.cooldownDays) return fail('Crew care is resting today');
    used += c.care.energyCost;
  }
  if (plan.requestAdvice) {
    if (state.comms.pending) return fail('A message is already awaiting a reply');
    if (state.day + c3ReplyTurns(state, config) + c.comms.interferenceExtraTurns >= config.missionLengthDays) return fail('Not enough mission days remain to receive advice');
    used += c.comms.sendEnergyCost;
  }
  if (plan.expedition !== null) {
    if (!EXPEDITIONS_C3.includes(plan.expedition)) return fail('Unknown expedition');
    if (state.expedition.active) return fail('An expedition is already in progress');
    const spec = c.expeditions[plan.expedition];
    if (!spec || !positiveInteger(spec.duration) || spec.duration < 1) return fail('Invalid expedition configuration');
    if (state.day + spec.duration > config.missionLengthDays) return fail('Expedition would return after the mission');
    totalSuppliesCost += spec.suppliesCost;
    totalAirCost += spec.airCost;
    used += spec.energyCost;
  }
  if (state.meters.supplies - totalSuppliesCost <= config.failureMeterThreshold || state.meters.air - totalAirCost <= config.failureMeterThreshold) {
    return fail('Not enough Air or Supplies to prepare these activities');
  }
  let upgrade = null;
  if (plan.upgradeRoom !== null) {
    if (!ROOMS_C3.includes(plan.upgradeRoom)) return fail('Unknown upgrade room');
    upgrade = c3UpgradeCost(plan.upgradeRoom, state, config);
    if (!upgrade) return fail('This room is already at its maximum level');
    if (state.research.available < upgrade.points) return fail('Not enough unspent Research Points');
    used += upgrade.energy;
  }
  const generation = c3Generation(state, config);
  const batteryDraw = Math.max(0, used - generation);
  if (batteryDraw > state.battery) return fail(`Not enough Energy: need ${used}, have ${generation + state.battery}`);
  const capacity = c3BatteryCapacity(state, config);
  if (plan.charge > c.battery.maxChargePerDay || plan.charge > capacity - state.battery) return fail('Battery charging exceeds its available capacity or rate');
  if (plan.charge > 0 && batteryDraw > 0) return fail('Cannot charge and discharge the battery on the same day');
  if (plan.charge > 0 && used + plan.charge > generation) {
    return fail('Only unspent generated Energy can be stored');
  }
  return {
    ok: true, reason: null, used, generation, batteryDraw, charge: plan.charge,
    batteryBefore: state.battery, batteryAfter: state.battery - batteryDraw + plan.charge,
    available: generation + state.battery, freeGeneration: Math.max(0, generation - used),
    upgrade, airCost: totalAirCost, suppliesCost: totalSuppliesCost,
  };
}

/** A fallible GAME warning derived from archived event categories, not a NASA forecast or dose. */
export function c3WeatherEstimate(day, mission, config, seed) {
  if (!Number.isInteger(day) || day < 1 || day > config.missionLengthDays) return null;
  const entry = mission.days[day - 1];
  if (!entry || entry.day !== day) throw new Error('Missing archived mission day');
  const rng = createSeededRng(seed);
  const table = config.forecastErrorTable;
  if (!Array.isArray(table) || !table.length) throw new Error('Missing weather error table');
  const error = table[Math.floor(rng(day) * table.length)];
  return clamp(entry.stormLevel + error, config.stormLevelRange[0], config.stormLevelRange[1]);
}

/** Reads only visible state plus a *game estimate*; never accesses future actual storm values. */
export function c3ChooseAdvice(state, weatherEstimate, config) {
  const c = requireC3(config);
  const threshold = c.advisor.lowMeterThreshold;
  const upgrades = state.roomLevels;
  let focus = 'science';
  let message = 'Build Research Points, then improve the room your crew needs most.';
  if (state.meters.safety <= threshold) {
    focus = 'shield'; message = 'Crew Safety is low. Prepare the Storm Shelter or use crew care.';
  } else if (state.meters.air <= threshold) {
    focus = 'lifeSupport'; message = 'Air is low. Power Life Support or improve its efficiency.';
  } else if (state.meters.supplies <= threshold) {
    focus = 'greenhouse'; message = 'Supplies are low. Grow food now; results arrive next day.';
  } else if (weatherEstimate !== null && weatherEstimate >= c.advisor.severeWarningLevel) {
    focus = 'shield'; message = 'A strong GAME weather warning is possible. Consider shelter power.';
  } else if (state.battery <= c.advisor.lowBatteryThreshold) {
    focus = 'power'; message = 'Battery reserves are low. Store spare Energy when available.';
  }
  const recommendedUpgrade = upgrades[focus] < c.upgrades.maxLevel ? focus :
    ROOMS_C3.find(room => upgrades[room] < c.upgrades.maxLevel) ?? null;
  return { focus, recommendedUpgrade, message, weatherEstimate, basedOnDay: state.day };
}

export function simulateC3Day(state, plan, mission, config, seed = 0) {
  const c = requireC3(config);
  if (state.missionId !== mission.missionId || state.history.length !== state.completedDays || state.day !== state.completedDays + 1) throw new Error('Inconsistent mission state');
  const check = validateC3Plan(state, plan, config);
  if (!check.ok) throw new Error(check.reason);
  const missionDay = mission.days[state.day - 1];
  if (!missionDay || missionDay.day !== state.day || !Number.isInteger(missionDay.stormLevel) || missionDay.stormLevel < config.stormLevelRange[0] || missionDay.stormLevel > config.stormLevelRange[1]) throw new Error('Invalid archived storm record');
  const stormLevel = missionDay.stormLevel;
  const levels = state.roomLevels; // old levels affect today's outcome; upgrade activates tomorrow
  const extraLife = levels.lifeSupport - c.upgrades.initialLevel;
  const airUse = Math.max(c.upgrades.effects.lifeSupport.airUseFloor,
    config.airUse - extraLife * c.upgrades.effects.lifeSupport.airUseReductionPerLevel);
  const meters = {
    air: clamp(state.meters.air - check.airCost + plan.allocation.lifeSupport - airUse, config.meterMin, config.meterMax),
    supplies: clamp(state.meters.supplies - check.suppliesCost - config.foodUse + state.greenhouseYesterday, config.meterMin, config.meterMax),
    safety: 0,
  };
  const shieldBonus = plan.allocation.shield > config.allocationRanges.shield[0]
    ? (levels.shield - c.upgrades.initialLevel) * c.upgrades.effects.shield.extraProtectionPerLevel : 0;
  const damage = Math.max(config.meterMin, config.stormDamage[String(stormLevel)] - config.shieldProtection * plan.allocation.shield - shieldBonus)
    + (plan.allocation.shield === config.allocationRanges.shield[0] ? config.zeroShieldSafetyPenalty : 0);
  const calmRecovery = stormLevel === config.stormLevelRange[0] && plan.allocation.shield >= config.calmShieldRecoveryMinAllocation
    ? config.calmShieldRecovery : 0;
  const careGain = plan.care ? c.care.safetyGain : 0;
  meters.safety = clamp(state.meters.safety - damage + calmRecovery + careGain, config.meterMin, config.meterMax);

  const events = [];
  if (plan.care) events.push(`Crew care restored up to ${careGain} Crew Safety game units; Energy and Supplies were spent.`);
  if (plan.upgradeRoom) events.push(`${plan.upgradeRoom} upgrade constructed. Its benefit begins tomorrow.`);
  let active = state.expedition.active ? { ...state.expedition.active } : null;
  let completed = state.expedition.completed.map(entry => ({ ...entry }));
  if (plan.expedition) {
    const task = c.expeditions[plan.expedition];
    active = { kind: plan.expedition, startedDay: state.day, dueDay: state.day + task.duration };
    events.push(`${task.label} started; expected return after day ${active.dueDay}.`);
  }
  if (active && active.dueDay <= state.day) {
    const task = c.expeditions[active.kind];
    const reward = task.reward;
    if (reward.supplies) meters.supplies = clamp(meters.supplies + reward.supplies, config.meterMin, config.meterMax);
    if (reward.safety) meters.safety = clamp(meters.safety + reward.safety, config.meterMin, config.meterMax);
    completed = [...completed, { kind: active.kind, day: state.day }];
    events.push(`${task.label} returned. Reward applied in simplified game units.`);
  }
  const expeditionRewardResearch = active && active.dueDay <= state.day ? (c.expeditions[active.kind].reward.research ?? 0) : 0;
  if (active && active.dueDay <= state.day) active = null;

  const researchBonus = plan.allocation.science > config.allocationRanges.science[0]
    ? (levels.science - c.upgrades.initialLevel) * c.upgrades.effects.science.bonusPointsPerLevel : 0;
  const researchGained = plan.allocation.science * config.scienceScorePerAllocation + researchBonus + expeditionRewardResearch;
  const researchCost = check.upgrade?.points ?? 0;
  const research = {
    earned: state.research.earned + researchGained,
    available: state.research.available - researchCost + researchGained,
  };
  const roomLevels = { ...levels };
  if (plan.upgradeRoom) roomLevels[plan.upgradeRoom] += 1;
  const greenhouseYesterday = plan.allocation.greenhouse > config.allocationRanges.greenhouse[0]
    ? plan.allocation.greenhouse + (levels.greenhouse - c.upgrades.initialLevel) * c.upgrades.effects.greenhouse.extraSuppliesPerLevel
    : config.allocationRanges.greenhouse[0];

  let pending = state.comms.pending ? { ...state.comms.pending } : null;
  let lastAdvice = state.comms.lastAdvice ? jsonCopy(state.comms.lastAdvice) : null;
  if (plan.requestAdvice) {
    pending = { sentDay: state.day, dueDay: state.day + c3ReplyTurns(state, config), postponed: false };
    events.push('Research advice requested. The response requires simulated processing time.');
  }
  if (pending && state.day >= pending.dueDay) {
    const interference = stormLevel >= c.comms.interferenceStormLevel && !pending.postponed &&
      levels.comms < c.comms.interferenceImmuneLevel;
    if (interference) {
      pending = { ...pending, dueDay: state.day + c.comms.interferenceExtraTurns, postponed: true };
      events.push('Earth reply postponed once by SIMULATED storm interference.');
    } else {
      const nextDay = state.day + 1;
      const weatherEstimate = nextDay <= config.missionLengthDays
        ? c3WeatherEstimate(nextDay, mission, config, seed) : null;
      const provisional = { ...state, day: nextDay, meters, battery: check.batteryAfter, roomLevels, research };
      const advice = c3ChooseAdvice(provisional, weatherEstimate, config);
      lastAdvice = { ...advice, receivedDay: state.day, usableOnDay: nextDay };
      pending = null;
      events.push(`Earth advice received: ${advice.message}`);
    }
  }

  const completedDays = state.completedDays + 1;
  const depleted = METERS_C3.find(key => meters[key] <= config.failureMeterThreshold);
  let status = depleted ? 'failed' : 'running';
  let reason = depleted ?? null;
  if (status === 'running' && completedDays === config.missionLengthDays) {
    status = METERS_C3.every(key => meters[key] >= config.successMinMeter) ? 'succeeded' : 'failed';
    if (status === 'failed') reason = 'objectives-not-met';
  }
  const meterDeltas = Object.fromEntries(METERS_C3.map(key => [key, meters[key] - state.meters[key]]));
  const historyEntry = {
    day: state.day, date: missionDay.date, stormLevel,
    sourceIds: missionDay.events.map(e => e.sourceId),
    allocation: { ...plan.allocation },
    activities: { care: plan.care, requestAdvice: plan.requestAdvice, expedition: plan.expedition, upgradeRoom: plan.upgradeRoom, batteryCharge: plan.charge },
    meters: { ...meters }, meterDeltas,
    energy: { generated: check.generation, used: check.used, stored: check.charge, drawn: check.batteryDraw, batteryAfter: check.batteryAfter },
    research: { gained: researchGained, spent: researchCost, total: research.earned, available: research.available },
    events,
  };
  return {
    ...state,
    day: status === 'running' ? state.day + 1 : state.day,
    completedDays, status, reason,
    meters, research, roomLevels, greenhouseYesterday,
    battery: check.batteryAfter, lastCareDay: plan.care ? state.day : state.lastCareDay,
    comms: { pending, lastAdvice },
    expedition: { active, completed },
    history: [...state.history, historyEntry],
  };
}

export function c3Debrief(state, mission) {
  if (state.status === 'running' || state.missionId !== mission.missionId) throw new Error('Debrief requires a completed mission');
  return {
    status: state.status, reason: state.reason,
    daysCompleted: state.completedDays,
    meters: { ...state.meters },
    researchScore: state.research.earned, researchAvailable: state.research.available,
    upgrades: { ...state.roomLevels },
    expeditionsCompleted: state.expedition.completed.length,
    batteryRemaining: state.battery,
    pendingRequest: jsonCopy(state.comms.pending),
    source: mission.dataSource,
  };
}
