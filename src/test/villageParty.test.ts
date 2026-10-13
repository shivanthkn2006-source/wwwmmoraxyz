import { describe, it, expect } from 'vitest';
import { admitted, shardRoom, isVillageRoom, VILLAGE_CAP } from '@/worlds/meet/villageParty';

describe('village party', () => {
  it('admits the five earliest members', () => {
    const e = Array.from({ length: 7 }, (_, i) => ({ id: `u${i}`, since: 100 - i }));
    const a = admitted(e);
    expect(a.size).toBe(VILLAGE_CAP);
    expect(a.has('u6')).toBe(true);
    expect(a.has('u0')).toBe(false);
    expect(a.has('u1')).toBe(false);
  });
  it('breaks ties by id so every phone agrees', () => {
    const e = ['e', 'd', 'c', 'b', 'a', 'f'].map((id) => ({ id, since: 1 }));
    expect([...admitted(e)].sort()).toEqual(['a', 'b', 'c', 'd', 'e']);
  });
  it('dedupes repeated ids and tolerates missing times', () => {
    const a = admitted([{ id: 'x', since: 5 }, { id: 'x', since: 1 }, { id: 'y', since: NaN }], 1);
    expect([...a]).toEqual(['x']);
  });
  it('names shards and spots village rooms', () => {
    expect(shardRoom('mmora:chennai', 1)).toBe('mmora:chennai');
    expect(shardRoom('mmora:chennai', 3)).toBe('mmora:chennai#3');
    expect(isVillageRoom('mmora:x#2')).toBe(true);
    expect(isVillageRoom('real:1_2')).toBe(false);
  });
});
