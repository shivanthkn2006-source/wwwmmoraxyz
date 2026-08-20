import { describe, expect, it, vi } from 'vitest';
import {
  ALLOWED_IMAGE_MIME,
  ALLOWED_VIDEO_MIME,
  DATA_URL_PREVIEW_LIMIT,
  prepareFeedPostMedia,
  withRetry,
} from '@/pages/home/homeFeedUtils';

describe('prepareFeedPostMedia', () => {
  it('keeps normal remote media inline', () => {
    const post = prepareFeedPostMedia({
      id: '1',
      media_url: 'https://cdn.example.com/clip.mp4',
      media_type: null,
    });
    expect(post.media_url).toBe('https://cdn.example.com/clip.mp4');
    expect(post.has_deferred_media).toBe(false);
    expect(post.media_type).toBe('video');
  });

  it('defers oversized data-url media so the feed never inlines it', () => {
    const heavy = `data:video/mp4;base64,${'A'.repeat(DATA_URL_PREVIEW_LIMIT + 10)}`;
    const post = prepareFeedPostMedia({ id: '2', media_url: heavy, media_type: 'video' });
    expect(post.media_url).toBeNull();
    expect(post.has_deferred_media).toBe(true);
  });

  it('respects an explicit has_deferred_media flag', () => {
    const post = prepareFeedPostMedia({
      id: '3',
      media_url: 'https://cdn.example.com/a.jpg',
      media_type: 'image',
      has_deferred_media: true,
    });
    expect(post.media_url).toBeNull();
    expect(post.has_deferred_media).toBe(true);
  });

  it('tolerates posts without media', () => {
    const post = prepareFeedPostMedia({ id: '4', media_url: null, media_type: null });
    expect(post.media_url).toBeNull();
    expect(post.has_deferred_media).toBe(false);
  });
});

describe('upload whitelists', () => {
  it('only allows previewable video and image types', () => {
    expect(ALLOWED_VIDEO_MIME).toContain('video/mp4');
    expect(ALLOWED_VIDEO_MIME).not.toContain('video/x-msvideo');
    expect(ALLOWED_IMAGE_MIME).toContain('image/webp');
    expect(ALLOWED_IMAGE_MIME).not.toContain('image/svg+xml');
  });
});

describe('withRetry', () => {
  it('retries until success', async () => {
    let calls = 0;
    const result = await withRetry(async () => {
      calls += 1;
      if (calls < 3) throw new Error('boom');
      return 'ok';
    }, 3, 1);
    expect(result).toBe('ok');
    expect(calls).toBe(3);
  });

  it('rethrows the final error after exhausting attempts', async () => {
    const fn = vi.fn(async () => {
      throw new Error('always fails');
    });
    await expect(withRetry(fn, 2, 1)).rejects.toThrow('always fails');
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
