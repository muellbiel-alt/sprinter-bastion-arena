// Deterministic Mulberry32 pseudo-random number generator and sampling helpers.
// Every run and screenshot scene with the same numeric seed produces identical trajectories.

export function createSeededRandom(seed = 1) {
  let state = (seed | 0) ^ 0x9e3779b9;
  return function nextFloat() {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomRange(random, min, max) {
  return min + random() * (max - min);
}

export function randomInt(random, min, maxInclusive) {
  return min + Math.floor(random() * (maxInclusive - min + 1));
}

export function randomChoice(random, items) {
  if (!items || items.length === 0) return null;
  return items[Math.floor(random() * items.length)];
}

export function deterministicShuffle(random, items) {
  const copy = items.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const temp = copy[i];
    copy[i] = copy[j];
    copy[j] = temp;
  }
  return copy;
}
