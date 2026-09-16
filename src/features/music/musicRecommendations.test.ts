import { describe, expect, it, vi, beforeEach } from 'vitest';

const listens = [
  { track_id: 'a', track_title: 'A', track_artist: 'X', track_url: 'https://x/a', track_source: 'audius', created_at: '2026-01-03' },
  { track_id: 'b', track_title: 'B', track_artist: 'Y', track_url: 'https://x/b', track_source: 'audius', created_at: '2026-01-02' },
  { track_id: 'a', track_title: 'A', track_artist: 'X', track_url: 'https://x/a', track_source: 'audius', created_at: '2026-01-01' },
  { track_id: 'p', track_title: 'Private', track_artist: 'Z', track_url: 'https://x/p', track_source: 'upload', created_at: '2026-01-04' },
  { track_id: 'mine', track_title: 'Mine', track_artist: 'M', track_url: 'https://x/m', track_source: 'audius', created_at: '2026-01-05' },
];

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getUser: async () => ({ data: { user: { id: 'me' } } }) },
    from: (table: string) => ({
      select: () => ({
        or: async () => ({ data: table === 'friendships' ? [{ user1_id: 'me', user2_id: 'friend' }] : [] }),
        in: () => ({ order: () => ({ limit: async () => ({ data: listens }) }) }),
        eq: () => ({ maybeSingle: async () => ({ data: null }) }),
      }),
    }),
  },
}));

vi.mock('@/features/music/musicSocial', () => ({
  fetchMyListening: async () => [{ id: 'mine', title: 'Mine', artist: 'M', url: 'https://x/m', source: 'audius', credit: 'You played this' }],
}));

vi.mock('@/features/music/musicProfile', () => ({
  fetchMyMusicProfile: async () => ({ genres: ['Pop'], moods: [], artists: [], tracks: [] }),
}));

vi.mock('@/features/music/musicProviders', () => ({
  searchMusicCatalog: async () => ({
    tracks: [
      { id: 'a', title: 'A', artist: 'X', url: 'https://x/a', source: 'audius', credit: 'Audius' },
      { id: 'new', title: 'New', artist: 'N', url: 'https://x/n', source: 'audius', credit: 'Audius' },
    ],
    notice: '',
  }),
}));

import { fetchMusicRecommendations } from './musicRecommendations';

describe('music recommendations', () => {
  beforeEach(() => vi.clearAllMocks());

  it('ranks friend plays by popularity, hides private uploads and songs I already played', async () => {
    const sections = await fetchMusicRecommendations();
    const friends = sections.find((section) => section.id === 'friends');
    expect(friends).toBeTruthy();
    expect(friends!.tracks.map((track) => track.id)).toEqual(['a', 'b']);
    expect(friends!.tracks.some((track) => track.id === 'p')).toBe(false);
    expect(friends!.tracks.some((track) => track.id === 'mine')).toBe(false);
  });

  it('never suggests the same song twice across sections', async () => {
    const sections = await fetchMusicRecommendations();
    const ids = sections.filter((section) => section.id !== 'again').flatMap((section) => section.tracks.map((track) => track.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('includes a play-it-again section from my own history', async () => {
    const sections = await fetchMusicRecommendations();
    expect(sections.find((section) => section.id === 'again')?.tracks[0].id).toBe('mine');
  });
});
