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
  it('finds Profile settings sections through Home search', () => {
    expect(searchPlatformFeatures('quick unlock')[0]?.location).toBe('/profile#quick-unlock');
    expect(searchPlatformFeatures('passcode')[0]?.location).toBe('/profile#quick-unlock');
    expect(searchPlatformFeatures('pin code')[0]?.location).toBe('/profile#quick-unlock');
    expect(searchPlatformFeatures('devices')[0]?.location).toBe('/profile#account');
    expect(searchPlatformFeatures('identity photo')[0]?.location).toBe('/profile#identity-photo');
    expect(searchPlatformFeatures('karma')[0]?.location).toBe('/profile#karma-swap');
  });
  it('does not disclose privileged or internal destinations', () => {
    for (const query of ['vault', 'nexus', 'admin', 'root scan', 'home loading report']) expect(searchPlatformFeatures(query)).toEqual([]);
  });
});
