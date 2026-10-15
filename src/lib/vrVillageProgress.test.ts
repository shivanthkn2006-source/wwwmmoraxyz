// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { mergeVillage, applyVillage, readVillage } from './vrVillageProgress';
describe('village progress sync', () => {
  beforeEach(() => localStorage.clear());
  it('older account copy cannot undo newer device progress', () => {
    localStorage.setItem('mmora-fuse-puzzle', JSON.stringify(['shell', 'fluid', 'mix']));
    localStorage.setItem('mmora-upgrades', JSON.stringify({ pistol: 3 }));
    localStorage.setItem('vr-case-extra-rows', '6');
    applyVillage({ steps: ['shell'], upgrades: { pistol: 1, knife: 2 }, caseRows: 2 });
    const v = readVillage();
    expect(v.steps).toEqual(['shell', 'fluid', 'mix']);
    expect(v.upgrades).toEqual({ pistol: 3, knife: 2 });
    expect(v.caseRows).toBe(6);
  });
  it('caps upgrades at 5 and rows at 20', () => {
    expect(mergeVillage({ upgrades: { a: 9 }, caseRows: 40 }, null)).toEqual({ steps: [], upgrades: { a: 5 }, caseRows: 20 });
  });
});
