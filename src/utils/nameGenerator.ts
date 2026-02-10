// Utility: deterministic-ish offline name generator (no API, no hallucinated counts)

const DEFAULT_SYLLABLES = [
  'za', 'zo', 'zi', 'ra', 'ri', 'ro', 'na', 'ni', 'no', 'sa', 'si', 'so', 'la', 'li', 'lo',
  'mi', 'ma', 'mo', 'ka', 'ki', 'ko', 'ta', 'ti', 'to', 'sha', 'shi', 'shu', 'ya', 'yo',
  'vi', 'va', 've', 'ne', 'no', 'lu', 'le', 'ly', 'el', 'ar', 'an', 'in', 'on',
];

export type NameStyle = 'modern' | 'traditional' | 'neutral';

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function makeName(rand: () => number, syllables: string[], min = 2, max = 3) {
  const count = Math.floor(rand() * (max - min + 1)) + min;
  let s = '';
  for (let i = 0; i < count; i++) {
    s += syllables[Math.floor(rand() * syllables.length)];
  }
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function generateNames(options?: {
  count?: number;
  seed?: number;
  style?: NameStyle;
}): string[] {
  const count = Math.max(1, Math.min(100, options?.count ?? 20));
  const seed = options?.seed ?? Date.now();
  const style: NameStyle = options?.style ?? 'neutral';

  // Simple style tweaks (kept offline + deterministic)
  const syllables = [...DEFAULT_SYLLABLES];
  if (style === 'traditional') {
    syllables.push('de', 'va', 'shri', 'jai', 'sri', 'an', 'ka', 'na', 'ram', 'dev');
  }

  const rand = mulberry32(seed);
  const set = new Set<string>();
  while (set.size < count) {
    set.add(makeName(rand, syllables));
  }
  return Array.from(set);
}
