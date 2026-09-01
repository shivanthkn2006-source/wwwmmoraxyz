import { describe, expect, it } from 'vitest';
import { decodeEntities, dhfVideoThumbnail, type DhfVideo } from '@/lib/dhfVideos';

const video = (over: Partial<DhfVideo> = {}): DhfVideo => ({
  id: 'v1',
  figure_slug: 'alan-turing',
  figure_name: 'Alan Turing',
  topic: 'Alan Turing — mathematics',
  title: 'Alan Turing&#39;s Machines &amp; Mathematics',
  description: 'A BBC archive programme',
  category: 'mathematics',
  youtube_video_id: 'oRBS70J2Poo',
  youtube_url: 'https://www.youtube.com/watch?v=oRBS70J2Poo',
  youtube_channel: 'BBC Archive',
  tiktok_url: 'https://www.tiktok.com/search?q=Alan%20Turing',
  instagram_url: 'https://www.instagram.com/explore/tags/alanturing/',
  thumbnail_url: null,
  published_at: null,
  created_at: new Date().toISOString(),
  ...over,
});

describe('dhfVideos', () => {
  it('decodes the HTML entities YouTube returns in titles', () => {
    expect(decodeEntities(video().title)).toBe("Alan Turing's Machines & Mathematics");
    expect(decodeEntities('&quot;focus&quot; &lt;deep&gt;')).toBe('"focus" <deep>');
  });

  it('falls back to the YouTube still when no thumbnail was stored', () => {
    expect(dhfVideoThumbnail(video())).toBe('https://i.ytimg.com/vi/oRBS70J2Poo/hqdefault.jpg');
  });

  it('prefers the stored thumbnail', () => {
    expect(dhfVideoThumbnail(video({ thumbnail_url: 'https://cdn.test/x.jpg' }))).toBe('https://cdn.test/x.jpg');
  });

  it('returns null when there is no video to illustrate', () => {
    expect(dhfVideoThumbnail(video({ youtube_video_id: null, thumbnail_url: null }))).toBeNull();
  });

  it('keeps every card pointing at the three real destinations', () => {
    const v = video();
    [v.youtube_url, v.tiktok_url, v.instagram_url].forEach((url) => {
      expect(new URL(url as string).protocol).toBe('https:');
    });
  });
});
