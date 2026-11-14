
import { CONFIG } from "./config.js";

export function createInitialState() {
  return {
    day: 1,

    air: CONFIG.startingResources.air,
    food: CONFIG.startingResources.food,
    safety: CONFIG.startingResources.safety,

    science: 0,
    greenhouseYesterday: 0,

    status: "playing",
    history: [],
  };
}
