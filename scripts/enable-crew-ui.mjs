/**
 * One-time opt-in integration for the existing Reevaluation C (v3) checkout.
 * Does not change any NASA mission file or storm mapping. Preserves locally tuned
 * mechanics and backs up App/config on first application.
 */
import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const appPath = resolve('src/App.jsx');
const configPath = resolve('src/data/config.json');
const apply = process.argv.includes('--apply');
const app = readFileSync(appPath, 'utf8');
const original = JSON.parse(readFileSync(configPath, 'utf8'));

if (original.stormMapping?.status !== 'approved') {
  throw new Error('Phase 2 mapping is not approved. Refusing to enable the new interface.');
}
if (original.reevaluation?.version !== 3 || !original.reevaluation.c3) {
  throw new Error('Reevaluation C v3 must be installed and activated first.');
}

const oldRender = '<MissionExperienceC config={config} mission={ready.mission}/>';
const newRender = `(config.reevaluation?.crewUI?.enabled
        ? <CrewMissionExperience config={config} mission={ready.mission}/>
        : ${oldRender})`;
const newImport = "import CrewMissionExperience from './ui/v4/CrewMissionExperience.jsx';";
const hasNewUI = app.includes(newImport) && app.includes('crewUI?.enabled');

if (!hasNewUI && !app.includes(oldRender)) {
  throw new Error('Cannot find the known Reevaluation C App.jsx branch. Merge the import and conditional route manually; no files were changed.');
}
if (!hasNewUI && !app.includes("import MissionExperienceC from './ui/v3/MissionExperience.jsx';")) {
  throw new Error('Cannot find the Reevaluation C import in App.jsx. No files were changed.');
}

const c3 = original.reevaluation.c3;
const candidateUI = {
  enabled: true,
  crewCount: 4,
  crewNames: ['Ari', 'Nova', 'Kai', 'Sol'],
  defaultRoomEnergy: 1,
  cargoCapacity: 10,
  minimumAir: 2,
  minimumSupplies: 2,
  cargoDefaults: {
    air: original.startingMeters.air,
    supplies: original.startingMeters.food,
    battery: 1,
  },
};
if (candidateUI.cargoDefaults.air + candidateUI.cargoDefaults.supplies + candidateUI.cargoDefaults.battery > candidateUI.cargoCapacity) {
  throw new Error('Cargo defaults exceed capacity; revise crewUI settings before enabling.');
}
if (candidateUI.cargoDefaults.battery > c3.battery.baseCapacity) {
  throw new Error('Default battery charge exceeds v3 capacity.');
}
const next = structuredClone(original);
const existing = next.reevaluation.crewUI ?? {};
next.reevaluation.crewUI = {
  ...candidateUI, ...existing,
  enabled: true,
  cargoDefaults: { ...candidateUI.cargoDefaults, ...existing.cargoDefaults },
};
if (next.stormMapping.status !== original.stormMapping.status || next.reevaluation.version !== original.reevaluation.version) {
  throw new Error('Safety verification failed; config would change protected settings');
}

let newApp = app;
if (!hasNewUI) {
  newApp = newApp.replace("import MissionExperienceC from './ui/v3/MissionExperience.jsx';",
    "import MissionExperienceC from './ui/v3/MissionExperience.jsx';\n" + newImport);
  newApp = newApp.replace(oldRender, newRender);
}
if (!newApp.includes(newImport) || !newApp.includes('crewUI?.enabled')) throw new Error('App integration checks failed');

if (!apply) {
  process.stdout.write('DRY RUN: Reevaluation C v3 detected. Would add the crew interface route and opt-in config.\n');
  process.stdout.write('No NASA mission files, storm data, research cards, or v3 logic will change.\n');
  process.stdout.write('To enable locally: node scripts/enable-crew-ui.mjs --apply\n');
} else {
  for (const [file, backup] of [
    [appPath, resolve('.env.crew-ui-App.jsx.bak')],
    [configPath, resolve('.env.crew-ui-config.json.bak')],
  ]) {
    if (!existsSync(backup)) copyFileSync(file, backup);
  }
  // All preflight validations happened above. Keep app and config edits narrowly scoped.
  if (newApp !== app) writeFileSync(appPath, newApp);
  writeFileSync(configPath, JSON.stringify(next, null, 2) + '\n');
  process.stdout.write('Crew UI enabled for Reevaluation C. Previous App and config backed up on first run.\n');
  process.stdout.write('Approved DONKI mapping and embedded mission JSON preserved.\n');
}
