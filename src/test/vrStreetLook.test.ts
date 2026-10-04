import { describe, it, expect, beforeEach } from 'vitest';
import { buildBuildingParts, buildRoadParts, FLOOR_M } from '@/worlds/realmap/streetLook';
import { collectLabels, nearestLabels } from '@/worlds/realmap/MapLabels';
import { indexBlock, __resetMapIndex } from '@/worlds/realmap/mapIndex';

const o = { lat: 12.97, lng: 77.59 };
const d = 0.0001; // ~11 m
const chunk = {
  buildings: [{ pts: [[o.lat, o.lng], [o.lat, o.lng + d], [o.lat + d, o.lng + d], [o.lat + d, o.lng]] as [number, number][], h: 16, name: 'Lotus Tower' }],
  roads: [
    { pts: [[o.lat - d, o.lng], [o.lat - d, o.lng + 3 * d]] as [number, number][], w: 8, name: 'MG Road' },
    { pts: [[o.lat - 2 * d, o.lng], [o.lat - 2 * d, o.lng + d]] as [number, number][], w: 2 },
  ],
  pois: [],
};

describe('real-map street look', () => {
  beforeEach(() => __resetMapIndex());
  it('builds walls with one window row per floor and a roof at the building height', () => {
    const { walls, roofs } = buildBuildingParts(chunk as never, o);
    expect(walls).toBeTruthy(); expect(roofs).toBeTruthy();
    const uv = walls!.getAttribute('uv');
    let maxV = 0; for (let i = 0; i < uv.count; i++) maxV = Math.max(maxV, uv.getY(i));
    expect(maxV).toBeCloseTo(16 / FLOOR_M, 3);
    const rp = roofs!.getAttribute('position');
    for (let i = 0; i < rp.count; i++) expect(rp.getY(i)).toBe(16);
  });
  it('highlights streets: edge lines + centre line on wide roads, footpaths separate', () => {
    const r = buildRoadParts(chunk as never, o);
    expect(r.road).toBeTruthy(); expect(r.path).toBeTruthy(); expect(r.lines).toBeTruthy(); expect(r.centre).toBeTruthy();
  });
  it('shows the nearest building and street names only', () => {
    indexBlock('k', chunk as never);
    const all = collectLabels(o);
    expect(all.map((l) => l.text).sort()).toEqual(['Lotus Tower', 'MG Road']);
    expect(nearestLabels(all, 0, 0, 1)).toHaveLength(1);
    expect(nearestLabels(all, 5000, 5000, 8)).toHaveLength(0);
  });
});
