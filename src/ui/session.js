/**
 * Phase 4 (F1/F2/F3/F7): UI transition controller.
 * Delegates all mission rules and outcomes to Phase 3's pure game engine.
 * This module has no React or DOM dependency, so actions can be tested directly.
 */
import {
  createInitialState,
  createSeededRng,
  getPowerBudget,
  makeForecast,
  simulateDay,
  validateAllocation,
} from '../logic/game.js';

export const CONSUMER_LABELS = Object.freeze({
  lifeSupport: 'Life support',
  shield: 'Shield',
  greenhouse: 'Greenhouse',
  science: 'Science',
});

export function startingAllocation(config) {
  return Object.fromEntries(Object.keys(CONSUMER_LABELS)
    .map(name => [name, config.allocationRanges[name][0]]));
}

export function allocationPreview(allocation, day, config) {
  const budget = getPowerBudget(day, config);
  const total = Object.values(allocation).reduce((sum, value) => sum + value, 0);
  const validation = validateAllocation(allocation, day, config);
  return { budget, total, remaining: budget - total, ...validation };
}

// Deterministic forecast for this mission, not a live or scientific forecast.
// This uses the existing configuration day count as its stable seed; the UI
// never generates uncontrolled randomness or changes the forecast mid-day.
function forecastFor(day, mission, config) {
  return makeForecast(day, mission, createSeededRng(config.missionLengthDays), config);
}

export function initialSession(config, mission) {
  return {
    screen: 'briefing',
    game: createInitialState(config, mission),
    allocation: startingAllocation(config),
    forecast: null,
    reveal: null,
    error: null,
  };
}

export function reduceSession(state, action, config, mission) {
  switch (action.type) {
    case 'START':
      if (state.screen !== 'briefing') return state;
      return { ...state, screen: 'planning', forecast: forecastFor(state.game.day, mission, config) };

    case 'ALLOCATE': {
      if (state.screen !== 'planning') return state;
      if (!Object.hasOwn(CONSUMER_LABELS, action.consumer) ||
          !Number.isInteger(action.delta)) return state;
      const allocation = {
        ...state.allocation,
        [action.consumer]: state.allocation[action.consumer] + action.delta,
      };
      // Phase 3 owns the only rule that determines whether allocation is legal.
      if (!validateAllocation(allocation, state.game.day, config).ok) return state;
      return { ...state, allocation, error: null };
    }

    case 'COMMIT': {
      if (state.screen !== 'planning') return state;
      const check = validateAllocation(state.allocation, state.game.day, config);
      if (!check.ok) return { ...state, error: check.reason };
      try {
        const justPlayed = state.game.day;
        const game = simulateDay(state.game, state.allocation, mission, config);
        return {
          ...state,
          screen: 'reveal',
          game,
          error: null,
          reveal: {
            day: justPlayed,
            forecast: state.forecast,
            actual: mission.days[justPlayed - 1].stormLevel,
            events: mission.days[justPlayed - 1].events,
            meters: { ...game.meters },
            status: game.status,
          },
        };
      } catch (error) {
        // In particular, do not invent a day-10 outcome excluded by CLAUDE.md §4.1.
        const unresolved = String(error.message).includes('Unresolved final-day outcome');
        return { ...state, error: unresolved
          ? 'The final-day result needs a team decision. No outcome was recorded.'
          : `Cannot apply this turn: ${error.message}` };
      }
    }

    case 'CONTINUE':
      if (state.screen !== 'reveal') return state;
      if (state.game.status !== 'running') {
        return { ...state, screen: 'debrief', reveal: null };
      }
      return {
        ...state,
        screen: 'planning',
        allocation: startingAllocation(config),
        forecast: forecastFor(state.game.day, mission, config),
        reveal: null,
        error: null,
      };

    case 'RESTART':
      return initialSession(config, mission);

    default:
      return state;
  }
}
