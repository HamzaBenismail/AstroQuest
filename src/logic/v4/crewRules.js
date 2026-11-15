/**
 * Pure crew/cargo rules for the Reevaluation C (v3) engine.
 * No DOM, React, network, randomness, or NASA data in this module.
 * The v3 engine remains authoritative for power, resources, upgrades and storms.
 */
export const ROOM_IDS = Object.freeze(['lifeSupport', 'greenhouse', 'science', 'power', 'shield', 'comms']);
export const POWERED_ROOMS = Object.freeze(['lifeSupport', 'greenhouse', 'science', 'shield']);
export const SHIP_IDS = Object.freeze(['explorer', 'titan', 'horizon', 'nova']);
export const DESTINATIONS = Object.freeze(['moon', 'mars']);

/** Six named applicants, no gameplay bonuses: specialties are placement suggestions only. */
export const CREW_CANDIDATES = Object.freeze([
  { id:'crew-1', name:'Ari', specialty:'lifeSupport', role:'Life support engineer' },
  { id:'crew-2', name:'Juno', specialty:'greenhouse', role:'Botanist' },
  { id:'crew-3', name:'Rhea', specialty:'power', role:'Power technician' },
  { id:'crew-4', name:'Sol', specialty:'science', role:'Space biology researcher' },
  { id:'crew-5', name:'Kai', specialty:'shield', role:'Safety officer' },
  { id:'crew-6', name:'Milo', specialty:'comms', role:'Communications officer' },
]);
export const MAX_CREW_PER_MISSION = 6;

export function createCrewCandidates(options = {}) {
  const customNames = options.candidateNames;
  return CREW_CANDIDATES.map((person, index) => ({
    ...person,
    name: customNames?.[index] || person.name,
    suit: index,
    room: null,
    awayUntilDay: null,
  }));
}

export function selectCrewCandidate(roster, candidates, id, limit = MAX_CREW_PER_MISSION) {
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_CREW_PER_MISSION) {
    return { ok: false, reason: 'Invalid crew limit' };
  }
  const candidate = candidates.find(c => c.id === id);
  if (!candidate) return { ok: false, reason: 'Unknown astronaut candidate' };
  if (roster.some(c => c.id === id)) {
    return { ok: true, crew: roster.filter(c => c.id !== id).map(c => ({ ...c })), reason: null };
  }
  if (roster.length >= limit) return { ok: false, reason: `You can take up to ${limit} astronauts` };
  return { ok: true, crew: [...roster.map(c => ({ ...c })), { ...candidate, room: null, awayUntilDay: null }], reason: null };
}

export function assignSpecialties(roster) {
  // Distinct specialties and unique rooms. No unearned skill bonus is introduced.
  return roster.map(member => ({ ...member, room: member.specialty }));
}

export function createCrewRoster(options) {
  const count = options?.crewCount;
  if (!Number.isInteger(count) || count < 1 || count > MAX_CREW_PER_MISSION) throw new RangeError('Invalid crew count');
  return Array.from({ length: count }, (_, i) => ({
    id: `crew-${i + 1}`,
    name: options.crewNames?.[i] || `Astronaut ${i + 1}`,
    suit: i % MAX_CREW_PER_MISSION,
    room: null,
    awayUntilDay: null,
  }));
}

export function isAvailable(member) {
  return member && member.awayUntilDay == null;
}

export function placeCrew(roster, memberId, targetRoom) {
  if (!Array.isArray(roster) || !roster.length) return { ok: false, reason: 'Missing crew' };
  if (targetRoom !== null && !ROOM_IDS.includes(targetRoom)) return { ok: false, reason: 'Unknown room' };
  const member = roster.find(c => c.id === memberId);
  if (!member) return { ok: false, reason: 'Unknown astronaut' };
  if (!isAvailable(member)) return { ok: false, reason: 'This astronaut is on an expedition' };
  if (targetRoom && roster.some(c => c.id !== memberId && c.room === targetRoom && isAvailable(c))) {
    return { ok: false, reason: 'Only one astronaut can work in each department' };
  }
  return {
    ok: true,
    crew: roster.map(c => c.id === memberId ? { ...c, room: targetRoom } : { ...c }),
    previousRoom: member.room,
    reason: null,
  };
}

export function crewInRoom(roster, room) {
  return roster.some(member => member.room === room && isAvailable(member));
}

export function freeCrewMember(roster) {
  return roster.find(member => isAvailable(member) && member.room === null) ?? null;
}

