/** Presentation flow on top of the existing v3 reducer and pure resource engine. */
import { initC3Session, reduceC3Session, previewC3 } from '../v3/controller.js';
import { validateC3Plan } from '../../logic/v3/engine.js';
import { initialDiscoveryProgress, resolveDiscoveryDay, creditDiscoveryToSession, addLifetimeDiscoveryIds, sanitizeDiscoveryIds } from '../../logic/v4/discoveries.js';
import discoveryCatalog from '../../data/discoveries.js';
import {
  SHIP_IDS, DESTINATIONS, POWERED_ROOMS, ROOM_IDS, createCrewCandidates,
  selectCrewCandidate, MAX_CREW_PER_MISSION,
  placeCrew, crewInRoom, checkCrewStaffing, reconcilePlanWithCrew,
  validateCargo, applyCargoToInitialGame, dispatchExpeditionCrew,
  returnExpeditionCrew,
} from '../../logic/v4/crewRules.js';

export function initCrewExperience(config) {
  const options = config.reevaluation?.crewUI;
  if (!options?.enabled || config.reevaluation?.version !== 3) {
    throw new Error('Enable crewUI for the v3 game before starting');
  }
  return {
    stage: 'menu', ship: SHIP_IDS[0], destination: 'moon',
    cargo: { ...options.cargoDefaults },
    candidates: createCrewCandidates(options),
    crew: [], launchCrew: [], assemblyInitialized: false, pickedCrewId: null, hoverRoom: null, focusedRoom: 'lifeSupport',
    session: null, error: null,
    discoveryProgress: initialDiscoveryProgress(),
    lifetimeDiscoveryIds: [], collectionScope: null,
  };
}

const reportError = (state, reason) => ({ ...state, error: reason });

function applyPlanChange(state, changed, config) {
  if (state.session.screen !== 'planning') return state;
  const checked = validateC3Plan(state.session.game, changed, config);
  if (!checked.ok) return reportError(state, checked.reason);
  const staffing = checkCrewStaffing(state.crew, changed);
  if (!staffing.ok) return reportError(state, staffing.reason);
  return { ...state, session: { ...state.session, plan: changed, error: null }, error: null };
}

function startCrewSession(config, mission, options, cargo, roster) {
  const initial = reduceC3Session(initC3Session(config, mission), { type: 'START' }, config, mission);
  if (initial.screen !== 'planning') return null;
  const game = applyCargoToInitialGame(initial.game, cargo, config, options);
  let plan = reconcilePlanWithCrew(initial.plan, roster);
  // Each staffed production department begins with a small *valid* Power allocation.
  // The v3 validator remains authoritative; no Energy is created by staffing.
  for (const room of POWERED_ROOMS) {
    if (!crewInRoom(roster, room)) continue;
    const candidate = { ...plan, allocation: { ...plan.allocation,
      [room]: Math.min(options.defaultRoomEnergy, config.allocationRanges[room][1]),
    } };
    if (validateC3Plan(game, candidate, config).ok) plan = candidate;
  }
  return { ...initial, game, plan };
}

