// ═══════════════════════════════════════════════════════════════════════════════
// VR MUSIC UPLOAD PANEL
// Additive in-world upload: pick a song file and album art, name it, and it goes
// through the very same private upload pipeline as the Music uploads page, so it
// appears in Music search and on the Home listening shelf.
// The existing upload page is not modified.
// Stages, a hard time limit and Cancel keep the window from sitting on
// "Uploading…" forever when a file is long or the connection stalls.
// ═══════════════════════════════════════════════════════════════════════════════
import React, { useEffect, useRef, useState } from 'react';
import { Image as ImageIcon, Loader2, Music, UploadCloud, X } from 'lucide-react';
import { MAX_STORED_BYTES, uploadMyMusic } from '@/features/music/musicUploads';

const UPLOAD_TIMEOUT_MS = 180_000;
const AUDIO_NAME = /\.(mp3|m4a|aac|wav|flac|ogg|oga|opus|aif|aiff|wma)$/i;

type Stage = 'idle' | 'preparing' | 'saved' | 'failed';

const VRMusicUploadPanel: React.FC = () => {
  const audioRef = useRef<HTMLInputElement | null>(null);
  const artRef = useRef<HTMLInputElement | null>(null);
  const cancelledRef = useRef(false);
  const [song, setSong] = useState<File | null>(null);
  const [art, setArt] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [album, setAlbum] = useState('');
  const [stage, setStage] = useState<Stage>('idle');
  const [notice, setNotice] = useState('');

  const busy = stage === 'preparing';

  useEffect(() => () => { cancelledRef.current = true; }, []);

  const pickSong = (file: File | null) => {
    setStage('idle');
    if (!file) { setSong(null); setNotice(''); return; }
    if (file.size > MAX_BYTES) {
      setSong(null);
      setNotice(`That song is ${Math.round(file.size / (1024 * 1024))} MB. Songs up to 150 MB can be uploaded.`);
      return;
    }
    if (!file.type.startsWith('audio/') && !file.type.startsWith('video/mp4') && !AUDIO_NAME.test(file.name)) {
      setSong(null);
      setNotice('Choose an audio file, for example an MP3 or M4A.');
      return;
    }
    setSong(file);
    setNotice('');
    if (!title.trim()) setTitle(file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').slice(0, 80));
  };

  const cancel = () => {
    cancelledRef.current = true;
    setStage('idle');
    setNotice('Upload cancelled.');
  };

  const send = async () => {
    if (!song || !title.trim() || !artist.trim() || busy) return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setStage('failed');
      setNotice('You are offline right now. Reconnect and try again — nothing was lost.');
      return;
    }
    cancelledRef.current = false;
    setStage('preparing');
    setNotice('Preparing and uploading…');
    try {
      const result = await Promise.race([
        uploadMyMusic({ file: song, artwork: art, title: title.trim(), artist: artist.trim(), album: album.trim() || undefined }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), UPLOAD_TIMEOUT_MS)),
      ]);
      if (cancelledRef.current) return;
      setStage('saved');
      setNotice(`“${result.track.title}” is in your Music now.`);
      setSong(null); setArt(null); setTitle(''); setArtist(''); setAlbum('');
      if (audioRef.current) audioRef.current.value = '';
      if (artRef.current) artRef.current.value = '';
    } catch (error) {
      if (cancelledRef.current) return;
      setStage('failed');
      const message = error instanceof Error ? error.message : '';
      setNotice(
        message === 'timeout'
          ? 'This is taking too long — the connection looks slow. Tap upload again to retry.'
          : message || 'That upload did not finish. Check your connection and try again.',
      );
    }
  };

  return (
    <div
      className="w-64 sm:w-72 max-h-[70vh] space-y-2 overflow-y-auto rounded-2xl bg-black/50 p-3 text-white backdrop-blur-xl"
      // Typing and file pickers must win over the panel's drag gesture.
      onPointerDown={(event) => event.stopPropagation()}
      onTouchStart={(event) => event.stopPropagation()}
      style={{ touchAction: 'auto' }}
    >
      <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-white/10 px-2 py-2 text-[11px]">
        <Music className="h-4 w-4 shrink-0 text-cyan-300" aria-hidden="true" />
        <span className="truncate">{song ? song.name : 'Choose a song file'}</span>
        <input
          ref={audioRef}
          type="file"
          accept="audio/*"
          aria-label="Choose a song file to upload"
          className="hidden"
          onChange={(event) => pickSong(event.target.files?.[0] ?? null)}
        />
      </label>

      <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-white/10 px-2 py-2 text-[11px]">
        <ImageIcon className="h-4 w-4 shrink-0 text-pink-300" aria-hidden="true" />
        <span className="truncate">{art ? art.name : 'Choose album art (optional)'}</span>
        <input
          ref={artRef}
          type="file"
          accept="image/*"
          aria-label="Choose album art to upload"
          className="hidden"
          onChange={(event) => setArt(event.target.files?.[0] ?? null)}
        />
      </label>

      <input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Song title"
        aria-label="Song title"
        className="w-full rounded-xl bg-white/10 px-3 py-2 text-xs text-white placeholder:text-white/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
      />
      <input
        value={artist}
        onChange={(event) => setArtist(event.target.value)}
        placeholder="Artist"
        aria-label="Artist"
        className="w-full rounded-xl bg-white/10 px-3 py-2 text-xs text-white placeholder:text-white/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
      />
      <input
        value={album}
        onChange={(event) => setAlbum(event.target.value)}
        placeholder="Album (optional)"
        aria-label="Album"
        className="w-full rounded-xl bg-white/10 px-3 py-2 text-xs text-white placeholder:text-white/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
      />

      <button
        type="button"
        onClick={() => void send()}
        disabled={!song || !title.trim() || !artist.trim() || busy}
        aria-label={stage === 'failed' ? 'Retry this upload' : 'Upload this song'}
        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-white/15 text-xs disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-white/60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
        {stage === 'failed' ? 'Retry upload' : 'Upload to my Music'}
      </button>

      {busy && (
        <button
          type="button"
          onClick={cancel}
          aria-label="Cancel this upload"
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-white/5 text-[11px] text-white/70 focus-visible:ring-2 focus-visible:ring-white/60"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
          Cancel
        </button>
      )}

      {notice && <p role="status" aria-live="polite" className="text-[11px] text-white/70">{notice}</p>}
    </div>
  );
};

export default VRMusicUploadPanel;
