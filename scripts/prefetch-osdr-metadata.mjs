/**
 * Optional development-only tool: retrieve NASA OSDR public study metadata as
 * raw evidence, never as direct game content or automatic verification.
 * Run WITHOUT --fetch to preview. No browser-side network calls are introduced.
 */
import catalog from '../src/data/discoveries.js';
import { validateDiscoveryCatalog } from '../src/logic/v4/discoveries.js';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
validateDiscoveryCatalog(catalog);
const endpoints=catalog.map(item=>({
  studyId:item.studyId, url:`https://osdr.nasa.gov/osdr/data/osd/meta/${item.studyId.slice(4)}`,
}));
if (!process.argv.includes('--fetch')) {
  process.stdout.write('OSDR API source preview (no network, no writes):\n');
  for (const e of endpoints) process.stdout.write(`${e.studyId}: ${e.url}\n`);
  process.stdout.write('Add --fetch to save returned raw JSON for HUMAN verification.\n');
} else {
  const target=resolve('scripts/raw/osdr-discovery-metadata');
  await mkdir(target,{recursive:true});
  for(const {studyId,url} of endpoints){
    const response=await fetch(url,{signal:AbortSignal.timeout(18000),headers:{Accept:'application/json'}});
    if(!response.ok)throw new Error(`OSDR ${studyId} returned HTTP ${response.status}; stop and review response`);
    const data=await response.json();
    if(!data || typeof data!=='object')throw new Error(`Unexpected ${studyId} metadata format`);
    await writeFile(resolve(target,`${studyId}.json`),JSON.stringify(data,null,2)+'\n');
    process.stdout.write(`Saved ${studyId} raw metadata. Verification flag remains unchanged.\n`);
  }
}
