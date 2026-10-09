// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { walkStep, staminaTick, getStamina, __resetStamina, TURN_RAD_PS, STAMINA_RESUME } from '@/lib/vrWalk';
import { pickUse } from '@/lib/vrUse';
import { relicsForBlock, RELICS_PER_BLOCK, addBlockRelics, takeRelic, getStreetRelics, __resetStreetRelics } from '@/worlds/realmap/streetRelics';
import { tagFor } from '@/worlds/meet/vrMeet';
import { realRoom } from '@/worlds/meet/MeetPresence';

const none = { forward: false, backward: false, left: false, right: false };

describe('human walking', () => {
  it('right arrow turns the camera right and walks', () => {
    const s = walkStep({ ...none, right: true }, 0.5, 0, false);
    expect(s.yawDelta).toBeCloseTo(-TURN_RAD_PS * 0.5);
    expect(s.move).toBe(true);
  });
  it('left arrow turns left', () => {
    expect(walkStep({ ...none, left: true }, 0.1, 0, false).yawDelta).toBeGreaterThan(0);
  });
  it('down arrow walks straight backwards without turning', () => {
    const s = walkStep({ ...none, backward: true }, 0.1, 0, false);
    expect(s.move).toBe(true); expect(s.yawDelta).toBe(0); expect(s.moveYawOffset).toBeCloseTo(Math.PI, 5);
  });
  it('no input: no turn, no movement', () => {
    expect(walkStep(none, 0.1, 0, false)).toEqual({ yawDelta: 0, move: false, backTurnLeft: 0, moveYawOffset: 0 });
  });
});

describe('stamina', () => {
  beforeEach(() => __resetStamina());
  it('drains while running, runs dry, then needs to refill before running again', () => {
    for (let k = 0; k < 120; k++) staminaTick(0.1, true, true);
    expect(getStamina().exhausted).toBe(true);
    expect(staminaTick(0.1, true, true)).toBe(false);
    for (let k = 0; k < 20; k++) staminaTick(0.1, false, true);
    expect(getStamina().stamina).toBeGreaterThanOrEqual(STAMINA_RESUME);
    expect(staminaTick(0.1, true, true)).toBe(true);
  });
  it('standing still does not drain', () => {
    staminaTick(1, true, false);
    expect(getStamina().stamina).toBe(1);
  });
});

describe('Use button', () => {
  it('picks the closest target within its reach', () => {
    const a = { dist: 2, label: 'a', run: () => {} };
    const b = { dist: 1, label: 'b', run: () => {} };
    const far = { dist: 0.5, reach: 0.4, label: 'far', run: () => {} };
    expect(pickUse([a, null, b, far])?.label).toBe('b');
    expect(pickUse([{ dist: 9, label: 'x', run: () => {} }])).toBeNull();
  });
});

describe('street relics', () => {
  const data = { roads: [{ pts: [[12.97, 77.59], [12.971, 77.591], [12.972, 77.592]] as [number, number][], w: 6 }] };
  beforeEach(() => { __resetStreetRelics(); localStorage.clear(); });
  it('same block + day gives the same relics on real road points', () => {
    const a = relicsForBlock('1_2', data, '2026-10-04');
    expect(a).toHaveLength(RELICS_PER_BLOCK);
    expect(relicsForBlock('1_2', data, '2026-10-04')).toEqual(a);
    for (const r of a) expect(data.roads[0].pts.some(([la, ln]) => la === r.lat && ln === r.lng)).toBe(true);
  });
  it('no roads → no relics; picked-up relics disappear', () => {
    expect(relicsForBlock('x', { roads: [] }, 'd')).toEqual([]);
    addBlockRelics('1_2', data);
    const first = getStreetRelics()[0];
    takeRelic(first.id);
    expect(getStreetRelics().find((r) => r.id === first.id)).toBeUndefined();
  });
});

describe('meet tags and rooms', () => {
  it('friend beats follower; others are new', () => {
    expect(tagFor('a', new Set(['a']), new Set(['a']))).toBe('friend');
    expect(tagFor('b', new Set(), new Set(['b']))).toBe('follower');
    expect(tagFor('c', new Set(), new Set())).toBe('unknown');
  });
  it('members a few hundred metres apart share a room', () => {
    expect(realRoom({ lat: 40.7581, lng: -73.9855 })).toBe(realRoom({ lat: 40.7585, lng: -73.9858 }));
  });
});

import { WALK_MPS as W, RUN_MPS as R } from '@/lib/vrWalk';
describe('movement speed', () => {
  it('matches the earlier VR explore speed', () => { expect(W).toBe(5); expect(R).toBe(9); });
});

import { walkStep as ws } from '@/lib/vrWalk';
describe('down arrow', () => {
  it('never circles: camera yaw stays put while held', () => {
    const i = { forward: false, backward: true, left: false, right: false };
    let yaw = 0;
    for (let k = 0; k < 120; k++) { const s = ws(i, 0.016, 0, k > 0); yaw += s.yawDelta; expect(s.moveYawOffset).toBeCloseTo(Math.PI, 5); }
    expect(yaw).toBe(0);
  });
});
