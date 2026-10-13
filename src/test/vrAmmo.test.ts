// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { spend, refill, AMMO_SPEC, condition, fire, reload, getAmmo, dropAmmo } from '@/lib/vrAmmo';

describe('village survival ammo', () => {
  it('spends a round and refuses an empty magazine', () => {
    const s = { pistol: { inMag: 1, reserve: 0 } };
    const a = spend(s, 'pistol'); expect(a.ok).toBe(true); expect(a.next.pistol.inMag).toBe(0);
    expect(spend(a.next, 'pistol').ok).toBe(false);
  });
  it('reloads only what the reserve holds', () => {
    expect(refill({ pistol: { inMag: 2, reserve: 3 } }, 'pistol').pistol).toEqual({ inMag: 5, reserve: 0 });
    expect(refill({ pistol: { inMag: 0, reserve: 50 } }, 'pistol').pistol).toEqual({ inMag: AMMO_SPEC.pistol.mag, reserve: 50 - AMMO_SPEC.pistol.mag });
  });
  it('shows Fine / Caution / Danger', () => {
    expect([condition(100), condition(50), condition(10)]).toEqual(['Fine', 'Caution', 'Danger']);
  });
  it('fires down to empty, reloads after a delay, knife needs no ammo, drops add rounds', () => {
    vi.useFakeTimers();
    expect(fire('knife')).toBe(true);
    const mag = getAmmo().shotgun.inMag;
    for (let i = 0; i < mag; i++) expect(fire('shotgun')).toBe(true);
    expect(fire('shotgun')).toBe(false);
    const before = getAmmo().shotgun.reserve;
    expect(reload('shotgun')).toBe(true);
    vi.advanceTimersByTime(AMMO_SPEC.shotgun.reload * 1000 + 10);
    expect(getAmmo().shotgun.inMag).toBe(Math.min(AMMO_SPEC.shotgun.mag, before));
    const r = getAmmo().pistol.reserve; dropAmmo(); expect(getAmmo().pistol.reserve).toBe(r + AMMO_SPEC.pistol.drop);
    vi.useRealTimers();
  });
});
