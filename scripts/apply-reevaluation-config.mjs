/** Explicit, idempotent merge. Preserves user's approved DONKI mapping and all other fields. */
import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
const file = resolve('src/data/config.json');
const apply = process.argv.includes('--apply');
const original = JSON.parse(readFileSync(file, 'utf8'));
if (original.stormMapping?.status !== 'approved') {
  console.error('Stopped: storm mapping must remain team-approved. Approve Phase 2 first.');
  process.exitCode = 1;
} else {
  const next = structuredClone(original);
  next.meterMin ??= 0;
  next.failureMeterThreshold ??= 0;
  next.zeroShieldSafetyPenalty ??= 1;
  next.calmShieldRecoveryMinAllocation ??= 1;
  next.calmShieldRecovery ??= 1;

  next.reevaluation = {
    _note: 'Phase Reevaluation B candidate GAME UNITS, not real engineering values. Preserve archived NASA mission data. Team approval/documentation required before shipping.',
    version: 2,
    startingSafety: 10,
    reducedDayEnergy: 9,
    research: {
      unlockThreshold: 4,
      pointsPerPower: 1,
      airUseReduction: 1,
      airUseMin: 1,
      improvedForecastErrorTable: [-1, 0, 0, 0],
    },
    comms: {
      sendEnergyCost: 1,
      baseResponseTurns: 1,
      interferenceExtraTurns: 1,
      interferenceStormLevel: 3,
    },
  };
  const changes = {
    startingSafetyV2: [original.reevaluation?.startingSafety ?? null, next.reevaluation.startingSafety],
    reducedDayEnergyV2: [original.reevaluation?.reducedDayEnergy ?? null, next.reevaluation.reducedDayEnergy],
    v2ConfigAdded: !original.reevaluation,
    stormMappingStatusUnchanged: original.stormMapping.status === next.stormMapping.status,
  };
  if (!apply) {
    process.stdout.write(`${JSON.stringify(changes, null, 2)}\n\nDry-run only. To apply candidate values: npm run reevaluate:config -- --apply\n`);
  } else {
    const backup = resolve('src/data/config.before-reevaluation.json.bak');
    copyFileSync(file, backup);
    writeFileSync(file, `${JSON.stringify(next, null, 2)}\n`);
    const creditsFile = resolve('public/art/CREDITS.md');
    const creditsLine = '| `cutaway-base.svg` | Original cutaway habitat schematic (Phase Reevaluation B; fictional illustration, not NASA engineering artwork) | CC0-1.0 dedication (no external asset used) |';
    if (existsSync(creditsFile)) {
      const currentCredits = readFileSync(creditsFile, 'utf8');
      if (!currentCredits.includes('`cutaway-base.svg`')) writeFileSync(creditsFile, `${currentCredits.trimEnd()}\n${creditsLine}\n`);
    }
    process.stdout.write(`Updated ${file}\nBackup: ${backup}\n${JSON.stringify(changes, null, 2)}\n`);
  }
}
