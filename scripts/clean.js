// Phase 2 cleaner (CLAUDE.md §6.2): raw DONKI JSON -> src/data/missions/<id>.json
// Storm-level mapping decided here is recorded in CLAUDE.md §15 Decision Log.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const RAW_DIR = path.join(__dirname, 'raw')
const MISSIONS_DIR = path.join(__dirname, '..', 'src', 'data', 'missions')

const RAW_WINDOW_START = '2024-05-01'
const RAW_WINDOW_END = '2024-05-15'

// Mission window: first 10 days of the fetched window (captures the real May 2024
// "Gannon storm" build-up and its extreme G5 onset on day 10 / 2024-05-10).
const MISSION_START = '2024-05-01'
const MISSION_LENGTH_DAYS = 10

function loadRaw(type) {
  const file = path.join(RAW_DIR, `${type}_${RAW_WINDOW_START}_${RAW_WINDOW_END}.json`)
  const parsed = JSON.parse(readFileSync(file, 'utf-8'))
  return parsed.data || []
}

function dayDateString(startDate, offset) {
  const d = new Date(`${startDate}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + offset)
  return d.toISOString().slice(0, 10)
}

// §6.4 flare-class mapping (intended, confirmed against this real data):
// C-class -> 1 minor, M-class -> 2 moderate, X-class -> 3 severe.
function flareLevel(classType) {
  if (!classType) return 0
  const letter = classType[0]
  if (letter === 'X') return 3
  if (letter === 'M') return 2
  if (letter === 'C') return 1
  return 0
}

// GST Kp-index mapping decided for this game (NOAA G-scale thresholds: G1=Kp5 .. G5=Kp9),
// folded into our 0-3 scale. Recorded in the Decision Log, §15.
function gstLevel(maxKp) {
  if (maxKp >= 8) return 3
  if (maxKp >= 6) return 2
  if (maxKp >= 5) return 1
  return 0
}

function main() {
  const flares = loadRaw('FLR')
  const seps = loadRaw('SEP')
  const gsts = loadRaw('GST')

  const days = []

  for (let i = 0; i < MISSION_LENGTH_DAYS; i++) {
    const date = dayDateString(MISSION_START, i)
    const events = []
    let level = 0

    for (const flr of flares) {
      if (!flr.beginTime?.startsWith(date)) continue
      const lvl = flareLevel(flr.classType)
      level = Math.max(level, lvl)
      events.push({
        type: 'FLR',
        label: `Real solar flare, class ${flr.classType}`,
        sourceId: flr.flrID,
      })
    }

    for (const sep of seps) {
      if (!sep.eventTime?.startsWith(date)) continue
      level = Math.max(level, 3) // SEP = solar radiation storm, severe (§6.4)
      events.push({
        type: 'SEP',
        label: 'Real solar radiation storm (energetic particle event)',
        sourceId: sep.sepID,
      })
    }

    for (const gst of gsts) {
      if (!gst.startTime?.startsWith(date)) continue
      const maxKp = Math.max(...(gst.allKpIndex || []).map((k) => k.kpIndex), 0)
      const lvl = gstLevel(maxKp)
      level = Math.max(level, lvl)
      events.push({
        type: 'GST',
        label: `Real geomagnetic storm, Kp index ${maxKp}`,
        sourceId: gst.gstID,
      })
    }

    days.push({ day: i + 1, date, stormLevel: level, events })
  }

  const mission = {
    missionId: 'gannon-storm-2024',
    title: 'The May 2024 Storm',
    site: 'moon',
    dataSource: 'NASA DONKI (archived data)',
    window: { start: MISSION_START, end: dayDateString(MISSION_START, MISSION_LENGTH_DAYS - 1) },
    days,
  }

  mkdirSync(MISSIONS_DIR, { recursive: true })
  const outPath = path.join(MISSIONS_DIR, `${mission.missionId}.json`)
  writeFileSync(outPath, JSON.stringify(mission, null, 2))
  console.log(`Wrote ${outPath}`)
  console.log('Storm levels by day:', days.map((d) => `${d.day}:${d.stormLevel}`).join(' '))
}

main()
