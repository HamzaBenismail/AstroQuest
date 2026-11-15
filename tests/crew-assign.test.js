import { describe, it, expect } from 'vitest';
import { ROOMS_C3 } from '../src/logic/v3/engine.js';
import { CREW } from '../src/prep/crew.jsx';
import {
  homeAssignments, isRosterComplete, placeCrew, removeCrew, roomOf, specialistCount, unplacedCrew,
} from '../src/prep/assign.js';

describe('crew assignment', () => {
  it('gives every department exactly one trained astronaut', () => {
    expect(CREW).toHaveLength(ROOMS_C3.length);
    const homes = CREW.map(member => member.home);
    expect(new Set(homes).size).toBe(ROOMS_C3.length);
    for (const home of homes) expect(ROOMS_C3).toContain(home);
  });

  it('fills every room when everyone goes to their specialty', () => {
    const roster = homeAssignments();
    expect(isRosterComplete(roster)).toBe(true);
    expect(specialistCount(roster)).toBe(CREW.length);
    expect(unplacedCrew(roster)).toHaveLength(0);
  });

  it('swaps two placed astronauts instead of evicting one', () => {
    const roster = homeAssignments();
    const next = placeCrew(roster, 'greenhouse', 'ari');
    expect(next.greenhouse).toBe('ari');
    // Juno did not fall out of the roster: she took Ari's old post.
    expect(next.lifeSupport).toBe('juno');
    expect(isRosterComplete(next)).toBe(true);
    expect(Object.values(next)).toHaveLength(ROOMS_C3.length);
  });

  it('keeps a complete roster complete through any single move', () => {
    const roster = homeAssignments();
    for (const member of CREW) {
      for (const room of ROOMS_C3) {
        const next = placeCrew(roster, room, member.id);
        expect(isRosterComplete(next)).toBe(true);
        expect(new Set(Object.values(next)).size).toBe(CREW.length);
        expect(next[room]).toBe(member.id);
      }
    }
  });

  it('moves an unplaced astronaut into an empty department', () => {
    const next = placeCrew({}, 'science', 'sol');
    expect(next).toEqual({ science: 'sol' });
    expect(roomOf(next, 'sol')).toBe('science');
  });

  it('sends the occupant back to the tray when the newcomer has no post yet', () => {
    const partial = { science: 'sol' };
    const next = placeCrew(partial, 'science', 'kai');
    expect(next.science).toBe('kai');
    expect(roomOf(next, 'sol')).toBeNull();
  });

  it('leaves the roster alone for a no-op or an unknown id', () => {
    const roster = homeAssignments();
    expect(placeCrew(roster, 'lifeSupport', 'ari')).toBe(roster);
    expect(placeCrew(roster, 'lifeSupport', 'nobody')).toBe(roster);
    expect(placeCrew(roster, 'not-a-room', 'ari')).toBe(roster);
  });

  it('never mutates the roster it is given', () => {
    const roster = homeAssignments();
    const snapshot = JSON.stringify(roster);
    placeCrew(roster, 'comms', 'ari');
    removeCrew(roster, 'comms');
    expect(JSON.stringify(roster)).toBe(snapshot);
  });

  it('reports an incomplete roster while a department is still empty', () => {
    const roster = removeCrew(homeAssignments(), 'comms');
    expect(isRosterComplete(roster)).toBe(false);
    expect(unplacedCrew(roster).map(member => member.id)).toEqual(['milo']);
  });
});
