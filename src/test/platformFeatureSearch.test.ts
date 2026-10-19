import { describe, expect, it } from 'vitest';
import { searchPlatformFeatures } from '@/lib/platformFeatureSearch';
describe('member feature discovery', () => {
  it('finds Village inside World through the existing entry', () => {
    expect(searchPlatformFeatures('village')[0]?.name).toBe("M'Mora Village");
    expect(searchPlatformFeatures('village')[0]?.location).toBe('/zoe-omega?vr=1');
  });
  it('finds member menus beyond the legacy list', () => {
    expect(searchPlatformFeatures('DHF')[0]?.location).toBe('/compass');
    expect(searchPlatformFeatures('growth')[0]?.location).toBe('/growth-insights');
    expect(searchPlatformFeatures('Help guides')[0]?.location).toBe('/help');
  });
  it('does not disclose privileged or internal destinations', () => {
    for (const query of ['vault', 'nexus', 'admin', 'root scan', 'home loading report']) expect(searchPlatformFeatures(query)).toEqual([]);
  });
});
