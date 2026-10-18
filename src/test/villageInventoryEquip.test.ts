import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('@/lib/vrVillageProgress', () => ({ readVillage: () => ({}), applyVillage: vi.fn(), villageChanged: vi.fn() }));
vi.mock('@/lib/vrQuests', () => ({ recordVRCollect: vi.fn() }));
vi.mock('@/lib/vrSfx', () => ({ playPickup: vi.fn(), playSfx: vi.fn() }));
vi.mock('@/lib/vrAmmo', () => ({ getAmmo: () => ({}), mergeAmmo: vi.fn(), subscribeAmmo: vi.fn() }));
vi.mock('@/lib/vrPickups', () => ({ getGoldHerbs: () => 0, mergeGoldHerbs: vi.fn(), subscribeGoldHerbs: vi.fn() }));

describe('inventory equipment preserves owned gear', () => {
  beforeEach(() => {
    vi.resetModules();
    const store = new Map([['vr-gear', JSON.stringify(['w870', 'sentinel9', 'boltrifle', 'vest', 'map'])], ['vr-gear-equipped', '[]']]);
    vi.stubGlobal('localStorage', { getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => store.set(key, value) });
    vi.stubGlobal('window', undefined); // No account timers or network writes in this test.
  });
  it('equips and unequips W-870 without losing it', async () => {
    const gear = await import('@/lib/vrGear');
    gear.toggleEquip('w870'); expect(gear.getEquipped()).toEqual(['w870']);
    gear.toggleEquip('w870'); expect(gear.getEquipped()).toEqual([]); expect(gear.hasGear('w870')).toBe(true);
  });
  it('switches weapons while retaining armour and every owned weapon', async () => {
    const gear = await import('@/lib/vrGear');
    gear.toggleEquip('vest'); gear.toggleEquip('w870'); gear.toggleEquip('sentinel9');
    expect(gear.getEquipped()).toEqual(['vest', 'sentinel9']);
    expect(gear.hasGear('w870')).toBe(true); expect(gear.hasGear('boltrifle')).toBe(true);
  });
  it('cannot equip a quest item or an unowned weapon', async () => {
    const gear = await import('@/lib/vrGear'); gear.toggleEquip('map'); gear.toggleEquip('rocket'); expect(gear.getEquipped()).toEqual([]);
  });
});