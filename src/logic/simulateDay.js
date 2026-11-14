
import { CONFIG } from "./config.js";

export function simulateDay(state, allocation, stormLevel) {
  const stormDamage = CONFIG.stormDamage[stormLevel];

  if (stormDamage === undefined) {
    throw new Error("Invalid storm level");
  }

  const air = Math.min(
    CONFIG.maxResources,
    state.air + allocation.lifeSupport - 30
  );

  const food = Math.min(
    CONFIG.maxResources,
    state.food - 20 + state.greenhouseYesterday
  );

  const damage =
    Math.max(0, stormDamage - 2 * allocation.shield) +
    (allocation.shield === 0 ? 10 : 0);

  const safetyRecovery =
    stormLevel === "none" && allocation.shield >= 10
      ? 10
      : 0;

  const safety = Math.min(
    CONFIG.maxResources,
    state.safety - damage + safetyRecovery
  );

  const scienceEarned =
    allocation.science * CONFIG.sciencePointsPerPower;

  return {
    ...state,
    day: state.day + 1,
    air,
    food,
    safety,
    science: state.science + scienceEarned,
    greenhouseYesterday: allocation.greenhouse,
  };
}
