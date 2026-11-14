import { DAILY_POWER, type Budget, type MissionState } from './types';

export function budgetUsed(budget: Budget, shelterPrepared: boolean): number {
  return Object.values(budget).reduce((sum, value) => sum + value, 0) + (shelterPrepared ? 2 : 0);
}
export function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}

/** Deterministic teaching model, NOT a NASA-validated radiation or ECLSS model. */
export function simulateNextSol(state: MissionState): MissionState {
  if (state.status !== 'active') return state;
  const nextDay = state.day + 1;
  const isStorm = nextDay === 3;
  const generation = isStorm ? 5 : nextDay === 5 ? 8 : 10;
  const usage = budgetUsed(state.budget, state.shelterPrepared);
  const batteryDelta = generation - usage - 2; // habitat overhead
  const oxygenDelta = (state.budget.lifeSupport - 4) * 6 - 5;
  const radiationDelta = isStorm ? (state.shelterPrepared ? 6 : 75) : (state.shelterPrepared ? 0 : 3);
  const researchDelta = Math.max(0, state.budget.science - 1) * 5;
  const messageDelta = state.budget.communications >= 2 ? 1 : 0;
  const oxygen = clamp(state.oxygen + oxygenDelta);
  const battery = clamp(state.battery + batteryDelta);
  const radiation = clamp(state.radiation + radiationDelta);
  const research = state.research + researchDelta;
  const status = oxygen <= 0 || battery <= 0 || radiation >= 80
    ? 'lost' : nextDay >= state.totalDays ? 'won' : 'active';

  const effects = [
    `Oxygen ${oxygenDelta < 0 ? '' : '+'}${oxygenDelta}`,
    `Battery ${batteryDelta < 0 ? '' : '+'}${batteryDelta}`,
    `Radiation +${radiationDelta}`,
    `Research +${researchDelta}`,
  ];
  const explanation = status === 'lost'
    ? 'The mission ended because a critical resource or crew safety limit was reached. Try balancing power differently.'
    : isStorm
      ? state.shelterPrepared
        ? 'A solar particle event struck Mars. Your prepared shelter reduced the crew risk, but its systems used scarce power.'
        : 'A solar particle event struck Mars. The crew accumulated substantial simulated radiation risk without shelter preparation.'
      : nextDay === 2
        ? 'Space weather monitoring predicts a solar event next sol. Science can continue, but shielding requires some of your power budget.'
        : nextDay === 5
          ? 'The five-sol expedition has finished. Survival required a continuing balance between air, power, science and radiation risk.'
          : 'The station completed another sol. Keeping life support strong protects oxygen, but every system draws from the same budget.';
  const headline = status === 'lost' ? 'Mission compromised'
    : status === 'won' ? 'Mission accomplished'
    : isStorm ? 'Solar particle event detected'
    : nextDay === 2 ? 'Space weather advisory'
    : 'Another sol completed';
  const report = {
    day: nextDay, headline, explanation,
    kind: status === 'lost' ? 'danger' as const : status === 'won' ? 'good' as const : isStorm ? 'danger' as const : nextDay === 2 ? 'warning' as const : 'normal' as const,
    effects
  };
  return {
    ...state, day: nextDay, oxygen, battery, radiation, research,
    messages: state.messages + messageDelta, status,
    report, history: [report, ...state.history]
  };
}
export function validAllocation(budget: Budget, shelterPrepared: boolean): boolean {
  const values = Object.values(budget);
  return values.every(value => Number.isInteger(value) && value >= 0 && value <= DAILY_POWER)
    && budgetUsed(budget, shelterPrepared) <= DAILY_POWER;
}
