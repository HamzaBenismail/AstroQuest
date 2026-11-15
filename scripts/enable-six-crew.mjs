/** Opt-in D.6 setting change only: six selectable crew. NASA data stays untouched. */
import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
const file = resolve('src/data/config.json');
const old = JSON.parse(readFileSync(file, 'utf8'));
if (old.stormMapping?.status !== 'approved' || old.reevaluation?.version !== 3 || !old.reevaluation?.crewUI?.enabled) {
  throw new Error('Existing approved NASA mission and D.5 crew UI are required; no files changed.');
}
const next = structuredClone(old);
next.reevaluation.crewUI.crewMax = 6;
next.reevaluation.crewUI.candidateNames ??= ['Ari','Juno','Rhea','Sol','Kai','Milo'];
if (!Array.isArray(next.reevaluation.crewUI.candidateNames) || next.reevaluation.crewUI.candidateNames.length !== 6 ||
    next.reevaluation.crewUI.candidateNames.some(name => typeof name !== 'string' || !name.trim())) {
  throw new Error('Six valid crew candidate names are required; no files changed.');
}
if (JSON.stringify(next.stormMapping) !== JSON.stringify(old.stormMapping)) throw new Error('NASA mapping changed unexpectedly');
if (!process.argv.includes('--apply')) {
  process.stdout.write('DRY RUN: enable a team of up to 6; crew placement moves to gameplay.\nNo files changed.\n');
} else {
  const backup = resolve('.env.before-six-crew.json.bak');
  if (!existsSync(backup)) copyFileSync(file,backup);
  writeFileSync(file,JSON.stringify(next,null,2)+'\n');
  process.stdout.write('Six-person crew setting enabled. Original config backed up.\n');
}
