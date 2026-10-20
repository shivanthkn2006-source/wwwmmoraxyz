import { describe, expect, it, vi } from 'vitest';
import { createPanelClaimer } from '@/lib/firstTimePanel';

vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));

describe('first-time automatic panels', () => {
  it('shows once per member, not per remount', async () => {
    const write = vi.fn(async () => true);
    const claim = createPanelClaimer(write);
    expect(await claim('member-a', 'launch')).toBe(true);
    expect(await claim('member-a', 'launch')).toBe(false);
    expect(write).toHaveBeenCalledTimes(1);
    expect(await claim('member-b', 'launch')).toBe(true);
  });
  it('only one device wins the unique account claim', async () => {
    const rows = new Set<string>();
    const write = async (u: string, p: string) => {
      const key = `${u}:${p}`; if (rows.has(key)) return false; rows.add(key); return true;
    };
    const results = await Promise.all([createPanelClaimer(write)('member-a', 'home-message'), createPanelClaimer(write)('member-a', 'home-message')]);
    expect(results).toEqual([true, false]);
  });
  it('migrates previously seen panels without replay', async () => {
    const write = vi.fn(async () => true);
    expect(await createPanelClaimer(write)('member-a', 'zoe-film', true)).toBe(false);
    expect(write).toHaveBeenCalledTimes(1);
  });
  it('never displays when the account claim fails or is offline', async () => {
    expect(await createPanelClaimer(async () => false)('member-a', 'launch')).toBe(false);
    expect(await createPanelClaimer(async () => { throw new Error('offline'); })('member-a', 'launch')).toBe(false);
  });
});