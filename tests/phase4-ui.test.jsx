import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import config from '../src/data/config.json';
import {
  initialSession, reduceSession, allocationPreview,
} from '../src/ui/session.js';
import DayScreen from '../src/ui/DayScreen.jsx';
import BriefingScreen from '../src/ui/BriefingScreen.jsx';
import DebriefScreen from '../src/ui/DebriefScreen.jsx';

// Synthetic in-memory fixtures: NEVER included in src/data/missions/ or represented as NASA data.
function testMission() {
  return {
    missionId: 'phase4-synthetic-only',
    dataSource: 'TEST FIXTURE ONLY',
    days: Array.from({ length: config.missionLengthDays }, (_, i) => ({
      day: i + 1, date: `test-day-${i + 1}`, stormLevel: config.stormLevelRange[0], events: [],
    })),
  };
}
const reduce = (state, type, mission, extra = {}) => reduceSession(state, { type, ...extra }, config, mission);
function plan(state, mission, values) {
  for (const [consumer, count] of Object.entries(values)) {
    for (let i = 0; i < count; i++) state = reduce(state, 'ALLOCATE', mission, { consumer, delta: 1 });
  }
  return state;
}

describe('F1/F2/F3/F7 — Phase 4 interaction controller and screens', () => {
  it('shows a briefing before the mission begins', () => {
    const mission = testMission();
    const initial = initialSession(config, mission);
    expect(initial.screen).toBe('briefing');
    const html = renderToStaticMarkup(<BriefingScreen config={config} mission={mission} onStart={() => {}}/>);
    expect(html).toContain('Start mission');
    expect(html).toContain('10 days');
    expect(html).toContain('game units');
  });

  it('blocks allocations above both daily budget and per-consumer maximum', () => {
    const mission = testMission();
    let state = reduce(initialSession(config, mission), 'START', mission);
    state = plan(state, mission, { lifeSupport: 4, shield: 3, greenhouse: 3 });
    expect(allocationPreview(state.allocation, state.game.day, config).total).toBe(10);
    const afterCap = reduce(state, 'ALLOCATE', mission, { consumer: 'science', delta: 1 });
    expect(afterCap).toBe(state); // no overspending
    const perConsumer = reduce(state, 'ALLOCATE', mission, { consumer: 'shield', delta: 1 });
    expect(perConsumer).toBe(state);
    const html = renderToStaticMarkup(<DayScreen config={config} session={state}
      onAllocate={() => {}} onCommit={() => {}} onRestart={() => {}}/>);
    expect(html).toContain('Power used:');
    expect(html).toContain('10 / 10');
    expect(html).toContain('Increase Science power');
    expect(html).toContain('disabled=""');
  });

  it('applies daytime and night budgets and reveals the actual storm level after commit', () => {
    const mission = testMission();
    let state = reduce(initialSession(config, mission), 'START', mission);
    state = plan(state, mission, { lifeSupport: 3, shield: 1, greenhouse: 2 });
    state = reduce(state, 'COMMIT', mission);
    expect(state.screen).toBe('reveal');
    expect(state.reveal.day).toBe(1);
    expect(state.reveal.actual).toBe(config.stormLevelRange[0]);
    state = reduce(state, 'CONTINUE', mission);
    expect(state.screen).toBe('planning');
    expect(state.game.day).toBe(2);
    expect(allocationPreview(state.allocation, state.game.day, config).total).toBe(0);
    for (let day = 2; day <= 4; day++) {
      state = plan(state, mission, { lifeSupport: 3, shield: 1, greenhouse: 2 });
      state = reduce(state, 'COMMIT', mission);
      state = reduce(state, 'CONTINUE', mission);
    }
    expect(state.game.day).toBe(5);
    expect(allocationPreview(state.allocation, 5, config).budget).toBe(7);
    state = plan(state, mission, { lifeSupport: 4, shield: 3 });
    expect(reduce(state, 'ALLOCATE', mission, { consumer: 'science', delta: 1 })).toBe(state);
  });

  it('reaches a 10-day success, displays a debrief and restarts without leftover state', () => {
    const mission = testMission();
    let state = reduce(initialSession(config, mission), 'START', mission);
    while (state.game.status === 'running') {
      state = plan(state, mission, { lifeSupport: 3, shield: 1, greenhouse: 2, science: 1 });
      state = reduce(state, 'COMMIT', mission);
      expect(state.screen).toBe('reveal');
      state = reduce(state, 'CONTINUE', mission);
    }
    expect(state.game.completedDays).toBe(config.missionLengthDays);
    expect(state.game.status).toBe('succeeded');
    expect(state.screen).toBe('debrief');
    const html = renderToStaticMarkup(<DebriefScreen config={config} game={state.game} mission={mission} onRestart={() => {}}/>);
    expect(html).toContain('Mission complete!');
    expect(html).toContain('Try again');
    const restarted = reduce(state, 'RESTART', mission);
    expect(restarted).toEqual(initialSession(config, mission));
    expect(restarted.game.history).toHaveLength(0);
  });

  it('reaches a loss with no power allocated and shows an instructive debrief', () => {
    const mission = testMission();
    let state = reduce(initialSession(config, mission), 'START', mission);
    while (state.game.status === 'running') {
      state = reduce(state, 'COMMIT', mission);
      state = reduce(state, 'CONTINUE', mission);
    }
    expect(state.game.status).toBe('failed');
    expect(state.game.reason).toBe('air');
    const html = renderToStaticMarkup(<DebriefScreen config={config} game={state.game} mission={mission} onRestart={() => {}}/>);
    expect(html).toContain('Mission ended early.');
    expect(html).toContain('life support');
  });

  it('does not invent a terminal outcome when the final-day rule is undefined', () => {
    const mission = testMission();
    let state = reduce(initialSession(config, mission), 'START', mission);
    for (let i = 0; i < config.missionLengthDays - 1; i++) {
      state = plan(state, mission, { lifeSupport: 3, shield: 1, greenhouse: 2 });
      state = reduce(state, 'COMMIT', mission);
      state = reduce(state, 'CONTINUE', mission);
    }
    state = { ...state, game: { ...state.game, meters: { ...state.game.meters, air: 2 } } };
    state = plan(state, mission, { lifeSupport: 3, shield: 1, greenhouse: 2 });
    const after = reduce(state, 'COMMIT', mission);
    expect(after.screen).toBe('planning');
    expect(after.error).toMatch(/team decision/);
  });
});
