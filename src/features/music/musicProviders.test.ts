import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveMusicQueue, searchAudius } from './musicProviders';

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

  it('falls through providers and returns an honest empty result', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 503 }));
    await expect(resolveMusicQueue('not available', 'radio')).resolves.toEqual({ tracks: [], source: null });
  });
});