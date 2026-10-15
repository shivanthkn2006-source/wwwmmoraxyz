/**
 * Village progress that follows the member's account: fuse-puzzle steps,
 * merchant weapon upgrades and extra case rows. All three only ever grow, so
 * merging is "union of steps, highest level per upgrade, most case rows" —
 * an older save from another device can never undo newer progress. The
 * database trigger applies the same merge on every write.
 */
export const PUZZLE_KEY = 'mmora-fuse-puzzle';
export const UPGRADE_KEY = 'mmora-upgrades';
export const CASE_KEY = 'vr-case-extra-rows';
export const VILLAGE_EVENT = 'vr-village-progress';

export type VillageProgress = { steps: string[]; upgrades: Record<string, number>; caseRows: number };

const read = <T,>(k: string, d: T): T => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v ?? d; } catch { return d; } };

export function readVillage(): VillageProgress {
  const steps = read<unknown>(PUZZLE_KEY, []);
  const up = read<unknown>(UPGRADE_KEY, {});
  return {
    steps: Array.isArray(steps) ? steps.filter((s): s is string => typeof s === 'string') : [],
    upgrades: up && typeof up === 'object' ? (up as Record<string, number>) : {},
    caseRows: Math.min(20, Math.max(0, Number(read<unknown>(CASE_KEY, 0)) || 0)),
  };
}

export function mergeVillage(a: Partial<VillageProgress> | null | undefined, b: Partial<VillageProgress> | null | undefined): VillageProgress {
  const steps = [...new Set([...(a?.steps ?? []), ...(b?.steps ?? [])])];
  const upgrades: Record<string, number> = {};
  for (const src of [a?.upgrades ?? {}, b?.upgrades ?? {}]) for (const [k, v] of Object.entries(src)) upgrades[k] = Math.min(5, Math.max(upgrades[k] ?? 0, Number(v) || 0));
  const caseRows = Math.min(20, Math.max(Number(a?.caseRows) || 0, Number(b?.caseRows) || 0));
  return { steps, upgrades, caseRows };
}

/** Writes merged progress to this device; returns true when something changed. */
export function applyVillage(remote: Partial<VillageProgress> | null | undefined): boolean {
  const cur = readVillage();
  const m = mergeVillage(cur, remote);
  const changed = JSON.stringify(m) !== JSON.stringify(cur);
  if (changed) {
    try {
      localStorage.setItem(PUZZLE_KEY, JSON.stringify(m.steps));
      localStorage.setItem(UPGRADE_KEY, JSON.stringify(m.upgrades));
      localStorage.setItem(CASE_KEY, JSON.stringify(m.caseRows));
    } catch { /* private mode */ }
    if (typeof window !== 'undefined') window.dispatchEvent(new Event(VILLAGE_EVENT));
  }
  return changed;
}

/** Call after any local change so the account copy updates. */
export function villageChanged() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(VILLAGE_EVENT));
  void import('@/lib/vrGear').then((m) => m.saveProgressNow());
}
