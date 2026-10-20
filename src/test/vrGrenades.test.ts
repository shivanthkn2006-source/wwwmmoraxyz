import { describe, expect, it, beforeEach, vi } from 'vitest';
import { blastDamage, blastEffectAt, GRENADE_SPEC, throwArc, emitBlast, onBlast, type Blast } from '@/lib/vrGrenades';
import { isOneHanded, pickHeldWeapon } from '@/lib/vrWeaponGrip';
import * as THREE from 'three';
import { supportPoint } from '@/lib/vrUploadedWeaponGrip';

describe('grenades', () => {
  it('uses bounded 3D game falloff instead of damaging another floor through horizontal proximity', () => {
    const b: Blast = { kind: 'fraggrenade', x: 0, y: 0, z: 0, radius: 6, damage: 120, stun: 0 };
    expect(blastEffectAt(b, { x: 0, y: 3, z: 0 }).damage).toBe(60);
    expect(blastEffectAt(b, { x: 0, y: 6, z: 0 }).damage).toBe(0);
    expect(blastEffectAt({ ...b, radius: 0 }, { x: 0, z: 0 })).toEqual({ damage: 0, stun: 0 });
    expect(blastDamage('fraggrenade', -1)).toBe(0);
  });
  it('flash stuns inside 9 game metres without HP damage, but not at or outside the edge', () => {
    const b: Blast = { kind: 'flashgrenade', x: 0, z: 0, radius: 9, damage: 0, stun: 5 };
    expect(blastEffectAt(b, { x: 8.9, z: 0 })).toEqual({ damage: 0, stun: 5 });
    expect(blastEffectAt(b, { x: 9, z: 0 })).toEqual({ damage: 0, stun: 0 });
  });
  it('smoke never damages or stuns villagers even with accidental event fields', () => {
    expect(blastEffectAt({ kind: 'smokegrenade', x: 0, z: 0, radius: 5, damage: 120, stun: 5 }, { x: 0, z: 0 })).toEqual({ damage: 0, stun: 0 });
  });
  it('incendiary impact deals no initial damage; fire ticks have distance falloff', () => {
    const b: Blast = { kind: 'incgrenade', x: 0, z: 0, radius: 3.5, damage: 0, stun: 0 };
    expect(blastEffectAt(b, { x: 0, z: 0 }).damage).toBe(0);
    expect(blastEffectAt({ ...b, damage: 18 }, { x: 1.75, z: 0 }).damage).toBe(9);
  });
  it('delivers each event once and stops delivery after world unmount cleanup', () => {
    const fn = vi.fn(), off = onBlast(fn);
    const b: Blast = { kind: 'fraggrenade', x: 0, z: 0, radius: 6, damage: 120, stun: 0 };
    emitBlast(b); expect(fn).toHaveBeenCalledTimes(1);
    off(); emitBlast(b); expect(fn).toHaveBeenCalledTimes(1);
  });
  it('frag hurts most at the centre and nothing past 6 m', () => {
    expect(blastDamage('fraggrenade', 0)).toBe(120);
    expect(blastDamage('fraggrenade', 3)).toBe(60);
    expect(blastDamage('fraggrenade', 6.1)).toBe(0);
  });
  it('flash stuns for 5 s without damage; incendiary bursts on impact and burns 7 s', () => {
    expect(GRENADE_SPEC.flashgrenade).toMatchObject({ damage: 0, stun: 5 });
    expect(GRENADE_SPEC.incgrenade).toMatchObject({ fuse: 0, burn: 7 });
  });
  it('a throw travels forward and comes back down to the ground', () => {
    const o = { x: 0, y: 1.55, z: 0 }, d = { x: 0, z: -1 };
    expect(throwArc(o, d, 0.5).y).toBeGreaterThan(o.y);
    const late = throwArc(o, d, 1.2); expect(late.y).toBeLessThan(0); expect(late.z).toBeLessThan(-8);
  });
  it('knife and grenades are held in one hand; guns keep priority', () => {
    expect(pickHeldWeapon(['knife'])).toBe('knife');
    expect(pickHeldWeapon(['fraggrenade'])).toBe('fraggrenade');
    expect(isOneHanded('knife')).toBe(true); expect(isOneHanded('incgrenade')).toBe(true); expect(isOneHanded('w870')).toBe(false);
  });
});
describe('pickup gives grenades', () => {
  beforeEach(() => {
    vi.resetModules();
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v) });
  });
  it('3 per pickup, spent one per throw, none below zero', async () => {
    const g = await import('@/lib/vrGrenades');
    g.addGrenades('flashgrenade', 3);
    expect(g.spendGrenade('flashgrenade')).toBe(true); expect(g.grenadeCount('flashgrenade')).toBe(2);
    g.spendGrenade('flashgrenade'); g.spendGrenade('flashgrenade');
    expect(g.spendGrenade('flashgrenade')).toBe(false); expect(g.grenadeCount('flashgrenade')).toBe(0);
  });
});
describe('alternate-avatar support hand', () => {
  it('never targets past the measured left-arm reach', () => {
    const grip = new THREE.Vector3(-0.08, 1.25, 0.4), sh = new THREE.Vector3(0.15, 1.3, 0);
    const p = supportPoint(grip, sh, 0.55, 0.3);
    expect(p.distanceTo(sh)).toBeLessThanOrEqual(0.55 * 0.95 + 1e-9);
    expect(p.z).toBeGreaterThan(grip.z);
  });
});
