import { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Download, GripVertical, Pencil, Play, Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { musicEngine } from '@/services/MusicEngine';
import TrackArtwork from '@/components/music/TrackArtwork';
import { getLibrary, subscribeLibrary } from '@/features/music/musicLibrary';
import type { MusicTrack } from '@/features/music/musicProviders';
import {
  createPlaylist, deletePlaylist, fetchMyPlaylists, importDevicePlaylists, moveTrackBetween,
  renamePlaylist, savePlaylistTracks, withTrack, withoutTrack, type MusicPlaylist,
} from '@/features/music/musicPlaylists';

interface Dragged { playlistId: string; trackId: string }

export default function MusicPlaylistsPage() {
  const navigate = useNavigate();
  const [playlists, setPlaylists] = useState<MusicPlaylist[]>([]);
  const [saved, setSaved] = useState<MusicTrack[]>(getLibrary().saved);
  const [name, setName] = useState('');
  const [renaming, setRenaming] = useState<{ id: string; value: string } | null>(null);
  const [dragged, setDragged] = useState<Dragged | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => subscribeLibrary((library) => setSaved(library.saved)), []);

  const load = useCallback(async () => {
    try {
      setPlaylists(await fetchMyPlaylists());
      setNotice('');
    } catch {
      setNotice('Your playlists could not be loaded. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const add = async () => {
    try {
      const created = await createPlaylist(name);
      setPlaylists((current) => [...current, created]);
      setName('');
      setNotice(`“${created.name}” is ready. Drag songs into it.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not create that playlist.');
    }
  };

  const commitRename = async () => {
    if (!renaming) return;
    const { id, value } = renaming;
    try {
      await renamePlaylist(id, value);
      setPlaylists((current) => current.map((playlist) => (playlist.id === id ? { ...playlist, name: value.trim() } : playlist)));
      setRenaming(null);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not rename that playlist.');
    }
  };

  const remove = async (playlist: MusicPlaylist) => {
    const previous = playlists;
    setPlaylists((current) => current.filter((item) => item.id !== playlist.id));
    try {
      await deletePlaylist(playlist.id);
    } catch {
      setPlaylists(previous);
      setNotice('Could not delete that playlist.');
    }
  };

  /** Saves one playlist and rolls back on failure so the screen never lies. */
  const persist = async (next: MusicPlaylist[], ids: string[]) => {
    const previous = playlists;
    setPlaylists(next);
    try {
      await Promise.all(ids.map((id) => {
        const playlist = next.find((item) => item.id === id);
        return playlist ? savePlaylistTracks(id, playlist.tracks) : Promise.resolve();
      }));
    } catch {
      setPlaylists(previous);
      setNotice('That change could not be saved. Check your connection and try again.');
    }
  };

  const drop = async (toId: string) => {
    setDropTarget(null);
    if (!dragged || dragged.playlistId === toId) { setDragged(null); return; }
    if (dragged.playlistId === 'saved') {
      const track = saved.find((item) => item.id === dragged.trackId);
      setDragged(null);
      if (!track) return;
      const next = playlists.map((playlist) => (playlist.id === toId ? { ...playlist, tracks: withTrack(playlist.tracks, track) } : playlist));
      await persist(next, [toId]);
      return;
    }
    const from = dragged.playlistId;
    const next = moveTrackBetween(playlists, from, toId, dragged.trackId);
    setDragged(null);
    await persist(next, [from, toId]);
  };

  const removeTrack = async (playlistId: string, trackId: string) => {
    const next = playlists.map((playlist) => (playlist.id === playlistId ? { ...playlist, tracks: withoutTrack(playlist.tracks, trackId) } : playlist));
    await persist(next, [playlistId]);
  };

  /** Touch-friendly alternative to dragging. */
  const moveTo = async (fromId: string, trackId: string, toId: string) => {
    if (fromId === 'saved') {
      const track = saved.find((item) => item.id === trackId);
      if (!track) return;
      const next = playlists.map((playlist) => (playlist.id === toId ? { ...playlist, tracks: withTrack(playlist.tracks, track) } : playlist));
      await persist(next, [toId]);
      return;
    }
    await persist(moveTrackBetween(playlists, fromId, toId, trackId), [fromId, toId]);
  };

  const importDevice = async () => {
    try {
      const created = await importDevicePlaylists();
      await load();
      setNotice(created ? `Brought ${created} playlist${created === 1 ? '' : 's'} from this device.` : 'Nothing new to bring over from this device.');
    } catch {
      setNotice('Could not bring your device playlists over.');
    }
  };

  const targets = useMemo(() => playlists.map((playlist) => ({ id: playlist.id, name: playlist.name })), [playlists]);

  const trackRow = (track: MusicTrack, playlistId: string, index: number, tracks: MusicTrack[]) => (
    <li
      key={`${playlistId}-${track.id}`}
      draggable
      onDragStart={() => setDragged({ playlistId, trackId: track.id })}
      onDragEnd={() => setDragged(null)}
      className="music-liquid-control flex items-center gap-2 rounded-2xl p-2"
    >
      <GripVertical className="h-4 w-4 shrink-0 text-white/40" aria-hidden="true" />
      <TrackArtwork src={track.artwork} trackId={track.id} alt={track.title} className="h-9 w-9 shrink-0 rounded-lg object-cover" fallback={<span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-[10px] text-white/50">♪</span>} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-white">{track.title}</p>
        <p className="truncate text-[11px] text-white/50">{track.artist}</p>
      </div>
      <Button
        variant="ghost" size="icon" className="h-8 w-8 text-white/70 hover:text-white"
        aria-label={`Play ${track.title}`}
        onClick={() => { musicEngine.unlock(); void musicEngine.playQueue(tracks, index); }}
      >
        <Play className="h-4 w-4" />
      </Button>
      {targets.length > (playlistId === 'saved' ? 0 : 1) && (
        <select
          aria-label={`Move ${track.title} to another playlist`}
          className="max-w-[6.5rem] rounded-full bg-transparent px-1 text-[11px] text-white/70"
          value=""
          onChange={(event) => { const to = event.target.value; if (to) void moveTo(playlistId, track.id, to); }}
        >
          <option value="">Move…</option>
          {targets.filter((target) => target.id !== playlistId).map((target) => (
            <option key={target.id} value={target.id} className="text-black">{target.name}</option>
          ))}
        </select>
      )}
      {playlistId !== 'saved' && (
        <Button
          variant="ghost" size="icon" className="h-8 w-8 text-white/50 hover:text-white"
          aria-label={`Remove ${track.title} from ${playlists.find((p) => p.id === playlistId)?.name ?? 'playlist'}`}
          onClick={() => void removeTrack(playlistId, track.id)}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </li>
  );

  return (
    <main className="music-liquid-page flex min-h-[100dvh] flex-col p-0 text-white">
      <Helmet>
        <title>My Playlists — Create, Edit & Reorder Music</title>
        <meta name="description" content="Create your own music playlists, drag songs between them and play them anywhere, with your uploads and saved songs included." />
      </Helmet>
      <div className="music-liquid-shell flex min-h-[100dvh] w-full flex-col overflow-hidden">
        <header className="music-align-search flex items-center justify-between gap-2 p-3">
          <Button variant="ghost" size="icon" aria-label="Back to Music" onClick={() => navigate('/music')}><ArrowLeft /></Button>
          <h1 className="text-sm font-semibold">My playlists</h1>
          <Button variant="ghost" size="icon" aria-label="Bring playlists from this device" onClick={() => void importDevice()}><Download className="h-4 w-4" /></Button>
        </header>

        <form
          className="music-liquid-control mx-3 flex items-center gap-2 rounded-full p-1"
          onSubmit={(event) => { event.preventDefault(); void add(); }}
        >
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="New playlist name"
            aria-label="New playlist name"
            className="h-10 border-0 bg-transparent text-white placeholder:text-white/40 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          <Button type="submit" variant="ghost" size="icon" aria-label="Create playlist" disabled={!name.trim()}><Plus /></Button>
        </form>

        {notice && <p className="px-4 pt-2 text-[11px] text-white/60" role="status">{notice}</p>}

        <div className="grid min-h-0 flex-1 gap-3 overflow-y-auto p-3 sm:grid-cols-2 xl:grid-cols-3">
          {playlists.map((playlist) => (
            <section
              key={playlist.id}
              onDragOver={(event) => { event.preventDefault(); setDropTarget(playlist.id); }}
              onDragLeave={() => setDropTarget((current) => (current === playlist.id ? null : current))}
              onDrop={(event) => { event.preventDefault(); void drop(playlist.id); }}
              className={`flex min-h-[8rem] flex-col gap-2 rounded-3xl p-2 transition ${dropTarget === playlist.id ? 'bg-white/10' : ''}`}
              aria-label={`Playlist ${playlist.name}`}
            >
              <div className="flex items-center gap-1 px-1">
                {renaming?.id === playlist.id ? (
                  <>
                    <Input
                      value={renaming.value}
                      autoFocus
                      onChange={(event) => setRenaming({ id: playlist.id, value: event.target.value })}
                      aria-label={`Rename ${playlist.name}`}
                      className="h-8 border-0 bg-transparent text-xs text-white focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                    <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Save name" onClick={() => void commitRename()}><Check className="h-4 w-4" /></Button>
                  </>
                ) : (
                  <>
                    <p className="min-w-0 flex-1 truncate text-xs font-semibold">{playlist.name} <span className="text-white/40">({playlist.tracks.length})</span></p>
                    <Button
                      variant="ghost" size="icon" className="h-8 w-8 text-white/60 hover:text-white"
                      aria-label={`Play ${playlist.name}`} disabled={!playlist.tracks.length}
                      onClick={() => { musicEngine.unlock(); void musicEngine.playQueue(playlist.tracks, 0); }}
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-white/60 hover:text-white" aria-label={`Rename ${playlist.name}`} onClick={() => setRenaming({ id: playlist.id, value: playlist.name })}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-white/50 hover:text-white" aria-label={`Delete ${playlist.name}`} onClick={() => void remove(playlist)}><Trash2 className="h-4 w-4" /></Button>
                  </>
                )}
              </div>
              <ul className="flex flex-col gap-1.5">
                {playlist.tracks.map((track, index) => trackRow(track, playlist.id, index, playlist.tracks))}
              </ul>
              {!playlist.tracks.length && <p className="px-1 text-[11px] text-white/40">Drag songs here, or use “Move…” beside any song.</p>}
            </section>
          ))}

          <section aria-label="Saved songs" className="flex min-h-[8rem] flex-col gap-2 rounded-3xl p-2">
            <p className="px-1 text-xs font-semibold">Saved songs <span className="text-white/40">({saved.length})</span></p>
            <ul className="flex flex-col gap-1.5">
              {saved.slice(0, 40).map((track, index) => trackRow(track, 'saved', index, saved))}
            </ul>
            {!saved.length && <p className="px-1 text-[11px] text-white/40">Save songs in Music with the heart, and they appear here to drag into a playlist.</p>}
          </section>
        </div>

        {loading && <p className="px-4 pb-3 text-[11px] text-white/50">Loading your playlists…</p>}
      </div>
    </main>
  );
}
