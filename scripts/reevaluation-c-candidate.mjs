/** Stable candidate defaults. Used by the opt-in config merge and by verification only. */
export function buildC3Candidate(original) {
  const next = structuredClone(original);
  // Retain existing official/base settings. v3 adds a candidate namespace only.
  next.meterMin ??= 0;
  next.failureMeterThreshold ??= 0;
  next.zeroShieldSafetyPenalty ??= 1;
  next.calmShieldRecoveryMinAllocation ??= 1;
  next.calmShieldRecovery ??= 1;
  next.scienceScorePerAllocation ??= 1;
  const previous = next.reevaluation ?? {};
  // Re-applying must not overwrite user-tuned v3 parameters.
  if (previous.version === 3 && previous.c3) return next;
  next.reevaluation = {
    ...previous,
    version: 3,
    startingSafety: previous.startingSafety ?? 10,
    reducedDayEnergy: previous.reducedDayEnergy ?? 9,
    c3: {
      _note: 'Reevaluation C candidate GAME UNITS; no lunar engineering/dose claim. Pending team balance playtest and Decision Log approval.',
      upgrades: {
        initialLevel: 1, maxLevel: 3,
        researchCostByNextLevel: { '2': 3, '3': 7 },
        energyCost: 1,
        effects: {
          lifeSupport: { airUseReductionPerLevel: 1, airUseFloor: 1 },
          greenhouse: { extraSuppliesPerLevel: 1 },
          power: { extraGenerationPerLevel: 1 },
          science: { bonusPointsPerLevel: 1 },
          shield: { extraProtectionPerLevel: 1 },
          comms: { note: 'Level 2 shortens processing; Level 3 avoids a simulated single interference delay.' },
        },
      },
      battery: { initialCharge: 0, baseCapacity: 2, capacityPerPowerLevel: 2, maxChargePerDay: 2 },
      care: { energyCost: 1, suppliesCost: 1, safetyGain: 2, cooldownDays: 1 },
      comms: { sendEnergyCost: 1, baseResponseTurns: 2, minResponseTurns: 1, turnReductionPerLevel: 1,
        interferenceExtraTurns: 1, interferenceStormLevel: 3, interferenceImmuneLevel: 3 },
      expeditions: {
        'supply-retrieval': { label: 'Supply retrieval', duration: 2, energyCost: 1, airCost: 1, suppliesCost: 1, reward: { supplies: 4 } },
        'science-sampling': { label: 'Science sampling', duration: 2, energyCost: 1, airCost: 1, suppliesCost: 1, reward: { research: 4 } },
        'equipment-maintenance': { label: 'Outpost maintenance', duration: 1, energyCost: 1, airCost: 1, suppliesCost: 1, reward: { safety: 2 } },
      },
      advisor: { lowMeterThreshold: 4, lowBatteryThreshold: 0, severeWarningLevel: 3 },
    },
  };
  return next;
}
