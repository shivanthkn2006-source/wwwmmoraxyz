import { describe, expect, it } from 'vitest';
import { classifyQuery, hostFromUrl, relativeTime, sanitizeText } from '@/lib/searchSanitize';

describe('sanitizeText', () => {
  it('strips leaked RSS anchor markup', () => {
    const raw = '<a href="https://news.google.com/rss/articles/xyz">Dark matter breakthrough</a>';
    expect(sanitizeText(raw)).toBe('Dark matter breakthrough');
  });

  it('decodes entities and collapses whitespace', () => {
    expect(sanitizeText('Zoe &amp;  DHF &#8212; live')).toBe('Zoe & DHF — live');
  });

  it('handles CDATA and empty input', () => {
    expect(sanitizeText('<![CDATA[Hello]]>')).toBe('Hello');
    expect(sanitizeText(undefined)).toBe('');
  });
});

describe('hostFromUrl', () => {
  it('returns bare hostnames', () => {
    expect(hostFromUrl('https://www.bbc.co.uk/news/1')).toBe('bbc.co.uk');
    expect(hostFromUrl('not a url')).toBeNull();
  });
});

describe('relativeTime', () => {
  it('formats recent timestamps', () => {
    expect(relativeTime(new Date(Date.now() - 32 * 60_000).toISOString())).toBe('32m ago');
    expect(relativeTime('nonsense')).toBeNull();
  });
});

describe('classifyQuery', () => {
  it('routes entity, media, shopping and weather intents', () => {
    expect(classifyQuery('@Moksh50')).toBe('entity');
    expect(classifyQuery('weather in Kochi')).toBe('weather');
    expect(classifyQuery('buy running shoes')).toBe('shopping');
    expect(classifyQuery('NF the search song')).toBe('media');
    expect(classifyQuery('what is divine wisdom')).toBe('semantic');
  });
});
