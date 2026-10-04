/**
 * OpenStreetMap chunk loader: Overpass query → compact features, cached on
 * the device (IndexedDB `mmora_spatial_cache_v1`) so a returning member loads
 * their neighbourhood with zero network requests.
 */
import type { BBox } from './geo';
import { supabase } from '@/integrations/supabase/client';

export type OsmBuilding = { pts: [number, number][]; h: number };
export type OsmRoad = { pts: [number, number][]; w: number };
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
  return `[out:json][timeout:20];(` +
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

export function parseOverpass(json: { elements?: RawEl[] }): OsmChunk {
  const buildings: OsmBuilding[] = [];
  const roads: OsmRoad[] = [];
  const pois: OsmPoi[] = [];
  for (const el of json.elements ?? []) {
    const tags = el.tags ?? {};
    if (el.type === 'way' && el.geometry && el.geometry.length >= 2) {
      const pts = el.geometry
        .filter((g) => Number.isFinite(g.lat) && Number.isFinite(g.lon))
        .map((g) => [g.lat, g.lon] as [number, number]);
      if (tags.building && pts.length >= 4 && buildings.length < MAX_BUILDINGS) {
        buildings.push({ pts, h: buildingHeight(tags) });
      } else if (tags.highway && !SKIP_ROADS.has(tags.highway) && roads.length < MAX_ROADS) {
        roads.push({ pts, w: ROAD_WIDTH[tags.highway] ?? 4 });
      }
    } else if (el.type === 'node' && tags.name && Number.isFinite(el.lat) && Number.isFinite(el.lon)) {
      if (pois.length < MAX_POIS) {
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

async function fetchMirrors(query: string): Promise<OsmChunk | null> {
  for (let pass = 0; pass < 2; pass++) {
  if (pass) await new Promise((r) => setTimeout(r, 1500));
  for (const url of MIRRORS) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 15_000);
    try {
      const res = await fetch(url, { method: 'POST', body: 'data=' + encodeURIComponent(query), headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, signal: ctl.signal });
      if (res.ok) return parseOverpass(await res.json());
    } catch { /* next mirror */ } finally { clearTimeout(t); }
  }
  }
  return null;
}

/** Never throws. Resolves null when every map server failed. */
export function loadChunk(key: string, bbox: BBox): Promise<OsmChunk | null> {
  const existing = inflight.get(key);
  if (existing) return existing;
  const p = (async () => {
    const cached = await cacheGet(key);
    if (cached) { loaderStats.cacheHits++; return cached; }
    await slot();
    try {
      const shared = await sharedGet(key);
      if (shared) { void cachePut(key, shared); return shared; }
      const data = await fetchMirrors(buildQuery(bbox));
      if (data) { loaderStats.network++; void cachePut(key, data); sharedPut(key, data); }
      else loaderStats.failures++;
      return data;
    } finally { release(); }
  })();
  inflight.set(key, p);
  p.finally(() => setTimeout(() => inflight.delete(key), 0));
  return p;
}
