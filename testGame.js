
import { createInitialState } from "./src/logic/gameState.js";
import { playDay } from "./src/logic/gameEngine.js";

const game = createInitialState();

console.log("Starting mission:", game);

const allocation = {
  lifeSupport: 40,
  shield: 20,
  greenhouse: 20,
  science: 20,
};

const result = playDay(game, allocation, "minor");

console.log("After Day 1:", result);
