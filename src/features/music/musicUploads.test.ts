import { describe, expect, it, vi, beforeEach } from 'vitest';

const row = {
  id: 'row-1',
  title: 'My song',
  artist: 'Me',
  album: null,
  storage_path: 'user/row-1/my-song.mp3',
  artwork_path: 'user/row-1/cover.jpg',
  duration_seconds: 210,
};

const createSignedUrl = vi.fn(async (path: string) => ({ data: { signedUrl: `https://cdn.test/${path}?token=fresh` }, error: null }));
const maybeSingle = vi.fn(async () => ({ data: row, error: null }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    storage: { from: () => ({ createSignedUrl }) },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle }) }) }),
  },
}));

describe('private upload playback links', () => {
  beforeEach(() => { createSignedUrl.mockClear(); maybeSingle.mockClear(); });

  it('mints a fresh link and album art from the stable upload id', async () => {
    const { refreshUploadTrack } = await import('./musicUploads');
    const fresh = await refreshUploadTrack({
      id: 'upload:row-1', title: 'stale', artist: 'stale', url: 'https://cdn.test/expired', source: 'upload', credit: 'My upload',
    });
    expect(fresh?.url).toContain('token=fresh');
    expect(fresh?.artwork).toContain('cover.jpg');
    expect(fresh?.title).toBe('My song');
    expect(fresh?.uploadId).toBe('row-1');
  });

  it('returns nothing playable when the upload row is gone', async () => {
    maybeSingle.mockResolvedValueOnce({ data: null, error: null } as never);
    const { refreshUploadTrack } = await import('./musicUploads');
    const fresh = await refreshUploadTrack({
      id: 'upload:missing', title: 't', artist: 'a', url: 'http://insecure/x', source: 'upload', credit: 'My upload',
    });
    expect(fresh).toBeNull();
  });
});
