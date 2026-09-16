/**
 * Home feed music shelf — each member's most listened songs with album art and
 * a play button. Playback goes through the one global music engine, so a song
 * started here keeps playing while the member scrolls or changes page.
 */
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Music, Play } from 'lucide-react';
import { musicEngine } from '@/services/MusicEngine';
import { fetchMemberListening, type MemberListening } from '@/features/music/musicSocial';

const HomeMusicShelf: React.FC = () => {
  const [members, setMembers] = useState<MemberListening[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void fetchMemberListening()
      .then((rows) => { if (!cancelled) setMembers(rows); })
      .catch(() => { if (!cancelled) setMembers([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading || !members.length) return null;

  return (
    <section className="space-y-3 px-3" aria-label="Most listened music">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Music className="h-4 w-4 text-foreground/80" aria-hidden="true" />
          <h2 className="text-sm font-semibold">Most listened</h2>
        </div>
        <Link to="/music" className="text-[11px] text-muted-foreground hover:text-foreground">Open Music</Link>
      </div>

      <div className="space-y-3">
        {members.map((member) => (
          <div key={member.userId} className="space-y-1.5">
            <div className="flex items-center gap-2">
              {member.photo ? (
                <img src={member.photo} alt="" loading="lazy" className="h-6 w-6 rounded-full object-cover" />
              ) : (
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[10px]">{member.name.slice(0, 1)}</span>
              )}
              <span className="truncate text-xs font-medium">{member.name}</span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {member.tracks.map((track, index) => (
                <button
                  key={`${member.userId}-${track.id}`}
                  type="button"
                  onClick={() => { musicEngine.unlock(); void musicEngine.playQueue(member.tracks, index); }}
                  aria-label={`Play ${track.title} by ${track.artist}`}
                  className="relative w-24 shrink-0 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="relative block h-24 w-24 overflow-hidden rounded-lg bg-muted">
                    {track.artwork ? (
                      <img src={track.artwork} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
                    ) : (
                      <Music className="absolute inset-0 m-auto h-6 w-6 text-muted-foreground" aria-hidden="true" />
                    )}
                    <Play className="absolute bottom-1 left-1 h-4 w-4 fill-white text-white drop-shadow" aria-hidden="true" />
                  </span>
                  <span className="mt-1 block truncate text-[11px] font-medium">{track.title}</span>
                  <span className="block truncate text-[10px] text-muted-foreground">{track.artist}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default HomeMusicShelf;
