// Deterministic seeded RNG (mulberry32). No Math.random() — §8.3 requires forecast
// randomness to be injected and reproducible from a seed.
export function createSeededRng(seed) {
  let state = seed >>> 0
  return function rng() {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
