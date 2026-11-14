/** React-independent v3 UI state transitions. Only src/logic/v3 determines outcomes. */
import { createC3State, createC3Plan, validateC3Plan, simulateC3Day, ROOMS_C3 } from '../../logic/v3/engine.js';

export function initC3Session(config, mission) {
  return {
    screen: 'briefing',
    game: createC3State(config, mission),
    plan: createC3Plan(config),
    selectedRoom: 'lifeSupport',
    seed: config.missionLengthDays, // fixed, deterministic per playthrough
    reveal: null,
    error: null,
  };
}

export function previewC3(session, config) {
  return session.game.status === 'running'
    ? validateC3Plan(session.game, session.plan, config)
    : { ok: false, reason: 'Mission is finished' };
}

function tryPlanChange(session, config, change) {
  const plan = { ...session.plan, ...change };
  const check = validateC3Plan(session.game, plan, config);
  return check.ok ? { ...session, plan, error: null } : { ...session, error: check.reason };
}

export function reduceC3Session(session, action, config, mission) {
  switch (action.type) {
    case 'START':
      return session.screen === 'briefing' ? { ...session, screen: 'planning', error: null } : session;
    case 'SELECT_ROOM':
      return session.screen === 'planning' && ROOMS_C3.includes(action.room)
        ? { ...session, selectedRoom: action.room, error: null } : session;
    case 'ALLOCATE': {
      if (session.screen !== 'planning' || !Object.hasOwn(session.plan.allocation, action.consumer) || !Number.isInteger(action.delta)) return session;
      return tryPlanChange(session, config, { allocation: {
        ...session.plan.allocation, [action.consumer]: session.plan.allocation[action.consumer] + action.delta,
      } });
    }
    case 'CHARGE':
      return session.screen === 'planning' && Number.isInteger(action.delta)
        ? tryPlanChange(session, config, { charge: session.plan.charge + action.delta }) : session;
    case 'CARE':
      return session.screen === 'planning' ? tryPlanChange(session, config, { care: !session.plan.care }) : session;
    case 'ADVICE':
      return session.screen === 'planning' ? tryPlanChange(session, config, { requestAdvice: !session.plan.requestAdvice }) : session;
    case 'EXPEDITION':
      return session.screen === 'planning' ? tryPlanChange(session, config, {
        expedition: session.plan.expedition === action.kind ? null : action.kind,
      }) : session;
    case 'UPGRADE':
      return session.screen === 'planning' ? tryPlanChange(session, config, {
        upgradeRoom: session.plan.upgradeRoom === action.room ? null : action.room,
      }) : session;
    case 'COMMIT': {
      if (session.screen !== 'planning') return session;
      const check = previewC3(session, config);
      if (!check.ok) return { ...session, error: check.reason };
      try {
        const day = session.game.day;
        const next = simulateC3Day(session.game, session.plan, mission, config, session.seed);
        return {
          ...session, game: next, screen: 'report', error: null,
          reveal: {
            day,
            history: next.history.at(-1),
            before: { ...session.game.meters }, after: { ...next.meters },
            sourceEvents: mission.days[day - 1].events.map(e => ({ ...e })),
          },
        };
      } catch (error) {
        return { ...session, error: error.message };
      }
    }
    case 'CONTINUE':
      if (session.screen !== 'report') return session;
      return session.game.status !== 'running'
        ? { ...session, screen: 'debrief', reveal: null }
        : { ...session, screen: 'planning', plan: createC3Plan(config), reveal: null, error: null };
    case 'RESTART':
      return initC3Session(config, mission);
    default:
      return session;
  }
}
