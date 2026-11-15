// F4: download actual DONKI JSON to local files. Never runs in the browser.
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import config from '../src/data/config.json' with { type: 'json' };
import { EVENT_TYPES, missionDates, inspectRecordShape, parseDay } from './donki-utils.js';

const root = resolve(import.meta.dirname, '..');
const rawDir = join(root, 'scripts/raw');
const defaultStart = '2024-05-08'; // NOAA/CCMC historical storm window; date is not a game unit.

async function loadKey() {
  if (process.env.NASA_API_KEY) return process.env.NASA_API_KEY;
  // Read only the one key expected in our root .env; no dotenv package required.
  let content = '';
  try { content = await readFile(join(root, '.env'), 'utf8'); } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }
  const line = content.split(/\r?\n/).find(v => /^\s*NASA_API_KEY\s*=/.test(v));
  return line?.split('=').slice(1).join('=').trim().replace(/^['"]|['"]$/g, '') || null;
}

async function request(type, url, hostLabel) {
  const response = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(18000) });
  if (!response.ok) throw new Error(`HTTP ${response.status} from ${hostLabel} for ${type}`);
  const data = await response.json();
  inspectRecordShape(type, data);
  return data;
}

async function main() {
  const start = process.env.DONKI_START_DATE || defaultStart;
  const dates = missionDates(start, config.missionLengthDays);
  const end = dates.at(-1);
  parseDay(end);
  const key = await loadKey();
  if (!key) throw new Error('Set NASA_API_KEY in a local .env (see .env.example). Do not commit it.');
  const datasets = {};
  const sources = {};
  for (const type of EVENT_TYPES) {
    const params = new URLSearchParams({ startDate: start, endDate: end });
    const official = `https://ccmc.gsfc.nasa.gov/DONKI-API/get/${type}?${params}`;
    const nasa = `https://api.nasa.gov/DONKI/${type}?${params}&api_key=${encodeURIComponent(key)}`;
    let data = null;
    let used = null;
    const errors = [];
    let secondaryOk = false;
    // Explicitly exercise both official access paths until one responds per event type.
    for (const attempt of [
      { url: nasa, label: 'api.nasa.gov', safeBase: `https://api.nasa.gov/DONKI/${type}` },
      { url: official, label: 'ccmc.gsfc.nasa.gov', safeBase: `https://ccmc.gsfc.nasa.gov/DONKI-API/get/${type}` },
    ]) {
      try {
        const fetched = await request(type, attempt.url, attempt.label);
        if (!used) { data = fetched; used = attempt; }
        else { secondaryOk = true; }
        process.stdout.write(`${type}: ${fetched.length} records available from ${attempt.label}\n`);
        // FLR probes BOTH official host routes. Remaining types use failover to save calls.
        if (type !== 'FLR') break;
      } catch (error) {
        // NEVER log request URLs; NASA_API_KEY lives inside one of them.
        errors.push(`${attempt.label}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    if (!used) throw new Error(`${type} failed on both hosts. ${errors.join('; ')}`);
    datasets[type] = data;
    sources[type] = {
      file: `${start}_${end}-${type}.json`,
      sourceEndpoint: used.safeBase,
      count: data.length,
      shape: inspectRecordShape(type, data),
    };
  }
  // Only write if all four event types were successfully retrieved.
  await mkdir(rawDir, { recursive: true });
  for (const type of EVENT_TYPES) {
    const target = join(rawDir, sources[type].file);
    await writeFile(`${target}.tmp`, `${JSON.stringify(datasets[type], null, 2)}\n`, 'utf8');
    await rename(`${target}.tmp`, target);
  }
  const manifest = {
    dataSource: 'NASA DONKI (archived data)',
    window: { start, end },
    fetchedAtUtc: new Date().toISOString(),
    endpoints: sources,
    note: 'Original API arrays are preserved; the shape listing is for human inspection. No API key is saved.',
  };
  await writeFile(join(rawDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  process.stdout.write(`Saved raw records and field-shape manifest to ${rawDir}\n`);
  process.stdout.write('Review the raw JSON fields and storm-mapping proposal before generating a shipping mission.\n');
}

main().catch(error => { process.stderr.write(`Prefetch failed: ${error.message}\n`); process.exitCode = 1; });
