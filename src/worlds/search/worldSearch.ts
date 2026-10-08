/**
 * In-world search: only things inside VR World — members here now (friends,
 * followers, new), your friends, real streets, named buildings, places and
 * shops from the loaded map, street relics, and M'Mora Village landmarks.
 */
import type { OsmChunk } from '../realmap/osm';

export type ResultKind = 'member' | 'friend' | 'street' | 'building' | 'place' | 'relic' | 'landmark' | 'city' | 'home';
export type WorldResult = {
  id: string; kind: ResultKind; title: string; detail: string;
  /** where to go: local x/z (M'Mora Village) or lat/lng (Real Map) */
  at?: { x: number; z: number } | { lat: number; lng: number };
  userId?: string;
};

export const KIND_LABEL: Record<ResultKind, string> = {
  member: 'Here now', friend: 'Friend', street: 'Street', building: 'Building', place: 'Place', relic: 'Relic', landmark: "M'Mora Village", city: 'City or place', home: 'Your location',
};

const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').trim();

/** Pure scoring: prefix of the whole name beats prefix of a word beats anywhere. */
export function score(name: string, q: string): number {
  const n = norm(name), t = norm(q);
  if (!t || !n) return 0;
  if (n === t) return 100;
  if (n.startsWith(t)) return 80;
  if (n.split(/[\s\-_.@]+/).some((w) => w.startsWith(t))) return 60;
  return n.includes(t) ? 30 : 0;
}

export type SearchSources = {
  members: { id: string; name: string; username: string; tag: string; mode: string; x?: number; z?: number; lat?: number; lng?: number }[];
  friends: { id: string; username: string; name: string }[];
  blocks: Iterable<OsmChunk>;
  relics: { id: string; type: string; rarity: string; lat: number; lng: number }[];
  landmarks: { id: string; title: string; x: number; z: number }[];
};

const TAG_WORD: Record<string, string> = { friend: 'Friend', follower: 'Follower', unknown: 'New' };

export function searchWorld(q: string, src: SearchSources, limit = 12): WorldResult[] {
  if (norm(q).length < 1) return [];
  const out: (WorldResult & { s: number })[] = [];
  const add = (r: WorldResult, ...names: string[]) => {
    const s = Math.max(...names.map((n) => score(n, q)));
    if (s > 0) out.push({ ...r, s: s + (r.kind === 'member' ? 15 : r.kind === 'friend' ? 10 : 0) });
  };
  const here = new Set<string>();
  for (const m of src.members) {
    here.add(m.id);
    const at = m.mode === 'mmora' ? (m.x !== undefined && m.z !== undefined ? { x: m.x, z: m.z } : undefined)
      : (m.lat !== undefined && m.lng !== undefined ? { lat: m.lat, lng: m.lng } : undefined);
    add({ id: `m:${m.id}`, kind: 'member', title: `@${m.username}`, detail: `${TAG_WORD[m.tag] ?? 'New'} · ${m.name}`, at, userId: m.id }, m.username, m.name);
  }
  for (const f of src.friends) if (!here.has(f.id)) add({ id: `f:${f.id}`, kind: 'friend', title: `@${f.username}`, detail: `Friend · not here now — invite to the portal`, userId: f.id }, f.username, f.name);
  const seen = new Set<string>();
  for (const b of src.blocks) {
    for (const r of b.roads) if (r.name && !seen.has(`s:${r.name}`)) {
      seen.add(`s:${r.name}`);
      const p = r.pts[Math.floor(r.pts.length / 2)];
      add({ id: `s:${r.name}`, kind: 'street', title: r.name, detail: '', at: { lat: p[0], lng: p[1] } }, r.name);
    }
    for (const bd of b.buildings) if (bd.name && !seen.has(`b:${bd.name}`)) {
      seen.add(`b:${bd.name}`);
      const p = bd.pts[0];
      add({ id: `b:${bd.name}`, kind: 'building', title: bd.name, detail: `${Math.round(bd.h)} m tall`, at: { lat: p[0], lng: p[1] } }, bd.name);
    }
    for (const p of b.pois) if (!seen.has(`p:${p.name}`)) {
      seen.add(`p:${p.name}`);
      add({ id: `p:${p.name}`, kind: 'place', title: p.name, detail: p.kind.replace(/_/g, ' '), at: { lat: p.lat, lng: p.lng } }, p.name, p.kind);
    }
  }
  for (const r of src.relics) add({ id: `r:${r.id}`, kind: 'relic', title: `${r.rarity} ${r.type}`, detail: 'on your street', at: { lat: r.lat, lng: r.lng } }, r.type, r.rarity, 'relic');
  for (const l of src.landmarks) add({ id: `l:${l.id}`, kind: 'landmark', title: l.title, detail: '', at: { x: l.x, z: l.z } }, l.title);
  return out.sort((a, b) => b.s - a.s).slice(0, limit).map(({ s: _s, ...r }) => r);
}
