// ═══════════════════════════════════════════════════════════════════════════════
// VR MUSIC PANEL
// Additive in-world music search and playback. A song played here uses the same
// singleton music engine as the Music page, and the play is recorded so it shows
// up in Music search history, on the Home listening shelf and in the VR social
// feed. Real metadata (album art, artist, album/genre credit) is shown in-world,
// including for the member's own uploads, whose artwork is re-signed on demand.
// No existing VR or Music component is modified.
// ═══════════════════════════════════════════════════════════════════════════════
import React, { useEffect, useState } from 'react';
import { Loader2, Mic, Music2, Pause, Play, SkipForward } from 'lucide-react';
import { musicEngine, type MusicState } from '@/services/MusicEngine';
import { searchMusicCatalog, type MusicTrack } from '@/features/music/musicProviders';
import { logListen } from '@/features/music/musicSocial';
import { recordMusicSignal } from '@/features/music/musicConnect';
import TrackArtwork from '@/components/music/TrackArtwork';
import { resolveMusicIntent } from '@/features/music/musicIntent';
import { executeMusicIntent } from '@/features/music/executeMusicIntent';

type UploadTrack = MusicTrack & { uploadId?: string };

/** Genre-ish line shown under a track: album first, otherwise the source credit. */
const metaLine = (track: MusicTrack) => track.album?.trim() || track.credit || track.source;

const VRMusicPanel: React.FC = () => {
  const [query, setQuery] = useState('');
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [state, setState] = useState<MusicState>(() => musicEngine.getState());

  useEffect(() => musicEngine.subscribe(setState), []);

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
      // Recorded exactly like a Music page play, so it lands in history, on Home
      // and in friends' in-world social feed.
      void logListen(track).catch(() => undefined);
      void recordMusicSignal('play', { track, context: { surface: 'vr' } });
      setNotice(`Playing “${track.title}”.`);
    } else {
      setNotice(musicEngine.getState().error ?? 'Tap play once more to allow sound.');
    }
  };

  // Spoken commands in-world: the phrase is resolved by the same intent resolver
  // the Music page and Zoe chat use, so "play my mood song" plays a real track
  // here without spending any model tokens.
  const [listening, setListening] = useState(false);
  const listen = () => {
    const Recognition = (window as unknown as {
      SpeechRecognition?: new () => any;
      webkitSpeechRecognition?: new () => any;
    }).SpeechRecognition ?? (window as unknown as { webkitSpeechRecognition?: new () => any }).webkitSpeechRecognition;
    if (!Recognition) {
      setNotice('This device cannot listen. Type the song instead.');
      return;
    }
    musicEngine.unlock();
    const recognition = new Recognition();
    recognition.lang = 'en-IN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    setListening(true);
    setNotice('Listening…');
    recognition.onerror = () => { setListening(false); setNotice('I could not hear that. Please try again.'); };
    recognition.onend = () => setListening(false);
    recognition.onresult = async (event: any) => {
      const heard = String(event?.results?.[0]?.[0]?.transcript ?? '').trim();
      if (!heard) { setNotice('I could not hear that. Please try again.'); return; }
      setQuery(heard);
      const intent = resolveMusicIntent(heard);
      if (!intent) { setNotice(`I heard “${heard}”, but that was not a music request.`); return; }
      try {
        const result = await executeMusicIntent(intent, () => undefined);
        setNotice(result.message);
        const track = musicEngine.getState().track;
        if (track) {
          void logListen(track).catch(() => undefined);
          void recordMusicSignal('play', { track, context: { surface: 'vr-voice' } });
        }
      } catch {
        setNotice('That song could not be played right now.');
      }
    };
    try { recognition.start(); } catch { setListening(false); }
  };

  const current = state.track as UploadTrack | null;

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
        <button
          type="button"
          onClick={listen}
          aria-label="Speak a music command"
          aria-pressed={listening}
          className="rounded-full bg-white/10 p-2 focus-visible:ring-2 focus-visible:ring-white/60"
        >
          <Mic className={`h-4 w-4 ${listening ? 'animate-pulse text-emerald-300' : ''}`} />
        </button>
        <button type="submit" aria-label="Search music" className="rounded-full bg-white/10 p-2 focus-visible:ring-2 focus-visible:ring-white/60">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
        </button>
      </form>

      {notice && <p role="status" className="mt-2 text-[11px] text-white/60">{notice}</p>}

      {current && (
        <div className="mt-2 flex items-center gap-2" aria-label="Now playing in the VR world">
          <TrackArtwork
            src={current.artwork}
            trackId={current.id}
            uploadId={current.uploadId}
            lazy={false}
            className="h-10 w-10 shrink-0 rounded-lg object-cover"
            fallback={<Music2 className="h-4 w-4 text-white/40" />}
          />
          <span className="min-w-0">
            <span className="block truncate text-xs font-semibold">{current.title}</span>
            <span className="block truncate text-[10px] text-white/60">{current.artist}</span>
            <span className="block truncate text-[10px] text-white/40">{metaLine(current)}</span>
          </span>
        </div>
      )}

      <ul className="mt-2 max-h-52 space-y-1 overflow-y-auto">
        {tracks.map((track, index) => (
          <li key={track.id}>
            <button
              type="button"
              onClick={() => void play(index)}
              className="flex w-full min-h-11 items-center gap-2 rounded-xl px-2 py-1.5 text-left hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/60"
            >
              <TrackArtwork
                src={track.artwork}
                trackId={track.id}
                uploadId={(track as UploadTrack).uploadId}
                className="h-8 w-8 shrink-0 rounded-md object-cover"
                fallback={<Play className="h-3.5 w-3.5 text-white/70" />}
              />
              <span className="min-w-0">
                <span className="block truncate text-xs">{track.title}</span>
                <span className="block truncate text-[10px] text-white/50">{track.artist}</span>
                <span className="block truncate text-[10px] text-white/35">{metaLine(track)}</span>
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
