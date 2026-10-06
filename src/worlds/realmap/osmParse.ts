/** Pure OpenStreetMap decoding (no app imports), shared by the main thread and the background map worker. */
import type { BBox } from './geo';
export type OsmBuilding = { pts: [number, number][]; h: number; name?: string };
export type OsmRoad = { pts: [number, number][]; w: number; name?: string };
export type OsmPoi = { lat: number; lng: number; name: string; kind: string };
/** CHUNK_V: 2 = street/building names, 3 = malls, brands and fuel pumps (older saved blocks are refreshed quietly). */
export const CHUNK_V = 3;
export type OsmChunk = { buildings: OsmBuilding[]; roads: OsmRoad[]; pois: OsmPoi[]; fetchedAt: number; v?: number };

export const MAX_BUILDINGS = 400;
export const MAX_ROADS = 250;
export const MAX_POIS = 60;



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
    `nwr["shop"]["name"](${box});` +
    `nwr["amenity"~"^(restaurant|cafe|fast_food|fuel|bank|atm|hospital|pharmacy|school|college|cinema|theatre|marketplace|place_of_worship|food_court|bar|pub)$"]["name"](${box});` +
    `nwr["tourism"~"^(hotel|attraction|museum)$"]["name"](${box});` +
    `nwr["office"]["name"](${box});` +
    `);out geom tags;`;
}

export function buildingHeight(tags: Record<string, string> = {}): number {
  const h = parseFloat(tags.height ?? '');
  if (Number.isFinite(h) && h > 1) return Math.min(h, 300);
  const lv = parseFloat(tags['building:levels'] ?? '');
  if (Number.isFinite(lv) && lv > 0) return Math.min(lv * 3.2, 300);
  return 7;
}

/** Simple place kinds shown on the map: fuel, mall, fast food, food, shop, hotel, office, place. */
export function poiKind(t: Record<string, string>): string {
  if (t.amenity === 'fuel') return 'fuel';
  if (t.shop === 'mall' || t.shop === 'department_store') return 'mall';
  if (t.amenity === 'fast_food' || t.amenity === 'food_court') return 'fast_food';
  if (t.amenity === 'restaurant' || t.amenity === 'cafe' || t.amenity === 'bar' || t.amenity === 'pub') return 'food';
  if (t.shop) return t.shop === 'supermarket' ? 'supermarket' : 'shop';
  if (t.tourism) return 'hotel';
  if (t.office) return 'office';
  return t.amenity ?? 'place';
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
    const placeName = (tags.brand && !tags.name ? tags.brand : tags.name) as string | undefined;
    const isPlace = !!placeName && !!(tags.shop || tags.amenity || tags.tourism || tags.office);
    if (isPlace && el.type !== 'node' && el.geometry?.length && pois.length < MAX_POIS * scale) {
      const g = el.geometry.filter((q) => Number.isFinite(q.lat) && Number.isFinite(q.lon));
      if (g.length) pois.push({ lat: g.reduce((a, q) => a + q.lat, 0) / g.length, lng: g.reduce((a, q) => a + q.lon, 0) / g.length, name: placeName!.slice(0, 40), kind: poiKind(tags) });
    }
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
        pois.push({ lat: el.lat!, lng: el.lon!, name: tags.name.slice(0, 40), kind: poiKind(tags) });
      }
    }
  }
  return { buildings, roads, pois, fetchedAt: Date.now(), v: CHUNK_V };
}
