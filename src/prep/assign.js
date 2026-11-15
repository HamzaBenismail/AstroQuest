/**
 * Who works where.
 *
 * `assignments` maps a department key to a crew id. There is one astronaut per
 * department, so a finished roster is a one-to-one match and no department is
 * ever closed.
 *
 * Every move goes through `placeCrew`, which SWAPS rather than evicts: moving
 * someone into an occupied department sends that department's astronaut to the
 * post the newcomer just left. A complete roster therefore stays complete, in
 * mission prep and mid-mission alike, and a child can never accidentally shut a
 * room by dragging the wrong person.
 */
import { ROOMS_C3 } from '../logic/v3/engine.js';
import { CREW } from './crew.jsx';

export function placeCrew(assignments, room, crewId) {
  if (!ROOMS_C3.includes(room) || !CREW.some(member => member.id === crewId)) return assignments;
  if (assignments[room] === crewId) return assignments;

  const previousRoom = Object.keys(assignments).find(key => assignments[key] === crewId);
  const occupant = assignments[room];
  const next = { ...assignments, [room]: crewId };

  if (previousRoom) {
    // A swap when the target is taken, a plain move when it is not.
    if (occupant) next[previousRoom] = occupant;
    else delete next[previousRoom];
  }
  // With no previous room the newcomer came from the tray, and any occupant
  // goes back to it — which only happens while a roster is still being built.
  return next;
}

export function removeCrew(assignments, room) {
  const next = { ...assignments };
  delete next[room];
  return next;
}

/** Everyone in the department they trained for. */
export function homeAssignments() {
  return Object.fromEntries(
    CREW.filter(member => ROOMS_C3.includes(member.home)).map(member => [member.home, member.id]),
  );
}

export function roomOf(assignments, crewId) {
  return Object.keys(assignments).find(key => assignments[key] === crewId) ?? null;
}

export function unplacedCrew(assignments) {
  const placed = new Set(Object.values(assignments));
  return CREW.filter(member => !placed.has(member.id));
}

/** Every department has somebody in it. */
export function isRosterComplete(assignments) {
  return ROOMS_C3.every(room => Boolean(assignments[room]));
}

/** How many astronauts are standing in the department they trained for. */
export function specialistCount(assignments) {
  return ROOMS_C3.filter(room => {
    const member = CREW.find(entry => entry.id === assignments[room]);
    return member?.home === room;
  }).length;
}
