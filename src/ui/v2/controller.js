/** Phase B UI orchestration. All calculations and outcomes are in the pure v2 engine. */
import {
  initialPlan, createV2State, validateV2Plan, simulateV2Day,
  v2Forecast, selectUpgrade, energyForDay, requireV2,
} from '../../logic/v2/engine.js';

export const ROOMS = Object.freeze([
  { id: 'lifeSupport', name: 'Life Support', action: 'lifeSupport', desc: 'Keeps the air system running.' },
  { id: 'greenhouse', name: 'Greenhouse', action: 'greenhouse', desc: 'Grows food. Results arrive tomorrow.' },
  { id: 'power', name: 'Power Station', action: null, desc: 'Review where your Energy goes.' },
  { id: 'science', name: 'Science Lab', action: 'science', desc: 'Build research progress for one upgrade.' },
  { id: 'shield', name: 'Storm Shelter', action: 'shield', desc: 'Prepare the shelter before a storm.' },
  { id: 'comms', name: 'Communications', action: null, desc: 'Request information from Earth.' },
]);

export function initV2Session(config, mission) {
  requireV2(config);
  return {
    screen: 'briefing',
    game: createV2State(config, mission),
    allocation: initialPlan(config),
    requestKind: null,
    selectedRoom: 'lifeSupport',
    seed: config.missionLengthDays,
    forecast: null,
    reveal: null,
    error: null,
  };
}

export function previewV2(session, config) {
  if (session.game.status !== 'running') return { ok: false, reason: 'Mission has ended' };
  return validateV2Plan(session.game, session.allocation, session.requestKind, config);
}

const resetPlanning = (state, config, mission) => ({
  ...state, screen: 'planning', allocation: initialPlan(config), requestKind: null,
  forecast: v2Forecast(state.game.day, state.game, mission, config, state.seed),
  reveal: null, error: null,
});

export function reduceV2Session(state, action, config, mission) {
  switch (action.type) {
    case 'START':
      return state.screen === 'briefing' ? resetPlanning(state, config, mission) : state;
    case 'SELECT_ROOM':
      return state.screen === 'planning' && ROOMS.some(room => room.id === action.room)
        ? { ...state, selectedRoom: action.room } : state;
    case 'ALLOCATE': {
      if (state.screen !== 'planning' || !Object.hasOwn(state.allocation, action.consumer) || !Number.isInteger(action.delta)) return state;
      const allocation = { ...state.allocation, [action.consumer]: state.allocation[action.consumer] + action.delta };
      const checked = validateV2Plan(state.game, allocation, state.requestKind, config);
      if (!checked.ok) return { ...state, error: checked.reason };
      return { ...state, allocation, error: null };
    }
    case 'REQUEST': {
      if (state.screen !== 'planning') return state;
      const requestKind = state.requestKind === action.kind ? null : action.kind;
      const checked = validateV2Plan(state.game, state.allocation, requestKind, config);
      if (!checked.ok) return { ...state, error: checked.reason };
      return { ...state, requestKind, error: null };
    }
    case 'COMMIT': {
      if (state.screen !== 'planning') return state;
      const validation = previewV2(state, config);
      if (!validation.ok) return { ...state, error: validation.reason };
      try {
        const day = state.game.day;
        const game = simulateV2Day(state.game, state.allocation, state.requestKind, mission, config, state.forecast);
        return {
          ...state, screen: 'report', game, error: null,
          reveal: {
            day, forecast: state.forecast, realLevel: mission.days[day - 1].stormLevel,
            events: mission.days[day - 1].events,
            before: state.game.meters, after: game.meters,
            history: game.history.at(-1), status: game.status,
          },
        };
      } catch (error) { return { ...state, error: error.message }; }
    }
    case 'CONTINUE': {
      if (state.screen !== 'report') return state;
      if (state.game.status !== 'running') return { ...state, screen: 'debrief', reveal: null };
      const v = config.reevaluation;
      if (!state.game.upgrade && state.game.researchTotal >= v.research.unlockThreshold && state.game.day <= config.missionLengthDays) {
        return { ...state, screen: 'upgrade', reveal: null };
      }
      return resetPlanning(state, config, mission);
    }
    case 'CHOOSE_UPGRADE': {
      if (state.screen !== 'upgrade') return state;
      try {
        const game = selectUpgrade(state.game, action.kind, config);
        return resetPlanning({ ...state, game }, config, mission);
      } catch (error) { return { ...state, error: error.message }; }
    }
    case 'RESTART':
      return initV2Session(config, mission);
    default: return state;
  }
}

export function planningMetrics(session, config) {
  const energy = energyForDay(session.game.day, config);
  const preview = previewV2(session, config);
  return { energy, preview };
}