export function reduceCrewExperience(state, action, config, mission) {
  const options = config.reevaluation.crewUI;
  switch (action.type) {
    case 'RESET_SAVED_DISCOVERIES':
      // Main-menu archive only: a deliberate reset cannot delete current-run science or points.
      return state.stage === 'menu' && state.collectionScope === 'lifetime'
        ? { ...state, lifetimeDiscoveryIds: [] } : state;
    case 'HYDRATE_DISCOVERIES':
      return { ...state, lifetimeDiscoveryIds: sanitizeDiscoveryIds(action.ids, discoveryCatalog) };
    case 'OPEN_COLLECTION':
      return state.stage === 'menu'
        ? { ...state, collectionScope: 'lifetime' }
        : (state.stage === 'play' && state.session?.screen === 'debrief')
          ? { ...state, collectionScope: 'run' } : state;
    case 'CLOSE_COLLECTION':
      return { ...state, collectionScope: null };
    case 'DISMISS_DISCOVERY':
      return { ...state, discoveryProgress: { ...state.discoveryProgress, popupId: null } };
    case 'SELECT_SHIP':
      return state.stage === 'menu' && SHIP_IDS.includes(action.ship)
        ? { ...state, ship: action.ship, error: null } : state;
    case 'OPEN_PREPARATION':
      return state.stage === 'menu' ? { ...state, stage: 'preparation', error: null } : state;
    case 'BACK_TO_MENU':
      return { ...initCrewExperience(config), ship: state.ship, destination: state.destination,
        lifetimeDiscoveryIds: [...state.lifetimeDiscoveryIds] };
    case 'SELECT_DESTINATION':
      return state.stage === 'preparation' && DESTINATIONS.includes(action.destination)
        ? { ...state, destination: action.destination, error: null } : state;
    case 'SET_CARGO': {
      if (state.stage !== 'preparation' || !['air', 'supplies', 'battery'].includes(action.resource) || !Number.isInteger(action.delta)) return state;
      const cargo = { ...state.cargo, [action.resource]: state.cargo[action.resource] + action.delta };
      const check = validateCargo(cargo, config, options);
      return check.ok ? { ...state, cargo, error: null } : reportError(state, check.reason);
    }
    case 'OPEN_CREW_ASSEMBLY': {
      if (state.stage !== 'preparation') return state;
      const ready = validateCargo(state.cargo, config, options);
      if (!ready.ok) return reportError(state, ready.reason);
      const limit = Math.min(options.crewMax ?? MAX_CREW_PER_MISSION, MAX_CREW_PER_MISSION);
      const initialCrew = state.assemblyInitialized ? state.crew : state.candidates.slice(0, Math.min(5, limit)).map(c => ({...c, room: null}));
      return { ...state, stage: 'crew-assembly', crew: initialCrew.map(c => ({...c, room: null})), assemblyInitialized: true, pickedCrewId: null, hoverRoom: null, error: null };
    }
    case 'BACK_TO_PREPARATION':
      return state.stage === 'crew-assembly'
        ? { ...state, stage: 'preparation', pickedCrewId: null, hoverRoom: null, error: null }
        : state;
    case 'TOGGLE_CANDIDATE': {
      if (state.stage !== 'crew-assembly') return state;
      const limit = Math.min(options.crewMax ?? MAX_CREW_PER_MISSION, MAX_CREW_PER_MISSION);
      const result = selectCrewCandidate(state.crew, state.candidates, action.id, limit);
      return result.ok ? { ...state, crew: result.crew,
        pickedCrewId: result.crew.some(c => c.id === state.pickedCrewId) ? state.pickedCrewId : null,
        hoverRoom: null, error: null } : reportError(state, result.reason);
    }
    case 'LAUNCH': {
      if (state.stage !== 'crew-assembly') return state;
      const ready = validateCargo(state.cargo, config, options);
      if (!ready.ok) return reportError(state, ready.reason);
      if (!state.crew.length) return reportError(state, 'Choose at least one astronaut');
      // Crew Assembly is selection-only. Everyone lands in the dock for the child's first placement.
      const launchCrew = state.crew.map(c => ({...c, room: null, awayUntilDay: null}));
      const session = startCrewSession(config, mission, options, state.cargo, launchCrew);
      if (!session) return reportError(state, 'The mission could not start');
      return { ...state, stage: 'play', crew: launchCrew, launchCrew: launchCrew.map(c => ({ ...c })), session,
        discoveryProgress: initialDiscoveryProgress(), collectionScope: null,
        pickedCrewId: null, hoverRoom: null, error: null };
    }
    case 'PICK_CREW':
      if (state.stage !== 'play' || state.session?.screen !== 'planning' || !state.crew.some(c => c.id === action.id && c.awayUntilDay === null)) return state;
      return { ...state, pickedCrewId: action.force ? action.id : (state.pickedCrewId === action.id ? null : action.id), hoverRoom: null, error: null };
    case 'HOVER_ROOM':
      return state.stage === 'play' && state.session?.screen === 'planning' && (action.room === null || ROOM_IDS.includes(action.room))
        ? { ...state, hoverRoom: action.room } : state;
    case 'FOCUS_ROOM':
      return ROOM_IDS.includes(action.room) && state.stage === 'play'
        ? { ...state, focusedRoom: action.room, error: null } : state;
    case 'PLACE_CREW': {
      if (state.stage !== 'play' || state.session?.screen !== 'planning') return state;
      const id = action.id || state.pickedCrewId;
      if (!id) return reportError(state, 'Select an astronaut first');
      const result = placeCrew(state.crew, id, action.room);
      if (!result.ok) return reportError(state, result.reason);
      let plan = reconcilePlanWithCrew(state.session.plan, result.crew);
      // On placement, start a staffed production room at one Energy if feasible.
      if (action.room && POWERED_ROOMS.includes(action.room) && !crewInRoom(state.crew, action.room)) {
        const candidate = { ...plan, allocation: { ...plan.allocation, [action.room]: Math.min(options.defaultRoomEnergy, config.allocationRanges[action.room][1]) } };
        if (validateC3Plan(state.session.game, candidate, config).ok) plan = candidate;
      }
      return { ...state, crew: result.crew,
        session: { ...state.session, plan, error: null },
        pickedCrewId: null, hoverRoom: null,
        focusedRoom: action.room || state.focusedRoom, error: null };
    }
    case 'SET_POWER': {
      if (state.stage !== 'play' || state.session?.screen !== 'planning' || !POWERED_ROOMS.includes(action.room)) return state;
      if (!crewInRoom(state.crew, action.room)) return reportError(state, 'Assign an astronaut before powering this department');
      const range = config.allocationRanges[action.room];
      if (!Number.isInteger(action.amount) || action.amount < range[0] || action.amount > range[1]) return reportError(state, 'Invalid Energy amount');
      return applyPlanChange(state, { ...state.session.plan, allocation: { ...state.session.plan.allocation, [action.room]: action.amount } }, config);
    }
    case 'TOGGLE_ACTION': {
      if (state.stage !== 'play' || state.session?.screen !== 'planning') return state;
      const types = { CARE: 'care', ADVICE: 'requestAdvice', CHARGE: 'charge', UPGRADE: 'upgradeRoom', EXPEDITION: 'expedition' };
      if (!Object.hasOwn(types, action.action)) return state;
      const old = state.session.plan;
      let next;
      switch (action.action) {
        case 'CARE': next = { ...old, care: !old.care }; break;
        case 'ADVICE': next = { ...old, requestAdvice: !old.requestAdvice }; break;
        case 'CHARGE': next = { ...old, charge: old.charge === action.amount ? 0 : action.amount }; break;
        case 'UPGRADE': next = { ...old, upgradeRoom: old.upgradeRoom === action.room ? null : action.room }; break;
        case 'EXPEDITION': next = { ...old, expedition: old.expedition === action.kind ? null : action.kind }; break;
        default: return state;
      }
      return applyPlanChange(state, next, config);
    }
    case 'COMMIT_DAY': {
      if (state.stage !== 'play' || state.session?.screen !== 'planning') return state;
      const staffing = checkCrewStaffing(state.crew, state.session.plan);
      if (!staffing.ok) return reportError(state, staffing.reason);
      const budget = previewC3(state.session, config);
      if (!budget.ok) return reportError(state, budget.reason);
      const day = state.session.game.day;
      const simulated = reduceC3Session(state.session, { type: 'COMMIT' }, config, mission);
      if (simulated.screen !== 'report') return reportError(state, simulated.error || 'The day could not be completed');
      // Only actual, completed Science Lab work by its own specialist earns a bonus.
      // A generic worker earns the base Science Points, never this discovery bonus.
      const discovery = resolveDiscoveryDay(state.discoveryProgress, state.crew, state.session.plan, config, discoveryCatalog, state.lifetimeDiscoveryIds);
      const session = creditDiscoveryToSession(simulated, discovery.reward);
      return {
        ...state, session, discoveryProgress: discovery.progress,
        lifetimeDiscoveryIds: discovery.reward
          ? addLifetimeDiscoveryIds(state.lifetimeDiscoveryIds, [discovery.reward.id], discoveryCatalog)
          : state.lifetimeDiscoveryIds,
        crew: dispatchExpeditionCrew(state.crew, state.session.plan, day, config),
        pickedCrewId: null, hoverRoom: null, error: null,
      };
    }
    case 'CONTINUE': {
      if (state.stage !== 'play' || state.session?.screen !== 'report') return state;
      const session = reduceC3Session(state.session, { type: 'CONTINUE' }, config, mission);
      return { ...state, session, crew: returnExpeditionCrew(state.crew, session.game.completedDays), error: null };
    }
    case 'RETRY': {
      // Same spacecraft, destination and cargo; all crew/jobs/resources reset.
      if (state.stage !== 'play' || state.session.screen !== 'debrief') return state;
      const roster = state.launchCrew.map(c => ({ ...c, awayUntilDay: null }));
      const session = startCrewSession(config, mission, options, state.cargo, roster);
      if (!session) return reportError(state, 'Could not restart your mission');
      return { ...state, session, crew: roster, discoveryProgress: initialDiscoveryProgress(), collectionScope: null, pickedCrewId: null,
        hoverRoom: null, focusedRoom: 'lifeSupport', error: null };
    }
    default: return state;
  }
}
