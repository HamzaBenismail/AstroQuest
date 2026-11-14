// Phase 2 (CLAUDE.md §6.2): the ONLY place the NASA API key is read.
// Never commit a key; never move this logic into front-end code.
import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const RAW_DIR = path.join(__dirname, 'raw')

const API_KEY = process.env.NASA_API_KEY
if (!API_KEY) {
  console.error('NASA_API_KEY is not set. Create a .env file from .env.example (CLAUDE.md §6.2).')
  process.exit(1)
}

// CLAUDE.md §6.3: prefer windows after June 2020 (Moon-to-Mars Space Weather Analysis Office).
// A wider window is fetched here; Phase 2 step 3 inspects the raw data before picking the
// final 10-day mission window in the cleaner.
const START_DATE = process.argv[2] || '2024-05-01'
const END_DATE = process.argv[3] || '2024-05-15'

// CLAUDE.md §6.3: DONKI event types.
const EVENT_TYPES = ['FLR', 'SEP', 'CME', 'GST']

// CLAUDE.md §6.3: migration on 2026-09-30 — test both hosts, use whichever responds.
const HOSTS = [
  {
    name: 'api.nasa.gov',
    buildUrl: (type) =>
      `https://api.nasa.gov/DONKI/${type}?startDate=${START_DATE}&endDate=${END_DATE}&api_key=${API_KEY}`,
  },
  {
    name: 'ccmc.gsfc.nasa.gov',
    buildUrl: (type) =>
      `https://ccmc.gsfc.nasa.gov/DONKI/WS/get/${type}?startDate=${START_DATE}&endDate=${END_DATE}`,
  },
]

async function fetchEventType(type) {
  for (const host of HOSTS) {
    const url = host.buildUrl(type)
    try {
      const res = await fetch(url)
      if (!res.ok) {
        console.warn(`[${type}] ${host.name} responded ${res.status} ${res.statusText}`)
        continue
      }
      const body = await res.json()
      console.log(`[${type}] ${host.name} OK — ${Array.isArray(body) ? body.length : 'non-array'} record(s)`)
      return { type, host: host.name, url, body }
    } catch (err) {
      console.warn(`[${type}] ${host.name} failed: ${err.message}`)
    }
  }
  console.error(`[${type}] both hosts failed — no raw data saved for this type.`)
  return null
}

async function main() {
  mkdirSync(RAW_DIR, { recursive: true })
  console.log(`Fetching DONKI data for ${START_DATE} .. ${END_DATE}`)

  for (const type of EVENT_TYPES) {
    const result = await fetchEventType(type)
    if (!result) continue
    const outPath = path.join(RAW_DIR, `${type}_${START_DATE}_${END_DATE}.json`)
    writeFileSync(
      outPath,
      JSON.stringify({ sourceHost: result.host, sourceUrl: result.url.replace(API_KEY, 'REDACTED'), fetchedAt: new Date().toISOString(), data: result.body }, null, 2),
    )
    console.log(`  -> wrote ${outPath}`)
  }
}

main()
