/**
 * The Use button (on-screen "Use", gamepad A/✕, E key) does the nearest real
 * thing within reach: pick up a relic, talk to a nearby player, etc. Each
 * system registers a provider; the closest target wins, so one press never
 * fires two actions.
 */
export type UseTarget = { dist: number; reach?: number; label: string; run: () => void };
type Provider = () => UseTarget | null;

const providers = new Set<Provider>();
export function registerUse(p: Provider) { providers.add(p); return () => { providers.delete(p); }; }

export function pickUse(targets: (UseTarget | null)[]): UseTarget | null {
  let best: UseTarget | null = null;
  for (const t of targets) {
    if (!t || t.dist > (t.reach ?? 3)) continue;
    if (!best || t.dist < best.dist) best = t;
  }
  return best;
}

export function resolveUse(): UseTarget | null {
  const best = pickUse(Array.from(providers, (p) => { try { return p(); } catch { return null; } }));
  if (best) best.run();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('vr-use-result', { detail: { ok: !!best, text: best ? best.label : 'Nothing to use here' } }));
  }
  return best;
}
