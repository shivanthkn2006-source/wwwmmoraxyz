import { describe, it, expect } from 'vitest';
import { dhfTopicKey, searchFallback } from '@/lib/dhfSocialLinks';
import { detectOrbCapability } from '@/lib/orbCapabilities';

describe('dhf social links', () => {
  it('normalises headlines into a stable topic key', () => {
    expect(dhfTopicKey("Marcus Aurelius' Rule for Anger!")).toBe('marcus aurelius rule for anger');
    expect(dhfTopicKey('  Focus   TODAY  ')).toBe('focus today');
  });

  it('never yields a dead link in the fallback', () => {
    const links = searchFallback('deep work habits');
    expect(links.youtube_url).toContain('youtube.com/results?search_query=deep%20work');
    expect(links.tiktok_url).toContain('tiktok.com/search?q=');
    expect(links.instagram_url).toContain('instagram.com');
  });
});

describe('orb capability detection for the newly wired tools', () => {
  it('routes indexing requests', () => {
    expect(detectOrbCapability('index this post for me')).toBe('index_ingest');
    expect(detectOrbCapability('make this searchable')).toBe('index_ingest');
  });

  it('routes premium/tier questions', () => {
    expect(detectOrbCapability('what tier am i')).toBe('premium_detect');
    expect(detectOrbCapability('check my premium status')).toBe('premium_detect');
  });

  it('routes brand affinity questions', () => {
    expect(detectOrbCapability('what brands do i like')).toBe('brand_learning');
    expect(detectOrbCapability('recommend brands for me')).toBe('brand_learning');
  });

  it('leaves ordinary chat alone', () => {
    expect(detectOrbCapability('good morning Zoe')).toBeNull();
  });
});
