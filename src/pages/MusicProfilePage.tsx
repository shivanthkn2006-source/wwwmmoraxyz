import { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Heart, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MUSIC_GENRES } from '@/features/music/musicCategories';
import { EMPTY_TASTE, MUSIC_MOODS, MUSIC_RELIGIONS, fetchMyMusicProfile, saveMyMusicProfile, type MusicTasteProfile } from '@/features/music/musicProfile';
import { getLibrary } from '@/features/music/musicLibrary';
import { fetchMyListening } from '@/features/music/musicSocial';
import type { MusicTrack } from '@/features/music/musicProviders';

function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

export default function MusicProfilePage() {
  const navigate = useNavigate();
  const [taste, setTaste] = useState<MusicTasteProfile>(EMPTY_TASTE);
  const [artistDraft, setArtistDraft] = useState('');
  const [candidates, setCandidates] = useState<MusicTrack[]>([]);
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetchMyMusicProfile().then((profile) => { if (!cancelled) setTaste(profile); }).catch(() => setNotice('Could not load your music profile.'));
    void fetchMyListening().then((history) => {
      if (cancelled) return;
      const saved = getLibrary().saved;
      const map = new Map<string, MusicTrack>();
      [...saved, ...history].forEach((track) => map.set(track.id, track));
      setCandidates([...map.values()].slice(0, 40));
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  const favoriteIds = useMemo(() => new Set(taste.favoriteTracks.map((track) => track.id)), [taste.favoriteTracks]);

  const save = async () => {
    setSaving(true); setNotice('Saving…');
    try {
      await saveMyMusicProfile(taste);
      setNotice('Saved. Home will recommend songs from this taste.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not save your music profile.');
    } finally { setSaving(false); }
  };

  return (
    <main className="music-liquid-page min-h-[100dvh] p-3 text-white">
      <Helmet>
        <title>My Music Taste — Genres, Moods & Artists</title>
        <meta name="description" content="Set your favourite music genres, moods, artists and songs so your Home feed recommends music you actually like." />
      </Helmet>
      <section className="mx-auto max-w-2xl space-y-5">
        <header className="flex items-center justify-between">
          <Button variant="ghost" size="icon" aria-label="Back to Music" onClick={() => navigate('/music')}><ArrowLeft /></Button>
          <h1 className="text-sm font-semibold">My music taste</h1>
          <span className="w-9" aria-hidden="true" />
        </header>

        <DailyPlanetaryMoodPanel />

        <div>
          <p className="music-liquid-side-title">Genres</p>
          <div className="flex flex-wrap gap-1.5">
            {MUSIC_GENRES.map((genre) => (
              <button key={genre.id} type="button" aria-pressed={taste.genres.includes(genre.label)} className={`music-liquid-chip ${taste.genres.includes(genre.label) ? 'is-active' : ''}`} onClick={() => setTaste((current) => ({ ...current, genres: toggle(current.genres, genre.label) }))}>{genre.label}</button>
            ))}
          </div>
        </div>

        <div>
          <p className="music-liquid-side-title">Moods</p>
          <div className="flex flex-wrap gap-1.5">
            {MUSIC_MOODS.map((mood) => (
              <button key={mood} type="button" aria-pressed={taste.moods.includes(mood)} className={`music-liquid-chip ${taste.moods.includes(mood) ? 'is-active' : ''}`} onClick={() => setTaste((current) => ({ ...current, moods: toggle(current.moods, mood) }))}>{mood}</button>
            ))}
          </div>
        </div>

        <div>
          <p className="music-liquid-side-title">Faith (optional)</p>
          <div className="flex flex-wrap gap-1.5">
            {MUSIC_RELIGIONS.filter((item) => item).map((religion) => (
              <button
                key={religion}
                type="button"
                aria-pressed={taste.religion === religion}
                className={`music-liquid-chip ${taste.religion === religion ? 'is-active' : ''}`}
                onClick={() => setTaste((current) => ({ ...current, religion: current.religion === religion ? '' : religion }))}
              >
                {religion}
              </button>
            ))}
          </div>
          <p className="mt-1 text-xs text-white/50">Used only to suggest devotional music you would actually listen to.</p>
        </div>

        <div className="space-y-2">
          <p className="music-liquid-side-title">Artists</p>
          <form className="flex items-center gap-2" onSubmit={(event) => {
            event.preventDefault();
            const name = artistDraft.trim();
            if (!name) return;
            setTaste((current) => ({ ...current, artists: current.artists.includes(name) ? current.artists : [...current.artists, name] }));
            setArtistDraft('');
          }}>
            <Input value={artistDraft} onChange={(event) => setArtistDraft(event.target.value)} placeholder="Add an artist" aria-label="Add an artist" />
            <Button variant="ghost" size="icon" type="submit" aria-label="Add this artist"><Plus /></Button>
          </form>
          <div className="flex flex-wrap gap-1.5">
            {taste.artists.map((artist) => (
              <button key={artist} type="button" className="music-liquid-chip is-active" aria-label={`Remove ${artist}`} onClick={() => setTaste((current) => ({ ...current, artists: current.artists.filter((item) => item !== artist) }))}>
                {artist} <X className="ml-1 inline h-3 w-3" aria-hidden="true" />
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="music-liquid-side-title">Favourite tracks</p>
          {candidates.length ? (
            <ol className="space-y-1">
              {candidates.map((track) => (
                <li key={track.id} className="flex items-center gap-2">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{track.title}</span>
                    <span className="block truncate text-xs text-white/60">{track.artist}</span>
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-pressed={favoriteIds.has(track.id)}
                    aria-label={favoriteIds.has(track.id) ? `Remove ${track.title} from favourites` : `Mark ${track.title} as a favourite`}
                    onClick={() => setTaste((current) => ({
                      ...current,
                      favoriteTracks: favoriteIds.has(track.id)
                        ? current.favoriteTracks.filter((item) => item.id !== track.id)
                        : [...current.favoriteTracks, track],
                    }))}
                  >
                    <Heart className={favoriteIds.has(track.id) ? 'fill-current' : ''} />
                  </Button>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-white/50">Play or save a few songs in Music and they will appear here to mark as favourites.</p>
          )}
        </div>

        {notice && <p role="status" aria-live="polite" className="text-xs text-white/70">{notice}</p>}

        <div className="pb-6">
          <Button variant="ghost" aria-label="Save my music taste" disabled={saving} onClick={() => void save()} className="w-full gap-2">
            <Check /> Save my taste
          </Button>
        </div>

      </section>
    </main>
  );
}
