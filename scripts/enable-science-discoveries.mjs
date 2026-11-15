/** Explicit opt-in. NEVER changes approved NASA records or human-review flags. */
import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import catalog from '../src/data/discoveries.js';
import { validateDiscoveryCatalog, discoveryOptions } from '../src/logic/v4/discoveries.js';
const path=resolve('src/data/config.json');
const original=JSON.parse(readFileSync(path,'utf8'));
if (original.stormMapping?.status !== 'approved' || original.reevaluation?.version !== 3 || !original.reevaluation?.crewUI?.enabled)
  throw new Error('D.6 with an approved NASA mission must already be enabled. No files changed.');
validateDiscoveryCatalog(catalog);
const next=structuredClone(original);
if (!next.reevaluation.discovery) {
  next.reevaluation.discovery={
    enabled:true,
    specialistRoom:'science',
    minScienceEnergy:1,
    daysPerDiscovery:2,
    bonusResearchPoints:2,
    maxPerRun:4,
  };
} else {
  next.reevaluation.discovery.enabled = true; // preserve any team-balanced costs/cadence
}
discoveryOptions(next);
if (JSON.stringify(original.stormMapping)!==JSON.stringify(next.stormMapping)) throw new Error('Approved storm mapping changed');
if (!process.argv.includes('--apply')) {
  process.stdout.write('DRY RUN: would enable offline OSDR discoveries with specialist-only research rewards. No files changed.\n');
} else {
  const backup=resolve('.env.before-science-discoveries.json.bak');
  if (!existsSync(backup)) copyFileSync(path,backup);
  writeFileSync(path,JSON.stringify(next,null,2)+'\n');
  process.stdout.write(`Science discoveries ${original.reevaluation.discovery?'already configured':'enabled'}. Backup: ${backup}\n`);
}
