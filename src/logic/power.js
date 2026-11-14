
import { CONFIG } from "./config.js";

export function getDailyBudget(day) {
  if (!Number.isInteger(day) ||
      day < 1 ||
      day > CONFIG.missionDays) {
    throw new Error("Invalid mission day");
  }

  return day <= 4
    ? CONFIG.power.normalDay
    : CONFIG.power.lunarNight;
}

export function validateAllocation(day, allocation) {
  const budget = getDailyBudget(day);

  if (!allocation || typeof allocation !== "object" ||
      Array.isArray(allocation)) {
    return { valid: false, error: "Invalid allocation" };
  }

  const systems = Object.keys(CONFIG.allocationLimits);

  for (const system of systems) {
    const amount = allocation[system];
    const maximum = CONFIG.allocationLimits[system];

    if (!Number.isInteger(amount) ||
        amount < 0 ||
        amount > maximum) {
      return {
        valid: false,
        error: `Invalid power for ${system}`,
      };
    }
  }

  if (Object.keys(allocation).some(
    (key) => !systems.includes(key)
  )) {
    return { valid: false, error: "Unknown system" };
  }

  const total = systems.reduce(
    (sum, system) => sum + allocation[system],
    0
  );

  if (total > budget) {
    return {
      valid: false,
      error: "Not enough power",
    };
  }

  return { valid: true, total, remaining: budget - total };
}
