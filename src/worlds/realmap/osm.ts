/**
 * OpenStreetMap chunk loader: Overpass query → compact features, cached on
 * the device (IndexedDB `mmora_spatial_cache_v1`) so a returning member loads
 * their neighbourhood with zero network requests.
 */
import type { BBox } from './geo';
import { supabase } from '@/integrations/supabase/client';

export * from './osmParse';
import { parseOverpass, buildQuery, CHUNK_V, MAX_BUILDINGS, type OsmChunk, type OsmBuilding, type OsmRoad, type OsmPoi } from './osmParse';
import { parseInWorker } from './osmWorkerBridge';
const MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];

// ---------- IndexedDB cache ----------
const DB_NAME = 'mmora_spatial_cache_v1';
const STORE = 'chunks';
const TTL_MS = 30 * 24 * 3600 * 1000;

let dbP: Promise<IDBDatabase | null> | null = null;
function db(): Promise<IDBDatabase | null> {
  if (dbP) return dbP;
  dbP = new Promise((resolve) => {
    try {
      if (typeof indexedDB === 'undefined') return resolve(null);
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch { resolve(null); }
  });
  return dbP;
}

async function cacheGet(key: string): Promise<OsmChunk | null> {
  const d = await db();
  if (!d) return null;
  return new Promise((resolve) => {
    try {
      const r = d.transaction(STORE).objectStore(STORE).get(key);
      r.onsuccess = () => {
        const v = r.result as OsmChunk | undefined;
        resolve(v && Date.now() - v.fetchedAt < TTL_MS ? v : null);
      };
      r.onerror = () => resolve(null);
    } catch { resolve(null); }
  });
}

async function cachePut(key: string, v: OsmChunk) {
  const d = await db();
  if (!d) return;
  try { d.transaction(STORE, 'readwrite').objectStore(STORE).put(v, key); } catch { /* quota: skip */ }
}

// ---------- fetch queue (Overpass fair use: max 2 at once) ----------
export const loaderStats = { cacheHits: 0, network: 0, shared: 0, failures: 0 };
const inflight = new Map<string, Promise<OsmChunk | null>>();
let running = 0;
const waiting: (() => void)[] = [];
const slot = () => new Promise<void>((r) => { if (running < 2) { running++; r(); } else waiting.push(() => { running++; r(); }); });
const release = () => { running--; waiting.shift()?.(); };

/** Shared backend cache: blocks other members already downloaded. */
// When the backend is busy (503 etc.) skip the shared cache for a while and
// go straight to the map servers, instead of hammering it on every block.
let sharedDownUntil = 0;
export const sharedCacheDown = () => Date.now() < sharedDownUntil;
function noteSharedError(error: unknown) {
  const status = (error as { context?: { status?: number } } | null)?.context?.status;
  if (!status || status >= 500) sharedDownUntil = Date.now() + 60_000;
}
async function sharedGet(key: string): Promise<OsmChunk | null> {
  if (sharedCacheDown()) return null;
  try {
    const { data, error } = await supabase.functions.invoke('osm-tile', { body: { action: 'get', key } });
    if (error) { noteSharedError(error); return null; }
    if (!data?.data) return null;
    loaderStats.shared++;
    return { ...(data.data as OsmChunk), fetchedAt: Date.now() };
  } catch (e) { noteSharedError(e); return null; }
}
/** Shared-cache limits (osm-tile rejects anything bigger, which silently kept dense city blocks like Chennai unshared). */
export function trimForShare(c: Pick<OsmChunk, 'buildings' | 'roads' | 'pois' | 'v' | 'areas' | 'waterways'>) {
  const pts = <T,>(p: T[]) => (p.length <= 400 ? p : p.filter((_, i) => i % Math.ceil(p.length / 400) === 0).slice(0, 400));
  const named = <T extends { name?: string }>(a: T[], max: number) => (a.length <= max ? a : [...a.filter((x) => x.name), ...a.filter((x) => !x.name)].slice(0, max));
  return {
    buildings: named(c.buildings, 400).map((b) => ({ ...b, pts: pts(b.pts), h: Math.min(300, Math.max(1, b.h || 3)) })),
    roads: named(c.roads, 250).map((r) => ({ ...r, pts: pts(r.pts), w: Math.min(20, Math.max(1, r.w || 4)) })),
    pois: c.pois.slice(0, 60).map((p) => ({ ...p, name: p.name.slice(0, 40) })),
    areas: (c.areas ?? []).slice(0, 40).map((a) => ({ ...a, pts: pts(a.pts) })),
    waterways: (c.waterways ?? []).slice(0, 30).map((w) => ({ ...w, pts: pts(w.pts) })),
    v: c.v,
  };
}
function sharedPut(key: string, c: OsmChunk) {
  if (sharedCacheDown()) return;
  void supabase.functions.invoke('osm-tile', { body: { action: 'put', key, data: trimForShare(c) } })
    .then(({ error }) => { if (error) noteSharedError(error); }).catch(noteSharedError);
}

async function fetchMirrors(query: string, cap = MAX_BUILDINGS): Promise<OsmChunk | null> {
  for (let pass = 0; pass < 2; pass++) {
  if (pass) await new Promise((r) => setTimeout(r, 1500));
  for (const url of MIRRORS) {
    const ctl = new AbortController();
    // Wait a bit longer than the map service's own 25 s limit so slow-but-valid answers are kept.
    const t = setTimeout(() => ctl.abort(), 30_000);
    try {
      const res = await fetch(url, { method: 'POST', body: 'data=' + encodeURIComponent(query), headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, signal: ctl.signal });
      if (res.ok) return await parseInWorker(await res.text(), cap);
    } catch { /* next mirror */ } finally { clearTimeout(t); }
  }
  }
  return null;
}

/** Put each parsed feature in the chunk that holds its first point. */
export function splitByChunk(all: OsmChunk, keyOf: (lat: number, lng: number) => string): Map<string, OsmChunk> {
  const out = new Map<string, OsmChunk>();
  const get = (k: string) => { let c = out.get(k); if (!c) { c = { buildings: [], roads: [], pois: [], fetchedAt: all.fetchedAt, v: all.v }; out.set(k, c); } return c; };
  all.buildings.forEach((b) => get(keyOf(b.pts[0][0], b.pts[0][1])).buildings.push(b));
  all.roads.forEach((r) => get(keyOf(r.pts[0][0], r.pts[0][1])).roads.push(r));
  all.pois.forEach((p) => get(keyOf(p.lat, p.lng)).pois.push(p));
  return out;
}

// Missing blocks requested within 1.2 s are fetched in ONE map request
// (public map servers rate-limit many small requests with 429/504).
type KeyFn = (lat: number, lng: number) => string;
/** keyOf: how this block's features are split (captured per request, so background city preparation never mixes with the live street). */
type Pending = { key: string; bbox: BBox; resolve: (c: OsmChunk | null) => void; keyOf?: KeyFn };
let batch: Pending[] = [];
let batchTimer: ReturnType<typeof setTimeout> | null = null;
let keyOfFn: ((lat: number, lng: number) => string) | null = null;
export function setChunkKeyFn(fn: (lat: number, lng: number) => string) { keyOfFn = fn; }

/** First request = your own block + neighbours; then small groups (busy map servers reject big areas). */
export const FIRST_GROUP = 9;
export const GROUP = 6;
export const RETRY_MS = [5_000, 15_000, 45_000];
export function groupBatch<T>(items: T[]): T[][] {
  const out: T[][] = [];
  for (let k = 0; k < items.length;) { const n = out.length ? GROUP : FIRST_GROUP; out.push(items.slice(k, k + n)); k += n; }
  return out;
}

type MapLoadStatus = { pending: number; retrying: number };
let loadStatus: MapLoadStatus = { pending: 0, retrying: 0 };
const statusLs = new Set<() => void>();
const setStatus = (p: Partial<MapLoadStatus>) => { loadStatus = { ...loadStatus, ...p }; statusLs.forEach((l) => l()); };
export const getMapLoadStatus = () => loadStatus;
export function onMapLoadStatus(l: () => void) { statusLs.add(l); return () => { statusLs.delete(l); }; }

const attempts = new Map<string, number>();
function retryLater(items: Pending[]) {
  const ready: Pending[] = [];
  for (const i of items) {
    const n = attempts.get(i.key) ?? 0;
    if (n >= RETRY_MS.length) { attempts.delete(i.key); loaderStats.failures++; i.resolve(null); continue; }
    attempts.set(i.key, n + 1);
    ready.push(i);
  }
  if (!ready.length) { setStatus({ retrying: Math.max(0, loadStatus.retrying) }); return; }
  setStatus({ retrying: loadStatus.retrying + ready.length });
  const wait = RETRY_MS[(attempts.get(ready[0].key) ?? 1) - 1];
  setTimeout(() => {
    setStatus({ retrying: Math.max(0, loadStatus.retrying - ready.length) });
    batch.push(...ready);
    if (!batchTimer) batchTimer = setTimeout(() => void flushBatch(), 200);
  }, wait);
}

async function fetchGroup(items: Pending[]) {
  const union: BBox = {
    south: Math.min(...items.map((i) => i.bbox.south)), west: Math.min(...items.map((i) => i.bbox.west)),
    north: Math.max(...items.map((i) => i.bbox.north)), east: Math.max(...items.map((i) => i.bbox.east)),
  };
  await slot();
  try {
    const all = await fetchMirrors(buildQuery(union), items.length * 400);
    const keyOf = items[0].keyOf ?? keyOfFn;
    if (!all || !keyOf) { retryLater(items); return; }
    loaderStats.network++;
    const parts = splitByChunk(all, keyOf);
    for (const i of items) {
      attempts.delete(i.key);
      const c = parts.get(i.key) ?? { buildings: [], roads: [], pois: [], fetchedAt: all.fetchedAt, v: CHUNK_V };
      void cachePut(i.key, c); sharedPut(i.key, c); i.resolve(c);
    }
  } finally { release(); }
}

async function flushBatch() {
  const items = batch; batch = []; batchTimer = null;
  if (!items.length) return;
  setStatus({ pending: loadStatus.pending + items.length });
  const byKeyFn = new Map<KeyFn | undefined, Pending[]>();
  for (const i of items) { const l = byKeyFn.get(i.keyOf) ?? []; l.push(i); byKeyFn.set(i.keyOf, l); }
  for (const g of [...byKeyFn.values()].flatMap((l) => groupBatch(l))) {
    await fetchGroup(g);
    setStatus({ pending: Math.max(0, loadStatus.pending - g.length) });
  }
}

/** Older saved blocks have no street/building names: fetch once more in the background (caches update, the search index picks them up). */
const refreshed = new Set<string>();
function refreshNames(key: string, bbox: BBox) {
  if (refreshed.has(key)) return;
  refreshed.add(key);
  batch.push({ key, bbox, resolve: (c) => { if (c) namesListeners.forEach((l) => l(key, c)); } });
  if (!batchTimer) batchTimer = setTimeout(() => void flushBatch(), 1200);
}
const namesListeners = new Set<(key: string, c: OsmChunk) => void>();
export function onNamesRefreshed(fn: (key: string, c: OsmChunk) => void) { namesListeners.add(fn); return () => { namesListeners.delete(fn); }; }

/** Never throws. Resolves null when every map server failed. */
export function loadChunk(key: string, bbox: BBox, keyOf?: KeyFn): Promise<OsmChunk | null> {
  const existing = inflight.get(key);
  if (existing) return existing;
  const p = (async () => {
    const cached = await cacheGet(key);
    if (cached) { loaderStats.cacheHits++; if (cached.v !== CHUNK_V) refreshNames(key, bbox); return cached; }
    const shared = await sharedGet(key);
    if (shared) { void cachePut(key, shared); if (shared.v !== CHUNK_V) refreshNames(key, bbox); return shared; }
    return new Promise<OsmChunk | null>((resolve) => {
      batch.push({ key, bbox, resolve, keyOf });
      if (!batchTimer) batchTimer = setTimeout(() => void flushBatch(), 1200);
    });
  })();
  inflight.set(key, p);
  p.finally(() => setTimeout(() => inflight.delete(key), 0));
  return p;
}
