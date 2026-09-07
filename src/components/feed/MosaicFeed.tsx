/**
 * MosaicFeed — a scrapbook / masonry card feed.
 *
 * Additive surface: it never mutates the existing snap feeds. It reads the same
 * public posts, orders them with the intimacy graph (closeness first, recency
 * next) and renders them as monochrome cards: image, caption, author.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useIntimacyFeed } from '@/hooks/useIntimacyFeed';
import { recordFeedEvent } from '@/features/intimacy/feedEvents';
import { cn } from '@/lib/utils';

export interface MosaicItem {
  id: string;
  authorId: string | null;
  createdAt: string;
  content: string | null;
  mediaUrl: string | null;
  mediaType: string | null;
  velocity: number;
  displayName: string;
  username: string;
  avatarUrl: string | null;
}

interface MosaicFeedProps {
  limit?: number;
  className?: string;
  /** Scope: every public post, or only posts from people you follow. */
  scope?: 'all' | 'friends';
}

const isImage = (t: string | null) => !t || t.startsWith('image');

export const MosaicFeed: React.FC<MosaicFeedProps> = ({ limit = 40, className, scope = 'all' }) => {
  const navigate = useNavigate();
  const [items, setItems] = useState<MosaicItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    void (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('posts')
          .select('id, user_id, content, media_url, media_type, likes_count, comments_count, created_at')
          .not('media_url', 'is', null)
          .order('created_at', { ascending: false })
          .limit(limit);
        if (error) throw error;

        const rows = data ?? [];
        const authorIds = Array.from(new Set(rows.map((r) => r.user_id).filter(Boolean)));
        const profiles = authorIds.length
          ? (await supabase
              .from('profiles')
              .select('user_id, display_name, username, profile_photo_url')
              .in('user_id', authorIds)).data ?? []
          : [];
        const byId = new Map(profiles.map((p: any) => [p.user_id, p]));

        const mapped: MosaicItem[] = rows.map((r: any) => {
          const p = byId.get(r.user_id);
          return {
            id: r.id,
            authorId: r.user_id ?? null,
            createdAt: r.created_at,
            content: r.content,
            mediaUrl: r.media_url,
            mediaType: r.media_type,
            velocity: (r.likes_count ?? 0) + (r.comments_count ?? 0),
            displayName: p?.display_name || p?.username || 'Member',
            username: p?.username ? `@${p.username}` : '',
            avatarUrl: p?.profile_photo_url ?? null,
          };
        });
        if (alive) setItems(mapped);
      } catch {
        if (alive) setItems([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [limit, scope]);

  const { ordered } = useIntimacyFeed(items);
  const visible = useMemo(() => ordered.filter((i) => i.mediaUrl), [ordered]);

  if (loading) {
    return (
      <div className={cn('grid grid-cols-2 gap-3 p-3', className)}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-48 animate-pulse rounded-xl border border-border bg-muted/40" />
        ))}
      </div>
    );
  }

  if (visible.length === 0) {
    return (
      <p className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
        Nothing here yet — posts with photos will appear in this mosaic.
      </p>
    );
  }

  return (
    <div className={cn('columns-2 gap-3 p-3 [column-fill:_balance]', className)} data-testid="mosaic-feed">
      {visible.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => {
            void recordFeedEvent({ type: 'view', postId: item.id, targetUserId: item.authorId, surface: 'mosaic' });
            navigate(`/post/${item.id}`);
          }}
          className="mb-3 block w-full break-inside-avoid overflow-hidden rounded-xl border border-border bg-card text-left transition-transform duration-200 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          data-mosaic-card
          data-author-id={item.authorId ?? ''}
        >
          {isImage(item.mediaType) ? (
            <img
              src={item.mediaUrl as string}
              alt={item.content ? item.content.slice(0, 80) : `Post by ${item.displayName}`}
              loading="lazy"
              className="w-full object-cover grayscale contrast-110"
            />
          ) : (
            <video src={item.mediaUrl as string} muted playsInline className="w-full object-cover grayscale" />
          )}
          <div className="space-y-2 p-3">
            {item.content && (
              <p className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">{item.content}</p>
            )}
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-foreground">{item.displayName}</p>
                {item.username && <p className="truncate text-[11px] text-muted-foreground">{item.username}</p>}
              </div>
              <Avatar className="h-7 w-7 shrink-0 grayscale">
                <AvatarImage src={item.avatarUrl ?? ''} alt={`${item.displayName} avatar`} />
                <AvatarFallback className="text-[10px]">{item.displayName.slice(0, 1).toUpperCase()}</AvatarFallback>
              </Avatar>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
};

export default MosaicFeed;
