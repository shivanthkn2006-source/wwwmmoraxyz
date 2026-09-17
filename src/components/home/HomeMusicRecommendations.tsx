import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Music, Play, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { musicEngine } from '@/services/MusicEngine';
import TrackArtwork from '@/components/music/TrackArtwork';
import { fetchMusicRecommendations } from '@/features/music/musicRecommendations';
import type { MusicTrack } from '@/features/music/musicProviders';

/** A compact Home row of recommended songs, from real plays and saved taste. */
const HomeMusicRecommendations: React.FC<{ onContent?: (hasSongs: boolean) => void }> = ({ onContent }) => {
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void fetchMusicRecommendations().then((sections) => {
      if (cancelled) return;
      const first = sections.find((section) => section.tracks.length);
      setTracks(first?.tracks.slice(0, 12) ?? []);
      setReason(first?.label ?? '');
      onContent?.(Boolean(first?.tracks.length));
    }).catch(() => undefined).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading || !tracks.length) return null;

  return (
    <section className="space-y-3 px-3" aria-label="Recommended songs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-foreground/80" aria-hidden="true" />
          <h2 className="text-sm font-semibold">{reason || 'Recommended for you'}</h2>
        </div>
        <Link to="/music/recommendations" className="text-[11px] text-muted-foreground hover:text-foreground">See all</Link>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {tracks.map((track, index) => (
          <div key={track.id} className="w-24 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Play ${track.title}`}
              className="relative h-24 w-24 overflow-hidden rounded-lg p-0"
              onClick={() => { musicEngine.unlock(); void musicEngine.playQueue(tracks, index); }}
            >
              <TrackArtwork src={track.artwork} trackId={track.id} className="h-full w-full object-cover" fallback={<Music className="h-6 w-6 text-muted-foreground" aria-hidden="true" />} />
              <Play className="absolute bottom-1 left-1 h-4 w-4 fill-current" aria-hidden="true" />
            </Button>
            <span className="mt-1 block truncate text-[11px] font-medium">{track.title}</span>
            <span className="block truncate text-[10px] text-muted-foreground">{track.artist}</span>
          </div>
        ))}
      </div>
    </section>
  );
};

export default HomeMusicRecommendations;
