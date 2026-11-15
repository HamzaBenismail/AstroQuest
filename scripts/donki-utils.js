// Phase 2 (F4/F8) helpers. No framework, browser or game engine dependencies.
export const EVENT_TYPES = Object.freeze(['FLR', 'SEP', 'CME', 'GST']);

export function parseDay(value, label = 'date') {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${label} must be a YYYY-MM-DD UTC date`);
  }
  const timestamp = Date.parse(`${value}T00:00:00Z`);
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== value) {
    throw new Error(`${label} is not a real calendar date: ${value}`);
  }
  return timestamp;
}

export function missionDates(start, count) {
  const timestamp = parseDay(start, 'start');
  if (!Number.isInteger(count) || count < 1 || count > 30) {
    throw new Error('Mission length must be between 1 and 30 days (NASA API window cap)');
  }
  return Array.from({ length: count }, (_, i) =>
    new Date(timestamp + i * 86_400_000).toISOString().slice(0, 10)
  );
}

export function inspectRecordShape(type, records) {
  if (!Array.isArray(records)) throw new Error(`${type} NASA response must be an array`);
  const sample = records[0];
  if (!sample) return { count: 0, fields: [] };
  if (typeof sample !== 'object' || Array.isArray(sample)) {
    throw new Error(`${type} NASA response contains a non-object event`);
  }
  return {
    count: records.length,
    fields: Object.keys(sample).sort().map(key => ({
      name: key,
      kind: sample[key] === null ? 'null' : Array.isArray(sample[key]) ? 'array' : typeof sample[key],
    })),
  };
}

export function normalizeDonkiEvent(type, record, mapping) {
  if (!EVENT_TYPES.includes(type)) throw new Error(`Unsupported DONKI event type: ${type}`);
  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    throw new Error(`Invalid ${type} record: expected object`);
  }
  const fields = {
    FLR: { id: 'flrID', date: 'beginTime' },
    SEP: { id: 'sepID', date: 'eventTime' },
    CME: { id: 'activityID', date: 'startTime' },
    GST: { id: 'gstID', date: 'startTime' },
  }[type];
  const sourceId = record[fields.id];
  const timestamp = record[fields.date];
  if (typeof sourceId !== 'string' || !sourceId.trim()) {
    throw new Error(`${type} missing or invalid ${fields.id}; inspect the raw response`);
  }
  if (typeof timestamp !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(timestamp) ||
      !Number.isFinite(Date.parse(timestamp))) {
    throw new Error(`${type} ${sourceId}: missing or invalid ${fields.date}`);
  }
  const date = timestamp.slice(0, 10);
  parseDay(date, `${type} event date`);
  let level;
  let label;
  switch (type) {
    case 'FLR': {
      const flareClass = record.classType;
      if (typeof flareClass !== 'string' || !/^[ABCMX]\d+(?:\.\d+)?$/i.test(flareClass)) {
        throw new Error(`FLR ${sourceId}: unfamiliar classType; inspect raw record: ${JSON.stringify(flareClass)}`);
      }
      const letter = flareClass[0].toUpperCase();
      level = mapping.flareClassLevels[letter];
      label = `Solar flare, class ${flareClass}`;
      break;
    }
    case 'SEP':
      level = mapping.otherEventLevels.SEP;
      label = 'Solar energetic particle event';
      break;
    case 'CME':
      level = mapping.otherEventLevels.CME;
      label = 'Coronal mass ejection observed';
      break;
    case 'GST':
      level = mapping.otherEventLevels.GST;
      label = 'Geomagnetic storm observed near Earth';
      break;
  }
  if (!Number.isInteger(level) || level < 0 || level > 3) {
    throw new Error(`${type} ${sourceId}: invalid mapping for event`);
  }
  return { date, level, event: { type, label, sourceId } };
}

export function buildMission({ datasets, dates, config, mapping, missionId, title }) {
  if (!/^[-a-z0-9]+$/.test(missionId)) throw new Error('missionId must be lowercase kebab-case');
  const days = dates.map((date, i) => ({ day: i + 1, date, stormLevel: 0, events: [] }));
  const byDate = new Map(days.map(day => [day.date, day]));
  const seen = new Set();
  for (const type of EVENT_TYPES) {
    const records = datasets[type];
    if (!Array.isArray(records)) throw new Error(`Missing ${type} raw dataset`);
    for (const record of records) {
      const item = normalizeDonkiEvent(type, record, mapping);
      const day = byDate.get(item.date);
      if (!day) continue; // NASA may return an event starting just outside requested UTC dates.
      const dedupKey = `${type}:${item.event.sourceId}`;
      if (seen.has(dedupKey)) continue;
      seen.add(dedupKey);
      day.events.push(item.event);
      day.stormLevel = Math.max(day.stormLevel, item.level);
    }
  }
  for (const day of days) {
    day.events.sort((a, b) => a.type.localeCompare(b.type) || a.sourceId.localeCompare(b.sourceId));
  }
  const mission = {
    missionId,
    title,
    site: config.site,
    dataSource: 'NASA DONKI (archived data)',
    window: { start: dates[0], end: dates.at(-1) },
    days,
  };
  validateMission(mission, config);
  if (!days.some(day => day.stormLevel > 0)) {
    throw new Error('The selected window has no mapped storm day; select a stormy real-data window');
  }
  return mission;
}

export function validateMission(mission, config) {
  if (!mission || typeof mission !== 'object') throw new Error('Mission must be an object');
  if (typeof mission.missionId !== 'string' || !mission.missionId.trim() ||
      typeof mission.title !== 'string' || !mission.title.trim()) {
    throw new Error('missionId and title are required');
  }
  if (mission.site !== config.site || mission.dataSource !== 'NASA DONKI (archived data)') {
    throw new Error('Mission site or archived-data label is incorrect');
  }
  if (!Array.isArray(mission.days) || mission.days.length !== config.missionLengthDays) {
    throw new Error(`Mission must contain exactly ${config.missionLengthDays} days`);
  }
  const dates = missionDates(mission.window?.start, config.missionLengthDays);
  if (mission.window?.end !== dates.at(-1)) throw new Error('Mission window end date does not match length');
  mission.days.forEach((day, i) => {
    if (day.day !== i + 1 || day.date !== dates[i]) throw new Error(`Mission day ${i + 1} date/index invalid`);
    if (!Number.isInteger(day.stormLevel) || day.stormLevel < config.stormLevelRange[0] ||
        day.stormLevel > config.stormLevelRange[1]) {
      throw new Error(`Invalid stormLevel on day ${day.day}`);
    }
    if (!Array.isArray(day.events)) throw new Error(`Invalid events array on day ${day.day}`);
    for (const event of day.events) {
      if (!EVENT_TYPES.includes(event?.type) || typeof event?.label !== 'string' || !event.label.trim() ||
          typeof event.sourceId !== 'string' || !event.sourceId.trim()) {
        throw new Error(`Invalid event/sourceId on day ${day.day}`);
      }
    }
  });
  return true;
}
