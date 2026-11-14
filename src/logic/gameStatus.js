
import { CONFIG } from "./config.js";

export function checkGameStatus(state) {
  // The mission fails if any resource reaches 0.
  if (
    state.air <= 0 ||
    state.food <= 0 ||
    state.safety <= 0
  ) {
    return "lost";
  }

  // The mission continues until all 10 days are completed.
  if (state.day <= CONFIG.missionDays) {
    return "playing";
  }

  // Resources must be at least 30/100 to win.
  if (
    state.air >= CONFIG.successThreshold &&
    state.food >= CONFIG.successThreshold &&
    state.safety >= CONFIG.successThreshold
  ) {
    return "won";
  }

  return "lost";
}
