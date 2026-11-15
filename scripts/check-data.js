// F4/F8: independent integrity check for the single approved embedded mission.
import { readFile, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import assert from 'node:assert/strict';
import config from '../src/data/config.json' with { type: 'json' };
import { EVENT_TYPES, buildMission, missionDates, validateMission } from './donki-utils.js';

const root = resolve(import.meta.dirname, '..');
async function loadJson(file) { return JSON.parse(await readFile(file, 'utf8')); }

async function main() {
  if (config.stormMapping?.status !== 'approved') throw new Error('Storm mapping is not team-approved');
  const dir = join(root, 'src/data/missions');
  const names = (await readdir(dir)).filter(name => name.endsWith('.json'));
  assert.ok(names.length, 'No approved mission JSON exists');
  const manifest = await loadJson(join(root, 'scripts/raw/manifest.json'));
  const dates = missionDates(manifest.window.start, config.missionLengthDays);
  assert.equal(manifest.window.end, dates.at(-1));
  const datasets = {};
  for (const type of EVENT_TYPES) {
    const meta = manifest.endpoints?.[type];
    const expected = `${dates[0]}_${dates.at(-1)}-${type}.json`;
    assert.equal(meta?.file, expected);
    datasets[type] = await loadJson(join(root, 'scripts/raw', expected));
    assert.equal(datasets[type].length, meta.count);
  }
  for (const name of names) {
    const mission = await loadJson(join(dir, name));
    validateMission(mission, config);
    const expected = buildMission({
      datasets, dates, config, mapping: config.stormMapping,
      missionId: mission.missionId, title: mission.title,
    });
    assert.deepEqual(mission, expected, `${name} does not match authentic raw source IDs/classifications`);
    process.stdout.write(`PASS: ${name}, ${mission.days.length} days, ${mission.days.flatMap(d => d.events).length} traceable events\n`);
  }
}
main().catch(error => { process.stderr.write(`Data check failed: ${error.message}\n`); process.exitCode = 1; });
