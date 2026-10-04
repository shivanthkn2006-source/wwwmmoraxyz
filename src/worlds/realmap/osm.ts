/**
 * OpenStreetMap chunk loader: Overpass query → compact features, cached on
 * the device (IndexedDB `mmora_spatial_cache_v1`) so a returning member loads
 * their neighbourhood with zero network requests.
 */
import type { BBox } from './geo';
import { supabase } from '@/integrations/supabase/client';

export type OsmBuilding = { pts: [number, number][]; h: number; name?: string };
export type OsmRoad = { pts: [number, number][]; w: number; name?: string };
export type OsmPoi = { lat: number; lng: number; name: string; kind: string };
export type OsmChunk = { buildings: OsmBuilding[]; roads: OsmRoad[]; pois: OsmPoi[]; fetchedAt: number };

export const MAX_BUILDINGS = 400;
export const MAX_ROADS = 250;
export const MAX_POIS = 30;

const MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];

const ROAD_WIDTH: Record<string, number> = {
  motorway: 14, trunk: 12, primary: 10, secondary: 8, tertiary: 7,
  residential: 6, unclassified: 5, service: 3.5, living_street: 4,
};
const SKIP_ROADS = new Set(['footway', 'path', 'steps', 'cycleway', 'bridleway', 'corridor', 'proposed', 'construction']);

export function buildQuery(b: BBox): string {
  const box = `${b.south},${b.west},${b.north},${b.east}`;
  return `[out:json][timeout:25];(` +
    `way["building"](${box});` +
    `way["highway"](${box});` +
    `node["shop"]["name"](${box});` +
    `node["amenity"~"restaurant|cafe|fast_food|bank|hospital|pharmacy|school|cinema|marketplace|place_of_worship"]["name"](${box});` +
    `);out geom tags;`;
}

export function buildingHeight(tags: Record<string, string> = {}): number {
  const h = parseFloat(tags.height ?? '');
  if (Number.isFinite(h) && h > 1) return Math.min(h, 300);
  const lv = parseFloat(tags['building:levels'] ?? '');
  if (Number.isFinite(lv) && lv > 0) return Math.min(lv * 3.2, 300);
  return 7;
}

type RawEl = {
  type: string; lat?: number; lon?: number;
  tags?: Record<string, string>;
  geometry?: { lat: number; lon: number }[];
};

export function parseOverpass(json: { elements?: RawEl[] }, cap = MAX_BUILDINGS): OsmChunk {
  const scale = cap / MAX_BUILDINGS;
  const buildings: OsmBuilding[] = [];
  const roads: OsmRoad[] = [];
  const pois: OsmPoi[] = [];
  for (const el of json.elements ?? []) {
    const tags = el.tags ?? {};
    if (el.type === 'way' && el.geometry && el.geometry.length >= 2) {
      const pts = el.geometry
        .filter((g) => Number.isFinite(g.lat) && Number.isFinite(g.lon))
        .map((g) => [g.lat, g.lon] as [number, number]);
      if (tags.building && pts.length >= 4 && buildings.length < cap) {
        buildings.push({ pts, h: buildingHeight(tags), ...(tags.name ? { name: tags.name.slice(0, 50) } : {}) });
      } else if (tags.highway && !SKIP_ROADS.has(tags.highway) && roads.length < MAX_ROADS * scale) {
        roads.push({ pts, w: ROAD_WIDTH[tags.highway] ?? 4, ...(tags.name ? { name: tags.name.slice(0, 50) } : {}) });
      }
    } else if (el.type === 'node' && tags.name && Number.isFinite(el.lat) && Number.isFinite(el.lon)) {
      if (pois.length < MAX_POIS * scale) {
        pois.push({ lat: el.lat!, lng: el.lon!, name: tags.name.slice(0, 40), kind: tags.shop ? 'shop' : tags.amenity ?? 'place' });
      }
    }
  }
  return { buildings, roads, pois, fetchedAt: Date.now() };
}

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
async function sharedGet(key: string): Promise<OsmChunk | null> {
  try {
    const { data, error } = await supabase.functions.invoke('osm-tile', { body: { action: 'get', key } });
    if (error || !data?.data) return null;
    loaderStats.shared++;
    return { ...(data.data as OsmChunk), fetchedAt: Date.now() };
  } catch { return null; }
}
function sharedPut(key: string, c: OsmChunk) {
  void supabase.functions.invoke('osm-tile', { body: { action: 'put', key, data: { buildings: c.buildings, roads: c.roads, pois: c.pois } } }).catch(() => {});
}

