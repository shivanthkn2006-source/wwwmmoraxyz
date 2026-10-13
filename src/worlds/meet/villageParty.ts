/**
 * M'Mora Village multiplayer: at most VILLAGE_CAP members play together in one
 * village room. Everyone ranks the room's members the same way (earliest join
 * first, then id), so all phones agree who is in without a server. Anyone
 * ranked past the cap moves on to the next copy of the village ("#2", "#3"…).
 */
export const VILLAGE_CAP = 5;
export const MAX_SHARDS = 40;

export type PartyEntry = { id: string; since: number };

export const isVillageRoom = (room: string | null | undefined) => !!room && room.startsWith('mmora:');
export const shardRoom = (base: string, shard: number) => (shard <= 1 ? base : `${base}#${shard}`);

/** Ranks entries and returns the ids allowed in (first `cap`). */
export function admitted(entries: PartyEntry[], cap = VILLAGE_CAP): Set<string> {
  const seen = new Map<string, number>();
  for (const e of entries) {
    if (!e?.id) continue;
    const s = Number.isFinite(e.since) ? e.since : Number.MAX_SAFE_INTEGER;
    seen.set(e.id, Math.min(seen.get(e.id) ?? Infinity, s));
  }
  const ranked = [...seen.entries()].sort((a, b) => a[1] - b[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  return new Set(ranked.slice(0, cap).map(([id]) => id));
}
