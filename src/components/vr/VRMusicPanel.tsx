// ═══════════════════════════════════════════════════════════════════════════════
// VR MUSIC PANEL
// Additive in-world music search and playback. A song played here uses the same
// singleton music engine as the Music page, and the play is recorded so it shows
// up in Music search history and on the Home listening shelf.
// No existing VR or Music component is modified.
// ═══════════════════════════════════════════════════════════════════════════════
import React, { useState } from 'react';
import { Loader2, Music2, Pause, Play, SkipForward } from 'lucide-react';
import { musicEngine } from '@/services/MusicEngine';
import { searchMusicCatalog, type MusicTrack } from '@/features/music/musicProviders';
import { logListen } from '@/features/music/musicSocial';
import { recordMusicSignal } from '@/features/music/musicConnect';

const VRMusicPanel: React.FC = () => {
  const [query, setQuery] = useState('');
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  const search = async () => {
    const text = query.trim();
    if (!text) return;
    setBusy(true); setNotice('');
    try {
      const result = await searchMusicCatalog(text, 'track');
      setTracks(result.tracks.slice(0, 20));
      if (!result.tracks.length) setNotice('Nothing playable was found for that.');
      void recordMusicSignal('search', { query: text, context: { surface: 'vr' } });
    } catch {
      setNotice('Music sources could not be reached. Check your connection.');
    } finally {
      setBusy(false);
    }
  };

  const play = async (index: number) => {
    musicEngine.unlock();
    const started = await musicEngine.playQueue(tracks, index);
    const track = tracks[index];
    if (started && track) {
      // Recorded exactly like a Music page play, so it lands in history and Home.
      void logListen(track).catch(() => undefined);
      setNotice(`Playing “${track.title}”.`);
    } else {
      setNotice(musicEngine.getState().error ?? 'Tap play once more to allow sound.');
    }
  };

  return (
    <div className="w-64 sm:w-72 rounded-2xl bg-black/50 p-3 text-white backdrop-blur-xl">
      <form
        className="flex items-center gap-2"
        onSubmit={(event) => { event.preventDefault(); void search(); }}
      >
        <Music2 className="h-4 w-4 shrink-0 text-cyan-300" aria-hidden="true" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search a song"
          aria-label="Search a song to play in the VR world"
          className="min-w-0 flex-1 rounded-full bg-white/10 px-3 py-2 text-xs text-white placeholder:text-white/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        />
        <button type="submit" aria-label="Search music" className="rounded-full bg-white/10 p-2 focus-visible:ring-2 focus-visible:ring-white/60">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
        </button>
      </form>

      {notice && <p role="status" className="mt-2 text-[11px] text-white/60">{notice}</p>}

      <ul className="mt-2 max-h-52 space-y-1 overflow-y-auto">
        {tracks.map((track, index) => (
          <li key={track.id}>
            <button
              type="button"
              onClick={() => void play(index)}
              className="flex w-full min-h-11 items-center gap-2 rounded-xl px-2 py-1.5 text-left hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/60"
            >
              <Play className="h-3.5 w-3.5 shrink-0 text-white/70" aria-hidden="true" />
              <span className="min-w-0">
                <span className="block truncate text-xs">{track.title}</span>
                <span className="block truncate text-[10px] text-white/50">{track.artist}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-2 flex items-center gap-2">
        <button type="button" aria-label="Pause music" onClick={() => musicEngine.pause()} className="rounded-full bg-white/10 p-2 focus-visible:ring-2 focus-visible:ring-white/60"><Pause className="h-4 w-4" /></button>
        <button type="button" aria-label="Next song" onClick={() => void musicEngine.next()} className="rounded-full bg-white/10 p-2 focus-visible:ring-2 focus-visible:ring-white/60"><SkipForward className="h-4 w-4" /></button>
      </div>
    </div>
  );
};

export default VRMusicPanel;