async function fetchMirrors(query: string, cap = MAX_BUILDINGS): Promise<OsmChunk | null> {
  for (let pass = 0; pass < 2; pass++) {
  if (pass) await new Promise((r) => setTimeout(r, 1500));
  for (const url of MIRRORS) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 15_000);
    try {
      const res = await fetch(url, { method: 'POST', body: 'data=' + encodeURIComponent(query), headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, signal: ctl.signal });
      if (res.ok) return parseOverpass(await res.json(), cap);
    } catch { /* next mirror */ } finally { clearTimeout(t); }
  }
  }
  return null;
}

/** Put each parsed feature in the chunk that holds its first point. */
export function splitByChunk(all: OsmChunk, keyOf: (lat: number, lng: number) => string): Map<string, OsmChunk> {
  const out = new Map<string, OsmChunk>();
  const get = (k: string) => { let c = out.get(k); if (!c) { c = { buildings: [], roads: [], pois: [], fetchedAt: all.fetchedAt }; out.set(k, c); } return c; };
  all.buildings.forEach((b) => get(keyOf(b.pts[0][0], b.pts[0][1])).buildings.push(b));
  all.roads.forEach((r) => get(keyOf(r.pts[0][0], r.pts[0][1])).roads.push(r));
  all.pois.forEach((p) => get(keyOf(p.lat, p.lng)).pois.push(p));
  return out;
}

// Missing blocks requested within 1.2 s are fetched in ONE map request
// (public map servers rate-limit many small requests with 429/504).
type Pending = { key: string; bbox: BBox; resolve: (c: OsmChunk | null) => void };
let batch: Pending[] = [];
let batchTimer: ReturnType<typeof setTimeout> | null = null;
let keyOfFn: ((lat: number, lng: number) => string) | null = null;
export function setChunkKeyFn(fn: (lat: number, lng: number) => string) { keyOfFn = fn; }

async function flushBatch() {
  const items = batch; batch = []; batchTimer = null;
  if (!items.length) return;
  const union: BBox = {
    south: Math.min(...items.map((i) => i.bbox.south)), west: Math.min(...items.map((i) => i.bbox.west)),
    north: Math.max(...items.map((i) => i.bbox.north)), east: Math.max(...items.map((i) => i.bbox.east)),
  };
  await slot();
  try {
    const all = await fetchMirrors(buildQuery(union), items.length * 400);
    if (!all || !keyOfFn) { loaderStats.failures += items.length; items.forEach((i) => i.resolve(null)); return; }
    loaderStats.network++;
    const parts = splitByChunk(all, keyOfFn);
    for (const i of items) {
      const c = parts.get(i.key) ?? { buildings: [], roads: [], pois: [], fetchedAt: all.fetchedAt };
      void cachePut(i.key, c); sharedPut(i.key, c); i.resolve(c);
    }
  } finally { release(); }
}

/** Never throws. Resolves null when every map server failed. */
export function loadChunk(key: string, bbox: BBox): Promise<OsmChunk | null> {
  const existing = inflight.get(key);
  if (existing) return existing;
  const p = (async () => {
    const cached = await cacheGet(key);
    if (cached) { loaderStats.cacheHits++; return cached; }
    const shared = await sharedGet(key);
    if (shared) { void cachePut(key, shared); return shared; }
    return new Promise<OsmChunk | null>((resolve) => {
      batch.push({ key, bbox, resolve });
      if (!batchTimer) batchTimer = setTimeout(() => void flushBatch(), 1200);
    });
  })();
  inflight.set(key, p);
  p.finally(() => setTimeout(() => inflight.delete(key), 0));
  return p;
}
