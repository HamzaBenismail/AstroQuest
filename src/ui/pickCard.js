// Chooses which "Real NASA Science" card (F6) to show for the current day context.
//
// SHIPPING GUARD (CLAUDE.md §6.6): a card is only ever eligible if `verified === true`.
// Cards with verified:false must never reach the player, no matter their trigger. This
// function is the single choke point that enforces that rule; tests assert it.
//
// Pure: no state, no DOM — given cards + context, returns one card or null.
export function pickCard(cards, context) {
  // Iterate triggers in priority order (not card-array order) so the most relevant
  // category wins, then take the first verified card in that category.
  for (const trigger of matchingTriggers(context)) {
    const card = cards.find((c) => c.verified === true && c.trigger === trigger)
    if (card) return card
  }
  return null
}

// Maps the day context to the triggers that apply, most-specific first so a severe storm
// day surfaces the storm card ahead of a night card. Triggers mirror the cards.json schema
// (§6.6): 'storm-severe' | 'greenhouse-low' | 'night'.
export function matchingTriggers(context) {
  const triggers = []
  if (context.stormSevere) triggers.push('storm-severe')
  if (context.greenhouseLow) triggers.push('greenhouse-low')
  if (context.isNight) triggers.push('night')
  return triggers
}
