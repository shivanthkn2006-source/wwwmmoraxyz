// @vitest-environment jsdom
/**
 * End-to-end journey for a member's own upload:
 * upload a song -> it is stored with album art -> it is recorded as one real
 * personal play -> it appears on the Home listening shelf with the right play
 * count -> album art recovers after a failed (slow / offline) load.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

const USER = { id: 'user-1' };

const uploadRows: Array<Record<string, unknown>> = [];
const listenRows: Array<Record<string, unknown>> = [];
const storage: string[] = [];

const storageUpload = vi.fn(async (path: string) => { storage.push(path); return { data: { path }, error: null }; });
const createSignedUrl = vi.fn(async (path: string) => ({ data: { signedUrl: `https://cdn.test/${path}?token=${Date.now()}` }, error: null }));

function uploadsTable() {
  return {
    insert: (values: Record<string, unknown>) => {
      const row = { id: `row-${uploadRows.length + 1}`, ...values };
      uploadRows.push(row);
      return { select: () => ({ single: async () => ({ data: row, error: null }) }) };
    },
    select: () => ({
      eq: (_column: string, value: string) => ({
        maybeSingle: async () => ({ data: uploadRows.find((row) => row.id === value) ?? null, error: null }),
        single: async () => ({ data: uploadRows.find((row) => row.id === value) ?? null, error: null }),
      }),
      order: () => ({ data: uploadRows, error: null }),
    }),
  };
}

function listensTable() {
  return {
    insert: async (values: Record<string, unknown>) => {
      listenRows.push({ ...values, created_at: new Date().toISOString() });
      return { data: null, error: null };
    },
    select: () => ({
      eq: () => ({ order: () => ({ limit: async () => ({ data: listenRows, error: null }) }) }),
      order: () => ({ limit: async () => ({ data: listenRows, error: null }) }),
    }),
  };
}

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getUser: async () => ({ data: { user: USER } }) },
    storage: { from: () => ({ upload: storageUpload, createSignedUrl, remove: async () => ({ error: null }) }) },
    from: (table: string) => (table === 'music_uploads' ? uploadsTable() : listensTable()),
  },
}));

function audioFile(): File {
  return new File([new Uint8Array(2048)], 'my-song.wav', { type: 'audio/wav' });
}

beforeEach(() => {
  uploadRows.length = 0;
  listenRows.length = 0;
  storage.length = 0;
  storageUpload.mockClear();
  // The browser decoder is unavailable under test: the original small file is kept.
  class FakeAudioContext {
    async decodeAudioData() { return { duration: 184, numberOfChannels: 2, sampleRate: 44100, getChannelData: () => new Float32Array(1024) }; }
    async close() { /* noop */ }
  }
  (globalThis as unknown as { AudioContext: unknown }).AudioContext = FakeAudioContext;
});

describe('upload -> play -> Home listening shelf', () => {
  it('stores the song with album art, records one real play and shows it on the shelf', async () => {
    const { uploadMyMusic } = await import('@/features/music/musicUploads');
    const { fetchMyListening } = await import('@/features/music/musicSocial');

    const { track } = await uploadMyMusic({
      file: audioFile(),
      artwork: new File([new Uint8Array(64)], 'cover.jpg', { type: 'image/jpeg' }),
      title: 'Night Drive',
      artist: 'Marc',
      album: 'Test Sessions',
    });

    expect(track.source).toBe('upload');
    expect(track.url).toContain('https://cdn.test/');
    expect(track.artwork).toContain('cover.jpg');
    expect(storage.some((path) => path.endsWith('cover.jpg'))).toBe(true);
    expect(listenRows).toHaveLength(1);

    const shelf = await fetchMyListening();
    const entry = shelf.find((item) => item.title === 'Night Drive');
    expect(entry?.playCount).toBe(1);
    expect(entry?.id).toBe(track.id);

    // A second real play increases the shelf count.
    const { logListen } = await import('@/features/music/musicSocial');
    await logListen(track);
    const updated = await fetchMyListening();
    expect(updated.find((item) => item.title === 'Night Drive')?.playCount).toBe(2);
  });

  it('recovers album art for an uploaded track after a failed load', async () => {
    const { default: TrackArtwork } = await import('@/components/music/TrackArtwork');
    uploadRows.push({
      id: 'row-art', title: 'Night Drive', artist: 'Marc', album: null,
      storage_path: 'user-1/x/night.mp3', artwork_path: 'user-1/x/cover.jpg', duration_seconds: 184,
    });

    render(<TrackArtwork src="https://cdn.test/expired/cover.jpg" trackId="upload:row-art" fallback={<span>no art</span>} />);
    const image = await screen.findByRole('presentation', { hidden: true }).catch(() => null) ?? document.querySelector('img');
    expect(image).toBeTruthy();
    (image as HTMLImageElement).dispatchEvent(new Event('error'));

    await waitFor(() => {
      expect(createSignedUrl).toHaveBeenCalled();
    }, { timeout: 4000 });
  });

  it('records why an upload conversion or playback attempt failed', async () => {
    const { clearMusicDiagnostics, getMusicDiagnostics, logMusicEvent } = await import('@/features/music/musicDiagnostics');
    clearMusicDiagnostics();
    logMusicEvent('playback:error', new Error('stream stalled'), { trackId: 'upload:row-1' });
    const [entry] = getMusicDiagnostics();
    expect(entry.stage).toBe('playback:error');
    expect(entry.message).toBe('stream stalled');
    expect(typeof entry.online).toBe('boolean');
  });
});
