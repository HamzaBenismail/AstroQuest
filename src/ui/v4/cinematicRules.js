/** Pure presentation rules — NEVER change the v3 game state or archived storm records. */
export const CINEMATIC_DURATIONS = Object.freeze({
  launchFlight: 1450, launchSmoke: 950, launchLanding: 1550,
  dayTransition: 2800, reportExit: 580,
});

export function forecastMotion(level, min = 0, max = 3) {
  if (!Number.isInteger(level) || level < min || level > max) throw new RangeError('Invalid game weather estimate');
  if (level === max) return 'severe';
  if (level === min) return 'quiet';
  if (level === max - 1) return 'moderate';
  return 'minor';
}

export function cinematicDestination(destination) {
  if (destination !== 'moon' && destination !== 'mars') throw new Error('Unknown destination');
  return destination === 'moon' ? 'Moon' : 'Mars';
}

export function endingMotion(status) {
  if (status === 'succeeded') return 'return';
  if (status === 'failed') return 'wreckage';
  throw new Error('Ending is only available after a completed mission');
}

export function canBeginDayAnimation(isPlanning, budgetOk, staffingOk) {
  return Boolean(isPlanning && budgetOk && staffingOk);
}

export function launchPhases(destination) {
  return Object.freeze([
    {phase:'flight',duration:CINEMATIC_DURATIONS.launchFlight,caption:`Flying toward ${cinematicDestination(destination)}`},
    {phase:'smoke',duration:CINEMATIC_DURATIONS.launchSmoke,caption:'Thrusters preparing for landing'},
    {phase:'landing',duration:CINEMATIC_DURATIONS.launchLanding,caption:`Landing on ${cinematicDestination(destination)}`},
  ]);
}
