/**
 * Reevaluation D.7: pure, deterministic lab-discovery reward rules.
 * All discovery bonuses are simplified GAME Research Points, never scientific measurements.
 * Source claims from NASA OSDR are review-gated for player display.
 */
export const DISCOVERY_SPECIALIST_ROOM = 'science';

export function discoveryOptions(config) {
  const opt = config?.reevaluation?.discovery;
  if (!opt?.enabled) return null;
  for (const key of ['bonusResearchPoints','daysPerDiscovery','maxPerRun','minScienceEnergy']) {
    if (!Number.isInteger(opt[key]) || opt[key] < 1) throw new Error(`Invalid discovery setting: ${key}`);
  }
  if (opt.specialistRoom !== DISCOVERY_SPECIALIST_ROOM) throw new Error('Science specialist room must be Science Lab');
  return opt;
}

export function validateDiscoveryCatalog(catalog) {
  if (!Array.isArray(catalog) || catalog.length === 0) throw new Error('Missing discovery catalog');
  const ids = new Set();
  const studies = new Set();
  for (const item of catalog) {
    if (!item || typeof item.id !== 'string' || !/^[a-z0-9-]+$/.test(item.id) || ids.has(item.id) ||
      !/^OSD-\d+$/.test(item.studyId) || studies.has(item.studyId) ||
      typeof item.title !== 'string' || !item.title.trim() ||
      typeof item.summary !== 'string' || !item.summary.trim() ||
      typeof item.publicSummary !== 'string' || !item.publicSummary.trim() ||
      !item.image || typeof item.image.url !== 'string' ||
      !/^https:\/\//.test(item.image.url) ||
      !/^[a-z0-9-]+\.(jpg|png|webp)$/.test(item.image.filename) ||
      typeof item.image.credit !== 'string' || !item.image.credit.trim() ||
      typeof item.image.source !== 'string' || !item.image.source.startsWith('https://') ||
      typeof item.image.alt !== 'string' || !item.image.alt.trim() ||
      item.sourceUrl !== `https://osdr.nasa.gov/bio/repo/data/studies/${item.studyId}` ||
      typeof item.verified !== 'boolean') throw new Error('Invalid or repeated discovery source');
    ids.add(item.id);
    studies.add(item.studyId);
  }
  return true;
}

export function initialDiscoveryProgress() {
  return { qualifiedDays: 0, runIds: [], popupId: null };
}

export function hasScienceSpecialist(roster, plan, options) {
  if (!options) return false;
  return Array.isArray(roster) && roster.some(person =>
    person.specialty === options.specialistRoom && person.room === options.specialistRoom &&
    person.awayUntilDay == null) &&
    Number.isInteger(plan?.allocation?.science) && plan.allocation.science >= options.minScienceEnergy;
}

/** No RNG, no live API and no bonuses without an actual committed day. */
export function resolveDiscoveryDay(previous, crew, committedPlan, config, catalog, lifetimeIds = []) {
  validateDiscoveryCatalog(catalog);
  const opt = discoveryOptions(config);
  const progress = previous ?? initialDiscoveryProgress();
  if (!opt) return { progress, reward: null };
  if (!hasScienceSpecialist(crew, committedPlan, opt)) return { progress: { ...progress, popupId: null }, reward: null };
  const qualifiedDays = progress.qualifiedDays + 1;
  const runIds = [...progress.runIds];
  let reward = null;
  if (qualifiedDays % opt.daysPerDiscovery === 0 && runIds.length < Math.min(opt.maxPerRun, catalog.length)) {
    const seen = new Set([...runIds, ...sanitizeDiscoveryIds(lifetimeIds, catalog)]);
    const next = catalog.find(item => !seen.has(item.id));
    if (next) {
      reward = { id: next.id, points: opt.bonusResearchPoints };
      runIds.push(next.id);
    }
  }
  return { progress: { qualifiedDays, runIds, popupId: reward?.id ?? null }, reward };
}

/** Adds specialist Research reward to the same engine ledger & visible daily report. */
export function creditDiscoveryToSession(session, reward) {
  if (!reward) return session;
  if (session?.screen !== 'report' || !session.game?.history?.length ||
      !Number.isInteger(reward.points) || reward.points <= 0) throw new Error('Discovery reward requires a completed report');
  const old = session.game.history.at(-1);
  if (old.discoveryBonus) throw new Error('Discovery reward already included for this day');
  const available = session.game.research.available + reward.points;
  const earned = session.game.research.earned + reward.points;
  const history = {
    ...old,
    research: { ...old.research, gained: old.research.gained + reward.points, total: earned, available },
    discoveryBonus: { id: reward.id, points: reward.points },
    events: [...old.events, `Space Biology Lab breakthrough: +${reward.points} bonus Research game points.`],
  };
  return {
    ...session,
    game: {
      ...session.game,
      research: { ...session.game.research, available, earned },
      history: [...session.game.history.slice(0, -1), history],
    },
    reveal: { ...session.reveal, history },
  };
}

/** A child-friendly entry without links or validation workflow exposed in the UI.
 * Always prefer the readable, topic-level educational explanation, even when
 * the underlying study later passes review; full study-specific prose remains
 * internal and is never substituted for the explanation children see.
 * Photo metadata gives provenance but does not imply the photo documents this study.
 */
export function discoveryPresentation(entry, index = 0) {
  if (!entry) return null;
  const description = entry.publicSummary;
  if (typeof description !== 'string' || !description.trim()) throw new Error('Missing safe discovery description');
  return {
    id: entry.id,
    title: entry.title,
    description,
    studyId: entry.studyId,
    image: entry.image ?? null,
  };
}

export function sanitizeDiscoveryIds(ids, catalog) {
  if (!Array.isArray(ids)) return [];
  const known = new Set(catalog.map(item => item.id));
  return [...new Set(ids.filter(id => typeof id === 'string' && known.has(id)))].slice(0, catalog.length);
}

export function addLifetimeDiscoveryIds(existing, newIds, catalog) {
  return sanitizeDiscoveryIds([...existing, ...newIds], catalog);
}
