import { describe, it, expect } from 'vitest'
import { pickCard, matchingTriggers } from '../src/ui/pickCard.js'

const verifiedStorm = { id: 's', trigger: 'storm-severe', verified: true }
const verifiedNight = { id: 'n', trigger: 'night', verified: true }
const verifiedGreenhouse = { id: 'g', trigger: 'greenhouse-low', verified: true }
const unverifiedStorm = { id: 's2', trigger: 'storm-severe', verified: false }

describe('pickCard — the §6.6 shipping guard', () => {
  it('NEVER returns an unverified card, even when its trigger matches', () => {
    const picked = pickCard([unverifiedStorm], { stormSevere: true })
    expect(picked).toBeNull()
  })

  it('returns null when nothing matches', () => {
    const picked = pickCard([verifiedNight], { stormSevere: true })
    expect(picked).toBeNull()
  })

  it('returns a verified card whose trigger matches the context', () => {
    const picked = pickCard([verifiedStorm, verifiedNight], { stormSevere: true })
    expect(picked).toBe(verifiedStorm)
  })

  it('prefers a severe-storm card over a night card on a severe night day', () => {
    const picked = pickCard([verifiedNight, verifiedStorm], { stormSevere: true, isNight: true })
    expect(picked).toBe(verifiedStorm)
  })

  it('prefers a verified card over an earlier unverified one with the same trigger', () => {
    const picked = pickCard([unverifiedStorm, verifiedStorm], { stormSevere: true })
    expect(picked).toBe(verifiedStorm)
  })

  it('falls back to greenhouse / night triggers when there is no storm', () => {
    expect(pickCard([verifiedGreenhouse], { greenhouseLow: true })).toBe(verifiedGreenhouse)
    expect(pickCard([verifiedNight], { isNight: true })).toBe(verifiedNight)
  })
})

describe('matchingTriggers', () => {
  it('orders storm-severe ahead of greenhouse-low ahead of night', () => {
    expect(matchingTriggers({ stormSevere: true, greenhouseLow: true, isNight: true })).toEqual([
      'storm-severe',
      'greenhouse-low',
      'night',
    ])
  })

  it('returns an empty list for a calm, well-supplied day', () => {
    expect(matchingTriggers({})).toEqual([])
  })
})
