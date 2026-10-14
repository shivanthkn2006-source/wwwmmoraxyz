import { describe, it, expect, beforeEach } from 'vitest';
describe('ammo reconciliation', () => {
  beforeEach(() => localStorage.clear());
  it('older account copy cannot restore spent rounds', async () => {
    const m = await import('./vrAmmo');
    m.fire('pistol'); const after = m.getAmmo().pistol.inMag;
    m.mergeAmmo({ pistol: { inMag: 10, reserve: 99 } }, Date.now() - 60000);
    expect(m.getAmmo().pistol.inMag).toBe(after);
    m.mergeAmmo({ pistol: { inMag: 3, reserve: 4 } }, Date.now() + 1000);
    expect(m.getAmmo().pistol).toEqual({ inMag: 3, reserve: 4 });
  });
});
