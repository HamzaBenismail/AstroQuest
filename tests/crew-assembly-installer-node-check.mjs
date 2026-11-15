import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,copyFileSync,existsSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';

const tmp=mkdtempSync(join(tmpdir(),'smp-assembly-config-'));
try {
  mkdirSync(join(tmp,'scripts'));mkdirSync(join(tmp,'src/data'),{recursive:true});
  const script=join(tmp,'scripts/enable-crew-assembly.mjs');
  const file=join(tmp,'src/data/config.json');
  copyFileSync('scripts/enable-crew-assembly.mjs',script);
  copyFileSync('scripts/enable-six-crew.mjs',join(tmp,'scripts/enable-six-crew.mjs'));
  const original={stormMapping:{status:'approved',ids:['NASA-ID-PRESERVED']},startingMeters:{air:5,food:4},
    reevaluation:{version:3,c3:{care:{safetyGain:2}},crewUI:{enabled:true,crewCount:4,crewNames:['Ari','Nova','Kai','Sol'],cargoCapacity:10}}};
  writeFileSync(file,JSON.stringify(original));
  const run=(args)=>spawnSync(process.execPath,[script,...args],{cwd:tmp,encoding:'utf8'});
  assert.equal(run([]).status,0);
  assert.deepEqual(JSON.parse(readFileSync(file,'utf8')),original);
  assert.equal(run(['--apply']).status,0);
  let updated=JSON.parse(readFileSync(file,'utf8'));
  assert.equal(updated.reevaluation.crewUI.crewMax,6);
  assert.deepEqual(updated.reevaluation.crewUI.candidateNames,['Ari','Juno','Rhea','Sol','Kai','Milo']);
  assert.deepEqual(updated.stormMapping,original.stormMapping);
  assert.deepEqual(updated.reevaluation.c3,original.reevaluation.c3);
  assert.ok(existsSync(join(tmp,'.env.before-six-crew.json.bak')));
  updated.reevaluation.crewUI.candidateNames[0]='Custom Name';
  writeFileSync(file,JSON.stringify(updated));
  assert.equal(run(['--apply']).status,0);
  assert.equal(JSON.parse(readFileSync(file,'utf8')).reevaluation.crewUI.candidateNames[0],'Custom Name');
  const before=readFileSync(file,'utf8');
  updated.stormMapping.status='pending';
  writeFileSync(file,JSON.stringify(updated));
  assert.notEqual(run(['--apply']).status,0);
  assert.equal(readFileSync(file,'utf8'),JSON.stringify(updated));
  writeFileSync(file,before);
  updated.reevaluation.version=2;
  writeFileSync(file,JSON.stringify(updated));
  assert.notEqual(run(['--apply']).status,0);
  console.log('D6 installer PASS: dry-run, explicit opt-in, backup, idempotence, preserving custom team and approved storm data, safe rejection.');
} finally { rmSync(tmp,{recursive:true,force:true}); }
