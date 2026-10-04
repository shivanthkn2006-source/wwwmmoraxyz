// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { toLocal, toLatLng, chunkOf, chunkBBox, neighborhood } from '@/worlds/realmap/geo';
import { parseOverpass, buildingHeight, buildQuery } from '@/worlds/realmap/osm';
import { buildBuildingsGeometry, buildRoadsGeometry } from '@/worlds/realmap/RealMapWorld';
import { portalStep, enterMMora, returnToReal, getWorldState, __resetWorldForTests, MMORA_SPAWN } from '@/worlds/worldMode';
import { demoPosition, DEMO_RADIUS } from '@/worlds/realmap/DemoExplorer';

const O = { lat: 12.9716, lng: 77.5946 };

describe('geo', () => {
  it('round-trips lat/lng ↔ meters within 1 cm', () => {
    const p = toLatLng(150, -230, O);
    const back = toLocal(p, O);
    expect(back.x).toBeCloseTo(150, 2);
    expect(back.z).toBeCloseTo(-230, 2);
  });
  it('north is −z and 0.0018° ≈ 200 m', () => {
    const { z } = toLocal({ lat: O.lat + 0.0018, lng: O.lng }, O);
    expect(z).toBeLessThan(0);
    expect(Math.abs(z)).toBeGreaterThan(195);
    expect(Math.abs(z)).toBeLessThan(205);
  });
  it('chunk keys are stable and the bbox contains the point', () => {
    const a = chunkOf(O), b = chunkOf({ lat: O.lat + 1e-6, lng: O.lng + 1e-6 });
    expect(a.key).toBe(b.key);
    const bb = chunkBBox(a.i, a.j, O.lat);
    expect(O.lat).toBeGreaterThanOrEqual(bb.south); expect(O.lat).toBeLessThan(bb.north);
    expect(O.lng).toBeGreaterThanOrEqual(bb.west); expect(O.lng).toBeLessThan(bb.east);
  });
  it('3×3 neighborhood is 9 chunks, centre first', () => {
    const n = neighborhood(5, 7, 1);
    expect(n).toHaveLength(9);
    expect(n[0].key).toBe('5_7');
  });
});

const SAMPLE = {
  elements: [
    { type: 'way', tags: { building: 'yes', 'building:levels': '4' }, geometry: [
      { lat: O.lat, lon: O.lng }, { lat: O.lat, lon: O.lng + 0.0002 },
      { lat: O.lat + 0.0002, lon: O.lng + 0.0002 }, { lat: O.lat, lon: O.lng }] },
    { type: 'way', tags: { highway: 'residential' }, geometry: [{ lat: O.lat, lon: O.lng }, { lat: O.lat + 0.001, lon: O.lng }] },
    { type: 'way', tags: { highway: 'footway' }, geometry: [{ lat: O.lat, lon: O.lng }, { lat: O.lat + 0.001, lon: O.lng }] },
    { type: 'node', lat: O.lat, lon: O.lng, tags: { shop: 'bakery', name: 'Corner Bakery' } },
    { type: 'node', lat: O.lat, lon: O.lng, tags: { shop: 'x' } },
  ],
};

describe('osm', () => {
  it('parses buildings, drivable roads and named places only', () => {
    const c = parseOverpass(SAMPLE);
    expect(c.buildings).toHaveLength(1);
    expect(c.buildings[0].h).toBeCloseTo(12.8);
    expect(c.roads).toHaveLength(1);
    expect(c.pois).toEqual([{ lat: O.lat, lng: O.lng, name: 'Corner Bakery', kind: 'shop' }]);
  });
  it('height falls back sensibly', () => {
    expect(buildingHeight({ height: '30' })).toBe(30);
    expect(buildingHeight({})).toBe(7);
  });
  it('query asks for geometry inside the box', () => {
    expect(buildQuery({ south: 1, west: 2, north: 3, east: 4 })).toContain('(1,2,3,4)');
  });
  it('survives an empty / broken response', () => {
    expect(parseOverpass({}).buildings).toHaveLength(0);
  });
  it('builds one merged building mesh and a road ribbon with no NaN', () => {
    const c = parseOverpass(SAMPLE);
    const b = buildBuildingsGeometry(c, O)!;
    const r = buildRoadsGeometry(c, O)!;
    const all = [...(b.attributes.position.array as Float32Array), ...(r.attributes.position.array as Float32Array)];
    expect(all.some(Number.isNaN)).toBe(false);
    b.computeBoundingBox();
    expect(b.boundingBox!.max.y).toBeCloseTo(12.8, 1);
  });
});

