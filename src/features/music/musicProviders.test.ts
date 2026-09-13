import { afterEach, describe, expect, it, vi } from 'vitest';
import { isSecurePlayableUrl, resolveMusicQueue, searchAppleMusic, searchAudius, searchMusicCatalog, searchRadio } from './musicProviders';

describe('music providers', () => {
  afterEach(() => vi.restoreAllMocks());

  it('normalizes real Audius results into playable tracks', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: ['https://audius.test'] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [{ id: '1', title: 'Signal', duration: 90, user: { name: 'Artist' }, is_streamable: true }] }), { status: 200 }));
    const result = await searchAudius('signal');
    expect(result[0]).toMatchObject({ id: 'audius:1', title: 'Signal', artist: 'Artist', source: 'audius' });
    expect(result[0].url).toContain('/v1/tracks/1/stream');
  });

  it('normalizes official Apple catalog previews', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ results: [{
      trackId: 42,
      trackName: 'Roar',
      artistName: 'Katy Perry',
      collectionName: 'PRISM',
      previewUrl: 'https://audio-ssl.itunes.apple.com/preview.m4a',
      artworkUrl100: 'https://is1-ssl.mzstatic.com/image/thumb/100x100bb.jpg',
    }] })));
    await expect(searchAppleMusic('Katy Perry')).resolves.toMatchObject([
      { id: 'apple:42', title: 'Roar', artist: 'Katy Perry', source: 'apple' },
    ]);
  });

  it('falls through providers and returns an honest empty result', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 503 }));
    await expect(resolveMusicQueue('not available', 'radio')).resolves.toEqual({ tracks: [], source: null });
  });

  it('rejects insecure and malformed stream URLs', async () => {
    expect(isSecurePlayableUrl('https://radio.test/live')).toBe(true);
    expect(isSecurePlayableUrl('http://radio.test/live')).toBe(false);
    expect(isSecurePlayableUrl('not-a-url')).toBe(false);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify([
        { stationuuid: 'unsafe', name: 'Unsafe', url_resolved: 'http://radio.test/live' },
        { stationuuid: 'safe', name: 'Safe', url_resolved: 'https://radio.test/live' },
      ]), { status: 200 }),
    );
    await expect(searchRadio('jazz')).resolves.toMatchObject([{ id: 'radio:safe' }]);
  });

  it('aggregates, deduplicates and ranks all connected providers', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url === 'https://api.audius.co') return new Response(JSON.stringify({ data: ['https://audius.test'] }));
      if (url.includes('/tracks/search')) return new Response(JSON.stringify({ data: [
        { id: '1', title: 'Signal', duration: 90, user: { name: 'Artist' }, is_streamable: true },
      ] }));
      if (url.includes('advancedsearch')) return new Response(JSON.stringify({ response: { docs: [] } }));
      if (url.includes('radio-browser')) return new Response(JSON.stringify([
        { stationuuid: 'radio', name: 'Signal Radio', url_resolved: 'https://radio.test/live' },
      ]));
      return new Response('{}', { status: 404 });
    });
    const result = await searchMusicCatalog('Signal');
    expect(result.tracks.map((track) => track.title)).toEqual(['Signal', 'Signal Radio']);
    expect(result.providers).toHaveLength(4);
  });

  it('keeps successful sources when another provider is unavailable', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url === 'https://api.audius.co') return new Response(JSON.stringify({ data: ['https://audius.test'] }));
      if (url.includes('/tracks/search')) return new Response(JSON.stringify({ data: [
        { id: '2', title: 'Resilient Song', user: { name: 'Artist' }, is_streamable: true },
      ] }));
      if (url.includes('advancedsearch')) throw new TypeError('Provider unavailable');
      return new Response(JSON.stringify([]));
    });
    const result = await searchMusicCatalog('Resilient Song');
    expect(result.tracks[0].title).toBe('Resilient Song');
    expect(result.providers.find((provider) => provider.name === 'Internet Archive')?.status).toBe('empty');
  });
});