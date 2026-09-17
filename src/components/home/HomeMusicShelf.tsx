import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LibraryBig, ListPlus, Music, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { musicEngine } from '@/services/MusicEngine';
import TrackArtwork from '@/components/music/TrackArtwork';
import { fetchMyListening, type MyListeningTrack } from '@/features/music/musicSocial';
import { addToTray } from '@/features/music/musicTray';

const HomeMusicShelf: React.FC<{ onContent?: (hasSongs: boolean) => void }> = ({ onContent }) => {
  const [tracks, setTracks] = useState<MyListeningTrack[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    void fetchMyListening().then((rows) => { if (!cancelled) { setTracks(rows); onContent?.(rows.length > 0); } }).catch(() => undefined).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (loading || !tracks.length) return null;
  return <section className="space-y-3 px-3" aria-label="My listening shelf">
    <div className="flex items-center justify-between"><div className="flex items-center gap-2"><LibraryBig className="h-4 w-4 text-foreground/80" aria-hidden="true" /><h2 className="text-sm font-semibold">My listening</h2></div><Link to="/music" className="text-[11px] text-muted-foreground hover:text-foreground">Open Music</Link></div>
    <div className="flex gap-2 overflow-x-auto pb-1">{tracks.map((track, index) => <div key={track.id} className="w-24 shrink-0">
      <Button variant="ghost" size="icon" onClick={() => { musicEngine.unlock(); void musicEngine.playQueue(tracks, index); }} aria-label={`Play ${track.title}`} className="relative h-24 w-24 overflow-hidden rounded-lg p-0">
        <TrackArtwork src={track.artwork} trackId={track.id} className="h-full w-full object-cover" fallback={<Music className="h-6 w-6 text-muted-foreground" aria-hidden="true" />} /><Play className="absolute bottom-1 left-1 h-4 w-4 fill-current" aria-hidden="true" />
      </Button><span className="mt-1 flex items-center gap-1"><span className="min-w-0 flex-1 truncate text-[11px] font-medium">{track.title}</span>
        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground" aria-label={`Send ${track.title} to my playlists page`} onClick={() => addToTray(track)}><ListPlus className="h-3.5 w-3.5" /></Button>
      </span><span className="block truncate text-[10px] text-muted-foreground">{track.playCount} {track.playCount === 1 ? 'play' : 'plays'}</span>
    </div>)}</div>
  </section>;
};
export default HomeMusicShelf;
