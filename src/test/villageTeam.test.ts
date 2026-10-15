import { describe, it, expect } from 'vitest';
import { teamSynced } from '@/worlds/mmora/villageTeam';
describe('Stage 6 twin levers', () => {
  it('needs both levers inside the window', () => {
    expect(teamSynced({ lever: 'north', at: 0 }, { lever: 'south', at: 3000 })).toBe(true);
    expect(teamSynced({ lever: 'north', at: 0 }, { lever: 'north', at: 100 })).toBe(false);
    expect(teamSynced({ lever: 'north', at: 0 }, { lever: 'south', at: 5000 })).toBe(false);
    expect(teamSynced({ lever: 'north', at: 0 }, null)).toBe(false);
  });
});
