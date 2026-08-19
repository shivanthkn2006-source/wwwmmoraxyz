import React, { useEffect, useState } from 'react';
import { Clock, ListVideo, Play, Plus, Trash2, X } from 'lucide-react';
import {
  ShortsPlaylist,
  WATCH_LATER_ID,
  createPlaylist,
  loadPlaylists,
  removePlaylist,
  subscribeToPlaylists,
  togglePlaylistItem,
} from '@/lib/shortsPlaylists';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface PlaylistsSectionProps {
  onPlayItem?: (postId: string) => void;
}

/** Playlists + Watch later shelf for shorts, shown on /home. */
const PlaylistsSection: React.FC<PlaylistsSectionProps> = ({ onPlayItem }) => {
  const [playlists, setPlaylists] = useState<ShortsPlaylist[]>([]);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    setPlaylists(loadPlaylists());
    return subscribeToPlaylists(setPlaylists);
  }, []);

  const total = playlists.reduce((sum, p) => sum + p.items.length, 0);

  return (
    <section className="space-y-2 px-3" aria-label="Shorts playlists">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListVideo className="h-4 w-4 text-foreground/80" />
          <h2 className="text-sm font-semibold">Playlists</h2>
          <span className="text-[10px] tabular-nums text-muted-foreground/60">{total}</span>
        </div>
        <button
          type="button"
          onClick={() => setCreating((v) => !v)}
          className="flex items-center gap-1 rounded-md border border-foreground/25 px-2 py-1 text-[11px] text-foreground hover:bg-foreground/10"
        >
          {creating ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
          {creating ? 'Cancel' : 'New'}
        </button>
      </div>

      {creating && (
        <div className="flex items-center gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Playlist name"
            className="h-8 text-xs"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newName.trim()) {
                setPlaylists(createPlaylist(newName));
                setNewName('');
                setCreating(false);
              }
            }}
          />
          <Button
            size="sm"
            className="h-8 text-xs"
            onClick={() => {
              if (!newName.trim()) return;
              setPlaylists(createPlaylist(newName));
              setNewName('');
              setCreating(false);
            }}
          >
            Create
          </Button>
        </div>
      )}

      <div className="space-y-3">
        {playlists.map((pl) => (
          <div key={pl.id} className="rounded-lg border border-border/50 bg-muted/20 p-2">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-medium">
                {pl.id === WATCH_LATER_ID && <Clock className="h-3.5 w-3.5" />}
                {pl.name}
                <span className="text-[10px] text-muted-foreground">({pl.items.length})</span>
              </div>
              {pl.id !== WATCH_LATER_ID && (
                <button
                  type="button"
                  aria-label={`Delete playlist ${pl.name}`}
                  onClick={() => setPlaylists(removePlaylist(pl.id))}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {pl.items.length === 0 ? (
              <p className="px-1 pb-1 text-[11px] text-muted-foreground">
                {pl.id === WATCH_LATER_ID
                  ? 'Tap the clock on any short to watch it later.'
                  : 'Empty — add shorts from the post menu.'}
              </p>
            ) : (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {pl.items.map((item) => (
                  <div key={item.postId} className="relative w-20 shrink-0">
                    <button
                      type="button"
                      onClick={() => onPlayItem?.(item.postId)}
                      className="relative block h-32 w-20 overflow-hidden rounded-lg bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {item.posterUrl || item.mediaType === 'image' ? (
                        <img
                          src={item.posterUrl || item.mediaUrl || ''}
                          alt={item.content?.slice(0, 40) || 'Saved short'}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center p-1 text-[9px] leading-tight text-muted-foreground">
                          {item.content?.slice(0, 40) || 'Short'}
                        </span>
                      )}
                      <Play className="absolute bottom-1 left-1 h-3 w-3 fill-white text-white drop-shadow" />
                    </button>
                    <button
                      type="button"
                      aria-label="Remove from playlist"
                      onClick={() => setPlaylists(togglePlaylistItem(pl.id, item).playlists)}
                      className="absolute right-1 top-1 rounded-full bg-black/50 p-0.5 text-white hover:bg-black/70"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};

export default PlaylistsSection;
