import { describe, it, expect } from 'vitest'
import { pickCard } from '../src/ui/pickCard.js'
import cards from '../src/data/cards.json'

// End-to-end honesty guard against the REAL shipped cards.json (§6.6): no matter the
// context, the real data must never surface a verified:false card to the player.
describe('shipped cards.json never exposes an unverified card', () => {
  const contexts = [
    { stormSevere: true },
    { greenhouseLow: true },
    { isNight: true },
    { stormSevere: true, greenhouseLow: true, isNight: true },
    {},
  ]

  it.each(contexts)('pickCard returns only verified cards for context %o', (context) => {
    const picked = pickCard(cards, context)
    if (picked !== null) {
      expect(picked.verified).toBe(true)
    }
  })

  it('every card object has the required schema fields', () => {
    for (const card of cards) {
      expect(card).toHaveProperty('id')
      expect(card).toHaveProperty('trigger')
      expect(card).toHaveProperty('verified')
      expect(typeof card.verified).toBe('boolean')
    }
  })

  it('no verified card carries a null/empty studyId or url (verified implies real source)', () => {
    for (const card of cards) {
      if (card.verified === true) {
        expect(card.source?.studyId).toBeTruthy()
        expect(card.source?.url).toBeTruthy()
      }
    }
  })
})
