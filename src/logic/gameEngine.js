
import { validateAllocation } from "./power.js";
import { simulateDay } from "./simulateDay.js";
import { checkGameStatus } from "./gameStatus.js";
import { CONFIG } from "./config.js";

export function playDay(state, allocation, stormLevel) {
  // 1. Check that the mission is still active.
  if (!state || state.status !== "playing") {
    return {
      success: false,
      error: "Mission is already finished or invalid",
    };
  }

  // 2. Validate the player's power allocation.
  const validation = validateAllocation(state.day, allocation);

  if (!validation.valid) {
    return {
      success: false,
      error: validation.error,
    };
  }

  // 3. Check whether the storm level is valid.
  if (!Object.hasOwn(CONFIG.stormDamage, stormLevel)) {
    return {
      success: false,
      error: "Invalid storm level",
    };
  }

  // 4. Calculate the next day's resources.
  const nextState = simulateDay(
    state,
    allocation,
    stormLevel
  );

  // 5. Check whether the mission continues, wins, or loses.
  nextState.status = checkGameStatus(nextState);

  // 6. Save today's results in mission history.
  nextState.history = [
    ...state.history,
    {
      day: state.day,
      allocation: { ...allocation },
      stormLevel,
      air: nextState.air,
      food: nextState.food,
      safety: nextState.safety,
      science: nextState.science,
      status: nextState.status,
    },
  ];

  return {
    success: true,
    state: nextState,
  };
}
