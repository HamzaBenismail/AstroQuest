import { describe, it, expect } from 'vitest';
import { budgetUsed, simulateNextSol, validAllocation } from './simulation';
import { initialState } from './types';

describe('mission simulation', () => {
  it('does not allow over-budget allocations', () => {
    expect(validAllocation({ lifeSupport: 5, communications: 3, science: 3 }, false)).toBe(false);
    expect(budgetUsed({ lifeSupport: 4, communications: 2, science: 2 }, true)).toBe(10);
  });
  it('advances days and accounts for consumption', () => {
    const next = simulateNextSol(initialState);
    expect(next.day).toBe(2);
    expect(next.oxygen).toBe(72);
    expect(next.research).toBe(5);
  });
  it('shelter cuts storm risk', () => {
    const day2 = simulateNextSol(initialState);
    const unshielded = simulateNextSol(day2);
    const shielded = simulateNextSol({ ...day2, shelterPrepared: true });
    expect(unshielded.radiation - day2.radiation).toBe(75);
    expect(shielded.radiation - day2.radiation).toBe(6);
  });
  it('reaches a successful outcome if shelter is prepared before Sol 3', () => {
    let state = simulateNextSol(structuredClone(initialState));
    state = { ...state, shelterPrepared: true };
    for (let i = 0; i < 3; i++) state = simulateNextSol(state);
    expect(state.status).toBe('won');
    expect(state.day).toBe(5);
  });
});
