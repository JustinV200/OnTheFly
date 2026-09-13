/* A small seeded pseudo-random generator (mulberry32), so a run's Poisson input is reproducible from its seed.
   Not for anything security-related; it only decides when stimulated neurons receive input events. */

/** Return a function producing uniform numbers in [0, 1) from a 32-bit seed. */
export function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = Math.imul(state ^ (state >>> 15), state | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}
