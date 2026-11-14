/**
 * F3 final acceptance driver. Requires an APPROVED Phase 2 DONKI mission.
 * This is verification code, not part of the browser bundle.
 * Run: node tests/phase3-real-driver.mjs
 *
 * Finds whether a survival-only strategy exists against the archived storm levels.
 * Science is deliberately zero in this reachability search, not a score optimization.
 * All outcomes use the team's frozen equations; no data is mocked here.
 */
import { readdirSync, readFileSync } from 'node:fs';
import config from '../src/data/config.json' with { type: 'json' };
import { validateMission } from '../scripts/donki-utils.js';
import { createInitialState, getPowerBudget, validateAllocation, simulateDay } from '../src/logic/game.js';

function availableAllocations(day) {
  const allocations = [];
  const limits = config.allocationRanges;
  const budget = getPowerBudget(day, config);
  for (let lifeSupport = limits.lifeSupport[0]; lifeSupport <= limits.lifeSupport[1]; lifeSupport++) {
    for (let shield = limits.shield[0]; shield <= limits.shield[1]; shield++) {
      for (let greenhouse = limits.greenhouse[0]; greenhouse <= limits.greenhouse[1]; greenhouse++) {
        const allocation = { lifeSupport, shield, greenhouse, science: limits.science[0] };
        if (lifeSupport + shield + greenhouse + allocation.science <= budget &&
            validateAllocation(allocation, day, config).ok) allocations.push(allocation);
      }
    }
  }
  // Higher life support and greenhouse first, since no science score is sought here.
  return allocations.reverse();
}

function findSuccessfulMission(mission) {
  const visited = new Set();
  const choicesByDay = Array.from({ length: config.missionLengthDays }, (_, i) => availableAllocations(i + 1));
  function dfs(state) {
    if (state.status === 'succeeded') return state;
    if (state.status === 'failed') return null;
    const key = `${state.day}/${state.meters.air}/${state.meters.food}/${state.meters.safety}/${state.greenhouseYesterday}`;
    if (visited.has(key)) return null;
    for (const choice of choicesByDay[state.day - 1]) {
      try {
        const next = simulateDay(state, choice, mission, config);
        const solution = dfs(next);
        if (solution) return solution;
      } catch (error) {
        // The undefined end-of-mission threshold remains a documented team decision.
        if (!String(error.message).includes('Unresolved final-day outcome')) throw error;
      }
    }
    visited.add(key);
    return null;
  }
  return dfs(createInitialState(config, mission));
}

if (config.stormMapping?.status !== 'approved') {
  process.stderr.write('BLOCKED: Phase 2 storm mapping has not been approved. Do not bypass this gate.\n');
  process.exitCode = 2;
} else {
  const folder = new URL('../src/data/missions/', import.meta.url);
  const names = readdirSync(folder).filter(name => name.endsWith('.json'));
  if (names.length === 0) {
    process.stderr.write('BLOCKED: no embedded, approved Phase 2 mission JSON exists.\n');
    process.exitCode = 2;
  } else {
    for (const name of names) {
      const mission = JSON.parse(readFileSync(new URL(name, folder), 'utf8'));
      validateMission(mission, config);
      // This is a search of actual embedded game-level values, not proof of scientific realism.
      const success = findSuccessfulMission(mission);
      const zero = { lifeSupport: 0, shield: 0, greenhouse: 0, science: 0 };
      let failure = createInitialState(config, mission);
      while (failure.status === 'running') failure = simulateDay(failure, zero, mission, config);
      process.stdout.write(`${name}: failure=${failure.status} (${failure.reason || 'none'}), success=${success?.status ?? 'not found'}\n`);
      if (!success || failure.status !== 'failed') {
        process.stderr.write('GATE NOT MET: win and loss must both be reachable with the frozen rules. Revisit balance with team approval.\n');
        process.exitCode = 1;
      }
    }
  }
}
