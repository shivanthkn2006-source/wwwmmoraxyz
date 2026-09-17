import { describe, expect, it } from 'vitest';
import { moveTrackBetween, withTrack, withoutTrack, type MusicPlaylist } from './musicPlaylists';
import type { MusicTrack } from './musicProviders';

const track = (id: string): MusicTrack => ({ id, title: id, artist: 'A', url: `https://x/${id}`, source: 'audius', credit: 'Audius' });

const playlists = (): MusicPlaylist[] => [
  { id: 'p1', name: 'Morning', tracks: [track('a'), track('b')], position: 0 },
  { id: 'p2', name: 'Night', tracks: [track('c')], position: 1 },
];

describe('cloud playlists', () => {
  it('moves a song from one playlist to another', () => {
    const next = moveTrackBetween(playlists(), 'p1', 'p2', 'a');
    expect(next[0].tracks.map((t) => t.id)).toEqual(['b']);
    expect(next[1].tracks.map((t) => t.id)).toEqual(['c', 'a']);
  });

  it('ignores a drop on the same playlist or an unknown song', () => {
    expect(moveTrackBetween(playlists(), 'p1', 'p1', 'a')[0].tracks).toHaveLength(2);
    expect(moveTrackBetween(playlists(), 'p1', 'p2', 'zz')[1].tracks).toHaveLength(1);
  });

  it('never duplicates a song and removes cleanly', () => {
    expect(withTrack([track('a')], track('a'))).toHaveLength(1);
    expect(withoutTrack([track('a'), track('b')], 'a').map((t) => t.id)).toEqual(['b']);
  });
});
