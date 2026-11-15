/** Dependency-free installer smoke test against a disposable fake v3 checkout. */
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, copyFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';

const tmp = mkdtempSync(join(tmpdir(),'smp-crew-install-'));
try {
  const script=join(tmp,'scripts/enable-crew-ui.mjs');
  mkdirSync(dirname(script),{recursive:true});
  copyFileSync('scripts/enable-crew-ui.mjs',script);
  mkdirSync(join(tmp,'src/data'),{recursive:true});
  const appFile=join(tmp,'src/App.jsx');
  const configFile=join(tmp,'src/data/config.json');
  const app = "import MissionExperienceC from './ui/v3/MissionExperience.jsx';\nconst output = <MissionExperienceC config={config} mission={ready.mission}/>;\n";
  const cfg = { stormMapping:{status:'approved',mapping:'STAYS'}, startingMeters:{air:5,food:4,safety:8},
    reevaluation:{version:3,c3:{battery:{baseCapacity:2},research:{},care:{safetyGain:2}}}};
  writeFileSync(appFile,app); writeFileSync(configFile,JSON.stringify(cfg));
  const run=(args)=>spawnSync(process.execPath,[script,...args],{cwd:tmp,encoding:'utf8'});
  const dry=run([]);
  assert.equal(dry.status,0,dry.stderr);
  assert.equal(readFileSync(appFile,'utf8'),app);
  assert.deepEqual(JSON.parse(readFileSync(configFile,'utf8')),cfg);
  const applied=run(['--apply']);
  assert.equal(applied.status,0,applied.stderr);
  let updated=JSON.parse(readFileSync(configFile,'utf8'));
  assert.equal(updated.stormMapping.status,'approved');
  assert.equal(updated.stormMapping.mapping,'STAYS');
  assert.equal(updated.reevaluation.version,3);
  assert.equal(updated.reevaluation.c3.care.safetyGain,2);
  assert.equal(updated.reevaluation.crewUI.crewCount,4);
  assert.ok(readFileSync(appFile,'utf8').includes("import CrewMissionExperience from './ui/v4/CrewMissionExperience.jsx';"));
  assert.ok(readFileSync(appFile,'utf8').includes('crewUI?.enabled'));
  assert.ok(existsSync(join(tmp,'.env.crew-ui-App.jsx.bak')));
  assert.ok(existsSync(join(tmp,'.env.crew-ui-config.json.bak')));
  updated.reevaluation.crewUI.crewCount=5;
  writeFileSync(configFile,JSON.stringify(updated));
  const again=run(['--apply']);
  assert.equal(again.status,0,again.stderr);
  assert.equal(JSON.parse(readFileSync(configFile,'utf8')).reevaluation.crewUI.crewCount,5);
  assert.equal(readFileSync(appFile,'utf8').match(/import CrewMissionExperience/g)?.length,1);
  assert.equal(readFileSync(appFile,'utf8').match(/crewUI\?\.enabled/g)?.length,1);
  // Unrecognized local App must fail without changing either App or config.
  writeFileSync(appFile,'// customized nonmatching App');
  const before=readFileSync(configFile,'utf8');
  const stopped=run(['--apply']);
  assert.notEqual(stopped.status,0);
  assert.equal(readFileSync(configFile,'utf8'),before);
  console.log('Crew opt-in installer PASS: dry-run, approved mapping preservation, backups, idempotence, fail-safe App match');
} finally {
  rmSync(tmp,{recursive:true,force:true});
}
