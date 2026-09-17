// ═══════════════════════════════════════════════════════════════════════════════
// VR MUSIC UPLOAD PANEL
// Additive in-world upload: pick a song file and album art, name it, and it goes
// through the very same private upload pipeline as the Music uploads page, so it
// appears in Music search and on the Home listening shelf.
// The existing upload page is not modified.
// ═══════════════════════════════════════════════════════════════════════════════
import React, { useRef, useState } from 'react';
import { Image as ImageIcon, Loader2, Music, UploadCloud } from 'lucide-react';
import { uploadMyMusic } from '@/features/music/musicUploads';

const VRMusicUploadPanel: React.FC = () => {
  const audioRef = useRef<HTMLInputElement | null>(null);
  const artRef = useRef<HTMLInputElement | null>(null);
  const [song, setSong] = useState<File | null>(null);
  const [art, setArt] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  const send = async () => {
    if (!song || !title.trim() || !artist.trim() || busy) return;
    setBusy(true); setNotice('Uploading…');
    try {
      const { track } = await uploadMyMusic({ file: song, artwork: art, title: title.trim(), artist: artist.trim() });
      setNotice(`“${track.title}” is in your Music now.`);
      setSong(null); setArt(null); setTitle(''); setArtist('');
      if (audioRef.current) audioRef.current.value = '';
      if (artRef.current) artRef.current.value = '';
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'That upload did not finish. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="w-64 sm:w-72 space-y-2 rounded-2xl bg-black/50 p-3 text-white backdrop-blur-xl">
      <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-white/10 px-2 py-2 text-[11px]">
        <Music className="h-4 w-4 shrink-0 text-cyan-300" aria-hidden="true" />
        <span className="truncate">{song ? song.name : 'Choose a song file'}</span>
        <input
          ref={audioRef}
          type="file"
          accept="audio/*"
          aria-label="Choose a song file to upload"
          className="hidden"
          onChange={(event) => setSong(event.target.files?.[0] ?? null)}
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

      <button
        type="button"
        onClick={() => void send()}
        disabled={!song || !title.trim() || !artist.trim() || busy}
        aria-label="Upload this song"
        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-white/15 text-xs disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-white/60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
        Upload to my Music
      </button>

      {notice && <p role="status" aria-live="polite" className="text-[11px] text-white/70">{notice}</p>}
    </div>
  );
};

export default VRMusicUploadPanel;
