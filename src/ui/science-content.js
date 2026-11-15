// Phase 6: selection is based on game context, never an invented NASA event.
// Unverified records are never displayed to players.
export function verifiedCards(cards) {
  return (Array.isArray(cards) ? cards : []).filter(card =>
    card?.verified === true &&
    typeof card?.source?.studyId === 'string' &&
    /^OSD-\d+$/.test(card.source.studyId) &&
    typeof card?.source?.url === 'string' &&
    card.source.url.startsWith('https://osdr.nasa.gov/bio/repo/data/studies/')
  );
}

export function verifiedFacts(facts) {
  return (Array.isArray(facts) ? facts : []).filter(fact =>
    fact?.verified === true &&
    typeof fact.text === 'string' &&
    typeof fact.sourceUrl === 'string' &&
    fact.sourceUrl.startsWith('https://')
  );
}

// The game can always show mission-start learning material when it is verified.
// Later cards appear only when their real-game state trigger matches.
export function chooseScienceCard(cards, context) {
  const available = verifiedCards(cards);
  if (!context) return null;
  const { stage, level, greenhouse, meters, night, shownIds = [], severeLevel = 3, lowMeter = 3 } = context;
  const priorities = stage === 'briefing'
    ? ['mission-start']
    : stage === 'report'
      ? [
        ...(level >= severeLevel ? ['storm-severe'] : []),
        ...(meters?.safety <= lowMeter ? ['crew-safety-low'] : []),
        ...(greenhouse === 0 ? ['greenhouse-low'] : ['greenhouse-active']),
        ...(night ? ['energy-limited'] : []),
      ]
      : [];
  return priorities.map(trigger => available.find(card =>
    card.trigger === trigger && !shownIds.includes(card.id)
  )).find(Boolean) ?? null;
}

// Derive one non-repeated study per day from immutable mission history.
// This is display-only: it does not modify game state or outcomes.
export function scienceCardForHistory(cards, history, config) {
  const used = verifiedCards(cards).some(c => c.trigger === 'mission-start')
    ? [verifiedCards(cards).find(c => c.trigger === 'mission-start').id] : [];
  let latest = null;
  for (const entry of history ?? []) {
    latest = chooseScienceCard(cards, {
      stage: 'report', level: entry.stormLevel,
      greenhouse: entry.allocation?.greenhouse,
      meters: entry.meters,
      night: !config.powerBudget.sunlitDays.includes(entry.day),
      severeLevel: config.stormLevelRange[1],
      lowMeter: config.successMinMeter,
      shownIds: used,
    });
    if (latest) used.push(latest.id);
  }
  return latest;
}
