/** Small deterministic PRNG. The same seed gives the same sequence in the browser and on the server. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffleWith<T>(items: readonly T[], rand: () => number): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function shuffle<T>(items: readonly T[]): T[] {
  return shuffleWith(items, Math.random);
}

/** Shuffles, retrying a few times so the result differs from the original order when possible. */
export function shuffleChanged<T>(items: readonly T[], key: (item: T) => string = (i) => String(i)): T[] {
  const original = items.map(key).join('\u0000');
  let out = shuffle(items);
  for (let i = 0; i < 8 && items.length > 1 && out.map(key).join('\u0000') === original; i++) out = shuffle(items);
  return out;
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 2147483646) + 1;
}

const ID_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';

export function uid(length = 8): string {
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  let s = '';
  for (const b of bytes) s += ID_CHARS[b % ID_CHARS.length];
  return s;
}
