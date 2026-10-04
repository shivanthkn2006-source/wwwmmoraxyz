// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { makeLane, sampleLane, stepAgent } from '@/worlds/realmap/StreetTraffic';
import { governorStep, SLOW_MS } from '@/worlds/realmap/thermalGovernor';
import { searchWorld, score } from '@/worlds/search/worldSearch';
import { pickVoicePeers } from '@/worlds/meet/vrVoice';
import { portalMeetSpot } from '@/worlds/meet/vrInvite';
import { isZoeVisionPreferred } from '@/lib/zoeVisionPreference';

describe('street traffic', () => {
  const lane = makeLane([[0, 0], [0, 0.1], [0, 50], [40, 50]], 7)!;
  it('drops duplicate points and measures length', () => { expect(lane.pts).toHaveLength(3); expect(lane.len).toBeCloseTo(90); });
  it('samples along the road with heading', () => {
    const p = sampleLane(lane, 25, 1, 0); expect(p.x).toBeCloseTo(0); expect(p.z).toBeCloseTo(25); expect(p.yaw).toBeCloseTo(0);
    const q = sampleLane(lane, 25, 1, 2), r = sampleLane(lane, 25, -1, 2);
    expect(Math.abs(q.x - r.x)).toBeCloseTo(4); // opposite lanes on opposite sides
  });
  it('turns round at a dead end instead of freezing', () => {
    const a = stepAgent({ lane: 0, s: 89.9, dir: 1, speed: 10, base: 10, off: 2, kind: 0, phase: 0 }, lane, 0.05, false);
    expect(a.dir).toBe(-1); expect(a.s).toBe(lane.len);
  });
  it('brakes when someone is in the road', () => {
    let a = { lane: 0, s: 10, dir: 1 as const, speed: 10, base: 10, off: 2, kind: 0 as const, phase: 0 };
    for (let k = 0; k < 40; k++) a = stepAgent(a, lane, 0.05, true) as typeof a;
    expect(a.speed).toBeLessThan(0.5);
  });
  it('ignores degenerate roads', () => { expect(makeLane([[0, 0]], 5)).toBeNull(); expect(makeLane([[0, 0], [1, 1]], 5)).toBeNull(); });
});

describe('slow-phone protection', () => {
  it('steps down after sustained slow frames and back up after staying smooth', () => {
    let g = { level: 0 as const, slowFor: 0, smoothFor: 0, avg: 16 } as ReturnType<typeof governorStep>;
    for (let k = 0; k < 200; k++) g = governorStep(g, (SLOW_MS + 30) / 1000);
    expect(g.level).toBeGreaterThan(0);
    for (let k = 0; k < 2000; k++) g = governorStep(g, 0.016);
    expect(g.level).toBe(0);
  });
});

describe('VR World search', () => {
  const src = {
    members: [{ id: 'u1', name: 'Shivanth', username: 'shivanth.kn.2006', tag: 'friend', mode: 'real', lat: 1, lng: 2 }],
    friends: [{ id: 'u1', username: 'shivanth.kn.2006', name: 'Shivanth' }, { id: 'u2', username: 'shiva_k', name: 'Shiva' }],
    blocks: [{ buildings: [{ pts: [[1, 1]] as [number, number][], h: 40, name: 'Shiv Tower' }], roads: [{ pts: [[1, 1], [1, 2]] as [number, number][], w: 6, name: 'MG Road' }], pois: [{ lat: 1, lng: 1, name: 'Shiv Cafe', kind: 'cafe' }], fetchedAt: 0 }],
    relics: [], landmarks: [{ id: 'f', title: 'Lion (animal)', x: 1, z: 2 }],
  };
  it('ranks members here first, lists friends not here once, and finds map names', () => {
    const r = searchWorld('shiv', src);
    expect(r[0].kind).toBe('member');
    expect(r.filter((x) => x.userId === 'u1')).toHaveLength(1);
    expect(r.map((x) => x.kind)).toEqual(expect.arrayContaining(['friend', 'building', 'place']));
    expect(searchWorld('mg', src)[0].title).toBe('MG Road');
    expect(searchWorld('lion', src)[0].kind).toBe('landmark');
    expect(searchWorld('', src)).toEqual([]);
  });
  it('scores prefixes above substrings', () => { expect(score('Main Street', 'main')).toBeGreaterThan(score('Domain', 'main')); });
});

describe('voice + invites + camera', () => {
  it('connects only to members with voice on, capped', () => {
    expect(pickVoicePeers([{ id: 'a', voice: true }, { id: 'b' }, { id: 'c', voice: true }], 1)).toEqual(['a']);
  });
  it('invite arrival spot is beside the doorway, outside its trigger', () => {
    const p = portalMeetSpot('mmora'); expect(p[1]).toBe(1.6);
  });
  it('Zoe vision camera is off until the member turns it on', () => { localStorage.clear(); expect(isZoeVisionPreferred()).toBe(false); });
});