describe('portal + worlds', () => {
  beforeEach(() => __resetWorldForTests());
  it('fires once, then re-arms only after walking away', () => {
    let s = portalStep(false, 8); expect(s).toEqual({ armed: true, fire: false });
    s = portalStep(s.armed, 1); expect(s.fire).toBe(true);
    s = portalStep(s.armed, 1); expect(s.fire).toBe(false);
    s = portalStep(s.armed, 3); expect(s.armed).toBe(false);
    s = portalStep(s.armed, 5); expect(s.armed).toBe(true);
  });
  it('enter saves the street spot and return restores it', () => {
    const tp: number[][] = [];
    const on = (e: Event) => tp.push((e as CustomEvent).detail.position);
    window.addEventListener('vr-teleport', on);
    enterMMora([10, 1.6, -20]);
    expect(getWorldState().mode).toBe('mmora');
    expect(tp[0]).toEqual(MMORA_SPAWN);
    enterMMora([0, 0, 0]); // ignored while inside
    returnToReal();
    expect(getWorldState().mode).toBe('real');
    expect(tp[1]).toEqual([10, 1.6, -17]);
    expect(getWorldState().portalTrips).toBe(2);
    window.removeEventListener('vr-teleport', on);
  });
  it('demo explorer walks a 25 m loop', () => {
    const [x, z] = demoPosition(7);
    expect(Math.hypot(x, z)).toBeCloseTo(DEMO_RADIUS);
  });
});

import { journeyReduce, WALK_GOAL_M } from '@/worlds/journeyQuest';
describe('journey quest', () => {
  it('walk → doorway → beacon → done, ignoring teleport jumps and out-of-order events', () => {
    let s = { step: 'walk' as const, walked: 0 } as ReturnType<typeof journeyReduce>;
    s = journeyReduce(s, { type: 'entered-mmora' }); expect(s.step).toBe('walk');
    s = journeyReduce(s, { type: 'walked', meters: 500 }); expect(s.walked).toBe(20);
    for (let k = 0; k < 3; k++) s = journeyReduce(s, { type: 'walked', meters: 15 });
    expect(s.walked).toBeGreaterThanOrEqual(WALK_GOAL_M); expect(s.step).toBe('doorway');
    s = journeyReduce(s, { type: 'near-beacon' }); expect(s.step).toBe('doorway');
    s = journeyReduce(s, { type: 'entered-mmora' }); expect(s.step).toBe('beacon');
    s = journeyReduce(s, { type: 'near-beacon' }); expect(s.step).toBe('done');
  });
});

import { splitByChunk } from '@/worlds/realmap/osm';
describe('area split', () => {
  it('puts every feature in the chunk of its first point', () => {
    const all = parseOverpass(SAMPLE);
    const far = { ...all, pois: [...all.pois, { lat: O.lat + 0.01, lng: O.lng, name: 'Far', kind: 'shop' }] };
    const parts = splitByChunk(far, (lat, lng) => chunkOf({ lat, lng }, O.lat).key);
    const home = parts.get(chunkOf(O).key)!;
    expect(home.buildings).toHaveLength(1);
    expect(home.pois.map((p) => p.name)).toEqual(['Corner Bakery']);
    expect(parts.size).toBe(2);
  });
});

import { startAerialEntry, landOnStreet } from '@/worlds/worldMode';
describe('aerial entry', () => {
  beforeEach(() => __resetWorldForTests());
  it('opens 500 m up once per session, then lands on the street', () => {
    const modes: string[] = [];
    const on = (e: Event) => modes.push((e as CustomEvent).detail.mode);
    window.addEventListener('vr-view-transition', on);
    expect(startAerialEntry()).toBe(true);
    expect(getWorldState().aerial).toBe(true);
    expect(startAerialEntry()).toBe(false);
    landOnStreet();
    expect(getWorldState().aerial).toBe(false);
    expect(modes).toEqual(['aerial_real', 'ground']);
    window.removeEventListener('vr-view-transition', on);
  });
});
