import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Disc3, ImagePlus, Play, Trash2, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { musicEngine } from '@/services/MusicEngine';
import { deleteMyUpload, listMyUploads, uploadMyMusic } from '@/features/music/musicUploads';
import type { MusicTrack } from '@/features/music/musicProviders';

export default function MusicUploadsPage() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const artRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [artwork, setArtwork] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [album, setAlbum] = useState('');
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [canRetry, setCanRetry] = useState(false);

  const refresh = () => void listMyUploads().then(setTracks).catch(() => setNotice('Could not load your uploads.'));
  useEffect(refresh, []);

  const pick = (picked: File | null) => {
    setFile(picked);
    if (picked && !title) setTitle(picked.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' '));
  };
  const submit = async () => {
    if (!file || !title.trim()) return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setNotice('You are offline. Reconnect, then press upload again.');
      setCanRetry(true);
      return;
    }
    setBusy(true); setCanRetry(false); setNotice('Compressing and uploading…');
    try {
      const result = await uploadMyMusic({ file, artwork, title, artist, album });
      setTracks((current) => [result.track, ...current]);
      setFile(null); setArtwork(null); setTitle(''); setArtist(''); setAlbum('');
      if (fileRef.current) fileRef.current.value = '';
      if (artRef.current) artRef.current.value = '';
      setNotice(result.compressed ? 'Uploaded as a space-saving MP3. It now shows in Music search.' : 'Uploaded. It now shows in Music search.');
    } catch (error) {
      setNotice(`${error instanceof Error ? error.message : 'Upload failed.'} You can press upload again to retry.`);
      setCanRetry(true);
    }
    finally { setBusy(false); }
  };
  const play = async (index: number) => {
    musicEngine.unlock();
    const started = await musicEngine.playQueue(tracks, index);
    if (!started) setNotice(musicEngine.getState().error ?? 'This song could not be played. Please try again.');
  };

  return (
    <main className="music-liquid-page min-h-[100dvh] p-3 text-white">
      <section className="mx-auto max-w-2xl space-y-5">
        <header className="flex items-center justify-between">
          <Button variant="ghost" size="icon" aria-label="Back to Music" onClick={() => navigate('/music')}><ArrowLeft /></Button>
          <h1 className="text-sm font-semibold">My uploads</h1>
          <Upload className="h-5 w-5" aria-hidden="true" />
        </header>
        <div className="space-y-3">
          <Input ref={fileRef} type="file" accept="audio/mpeg,audio/mp4,audio/x-m4a,audio/wav,audio/ogg,audio/flac" onChange={(event) => pick(event.target.files?.[0] ?? null)} />
          <div className="grid gap-2 sm:grid-cols-3"><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" /><Input value={artist} onChange={(e) => setArtist(e.target.value)} placeholder="Artist" /><Input value={album} onChange={(e) => setAlbum(e.target.value)} placeholder="Album" /></div>
          <label className="flex cursor-pointer items-center gap-2 text-xs text-white/70"><ImagePlus className="h-4 w-4" /> Album art (optional)<Input ref={artRef} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setArtwork(event.target.files?.[0] ?? null)} /></label>
          <Button variant="ghost" size="icon" aria-label="Upload music" disabled={!file || !title.trim() || busy} onClick={() => void submit()}><Upload /></Button>
          {notice && <p role="status" className="text-xs text-white/70">{notice}</p>}
        </div>
        <ol className="space-y-2">
          {tracks.map((track, index) => <li key={track.id} className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full">{track.artwork ? <img src={track.artwork} alt="" className="h-full w-full object-cover" /> : <Disc3 />}</span>
            <span className="min-w-0 flex-1"><span className="block truncate text-sm">{track.title}</span><span className="block truncate text-xs text-white/60">{track.artist}{track.album ? ` · ${track.album}` : ''}</span></span>
            <Button variant="ghost" size="icon" aria-label={`Play ${track.title}`} onClick={() => { musicEngine.unlock(); void musicEngine.playQueue(tracks, index); }}><Play /></Button>
            <Button variant="ghost" size="icon" aria-label={`Delete ${track.title}`} onClick={() => void deleteMyUpload(track.id).then(refresh)}><Trash2 /></Button>
          </li>)}
        </ol>
      </section>
    </main>
  );
}
