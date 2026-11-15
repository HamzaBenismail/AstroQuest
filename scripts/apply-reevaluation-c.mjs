/** Opt-in, idempotent v3 candidate merge. Never edits archived NASA records or approved mapping. */
import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildC3Candidate } from './reevaluation-c-candidate.mjs';

const file = resolve('src/data/config.json');
const apply = process.argv.includes('--apply');
const original = JSON.parse(readFileSync(file, 'utf8'));
if (original.stormMapping?.status !== 'approved') {
  process.stderr.write('Stopped: Phase 2 stormMapping must already be team-approved.\n');
  process.exitCode = 1;
} else {
  const next = buildC3Candidate(original);
  if (!apply) {
    process.stdout.write('DRY RUN: no files changed. v3 would be enabled under reevaluation.version=3.\n');
    process.stdout.write('Unchanged: stormMapping, missions, NASA raw records, science cards, legacy engine.\n');
    process.stdout.write('To enable: npm run reevaluate:c -- --apply\n');
  } else {
    const backup = resolve('.env.config.before-reevaluation-c.bak'); // Covered by existing .gitignore .env.*
    if (!existsSync(backup)) copyFileSync(file, backup);
    writeFileSync(file, `${JSON.stringify(next, null, 2)}\n`);
    process.stdout.write(`v3 candidate enabled in ${file}\nBackup: ${backup}\nNASA mapping preserved: ${next.stormMapping.status}\n`);
  }
}
