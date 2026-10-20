import { describe, expect, it } from 'vitest';
import { routeForEntity } from '@/lib/ambientDispatch';
import { searchPlatformFeatures } from '@/lib/platformFeatureSearch';
describe('search result destinations', () => {
  it('comments open their post', () => expect(routeForEntity('post_comment', 'c1', { route: '/post/p1' })).toBe('/post/p1'));
  it('messages open the conversation', () => expect(routeForEntity('direct_message', 'm1', { route: '/chat?peer=u2' })).toBe('/chat/u2'));
  it('growth cards open Growth', () => expect(routeForEntity('growth_card', 'g1')).toBe('/growth-insights'));
  it('ignores outside addresses', () => expect(routeForEntity('post_comment', 'c1', { route: '//evil.com' })).toBe('/home?ref=c1'));
  it('voice settings are searchable', () => expect(searchPlatformFeatures('voice settings')[0]?.location).toBe('/profile#voice-settings'));
});