/**
 * Crew assignments are a real constraint, checked before calling the v3 engine.
 * The existing v3 validator still decides whether the numerical plan is legal.
 */
export function checkCrewStaffing(roster, plan) {
  if (!plan || !plan.allocation) return { ok: false, reason: 'Missing daily plan' };
  for (const room of POWERED_ROOMS) {
    if (plan.allocation[room] > 0 && !crewInRoom(roster, room)) {
      return { ok: false, reason: `Place an astronaut in ${room} before adding Energy` };
    }
  }
  if (plan.care && !crewInRoom(roster, 'lifeSupport')) return { ok: false, reason: 'Crew care needs a Life Support worker' };
  if (plan.charge > 0 && !crewInRoom(roster, 'power')) return { ok: false, reason: 'Charging needs a Power Station worker' };
  if (plan.requestAdvice && !crewInRoom(roster, 'comms')) return { ok: false, reason: 'Earth messages need a Communications worker' };
  if (plan.upgradeRoom && !crewInRoom(roster, plan.upgradeRoom)) return { ok: false, reason: 'Assign a worker to build this room upgrade' };
  if (plan.expedition && !freeCrewMember(roster)) return { ok: false, reason: 'Keep one astronaut at the crew dock for the expedition' };
  return { ok: true, reason: null };
}

/** When a worker leaves, power and related actions return to the unallocated pool. */
export function reconcilePlanWithCrew(plan, roster) {
  const allocation = { ...plan.allocation };
  for (const room of POWERED_ROOMS) if (!crewInRoom(roster, room)) allocation[room] = 0;
  return {
    ...plan, allocation,
    care: Boolean(plan.care && crewInRoom(roster, 'lifeSupport')),
    charge: crewInRoom(roster, 'power') ? plan.charge : 0,
    requestAdvice: Boolean(plan.requestAdvice && crewInRoom(roster, 'comms')),
    upgradeRoom: plan.upgradeRoom && crewInRoom(roster, plan.upgradeRoom) ? plan.upgradeRoom : null,
    expedition: freeCrewMember(roster) ? plan.expedition : null,
  };
}

export function dispatchExpeditionCrew(roster, plan, day, config) {
  if (!plan.expedition) return roster.map(c => ({ ...c }));
  const member = freeCrewMember(roster);
  const spec = config.reevaluation.c3.expeditions[plan.expedition];
  if (!member || !spec) throw new Error('An available astronaut and valid expedition are required');
  return roster.map(c => c.id === member.id
    ? { ...c, room: null, awayUntilDay: day + spec.duration }
    : { ...c });
}

export function returnExpeditionCrew(roster, completedDay) {
  return roster.map(c => c.awayUntilDay !== null && c.awayUntilDay <= completedDay
    ? { ...c, room: null, awayUntilDay: null } : { ...c });
}

export function validateCargo(cargo, config, settings) {
  const capacity = settings.cargoCapacity;
  const baseBattery = config.reevaluation.c3.battery.baseCapacity;
  for (const key of ['air', 'supplies', 'battery']) {
    if (!Number.isInteger(cargo?.[key]) || cargo[key] < 0) return { ok: false, reason: `Invalid ${key} cargo` };
  }
  if (cargo.air > config.meterMax || cargo.supplies > config.meterMax || cargo.battery > baseBattery) {
    return { ok: false, reason: 'Cargo exceeds its storage limit' };
  }
  if (cargo.air < settings.minimumAir || cargo.supplies < settings.minimumSupplies) {
    return { ok: false, reason: 'Pack enough Air and Supplies for the crew' };
  }
  const used = cargo.air + cargo.supplies + cargo.battery;
  if (used > capacity) return { ok: false, reason: 'Cargo capacity exceeded', used, capacity };
  return { ok: true, used, capacity, left: capacity - used, reason: null };
}

/** The v3 initial state is copied, not mutated; game rules remain inside the engine. */
export function applyCargoToInitialGame(game, cargo, config, settings) {
  const valid = validateCargo(cargo, config, settings);
  if (!valid.ok) throw new Error(valid.reason);
  if (game.day !== 1 || game.completedDays !== 0 || game.status !== 'running') {
    throw new Error('Cargo can only be loaded before Day 1');
  }
  return {
    ...game,
    meters: { ...game.meters, air: cargo.air, supplies: cargo.supplies },
    battery: cargo.battery,
  };
}
