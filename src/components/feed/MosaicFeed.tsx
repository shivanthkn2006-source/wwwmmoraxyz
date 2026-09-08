/**
 * MosaicFeed — a scrapbook / masonry card feed.
 *
 * Additive surface: it never mutates the existing snap feeds. It reads the same
 * public posts, orders them with the intimacy graph (closeness first, recency
 * next) and renders them as monochrome cards: image, caption, author.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useIntimacyFeed } from '@/hooks/useIntimacyFeed';
import { recordFeedEvent } from '@/features/intimacy/feedEvents';
import ZoeFeedCards from '@/components/feed/ZoeFeedCards';
import { listLegacyMemories, isUnlocked } from '@/features/legacy/legacyVault';
import { cn } from '@/lib/utils';
import { useAgeCohort } from '@/hooks/useAgeCohort';
import { cohortStyle } from '@/features/intimacy/cohortStyle';
import { buildAstroBoost } from '@/features/astro/astroAffinity';

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
  /** Vault entries are private to their owner; posts are public. */
  kind?: 'post' | 'vault';
}

interface MosaicFeedProps {
  limit?: number;
  className?: string;
  /** Scope: every public post, or only posts from people you follow. */
  scope?: 'all' | 'friends';
}

const isImage = (t: string | null) => !t || t.startsWith('image');

export const MosaicFeed: React.FC<MosaicFeedProps> = ({ limit = 40, className, scope = 'all' }) => {
  const [openItem, setOpenItem] = useState<MosaicItem | null>(null);
  const [items, setItems] = useState<MosaicItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { cohort } = useAgeCohort();
  const style = cohortStyle(cohort);
  const [astro, setAstro] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    let alive = true;
    void (async () => {
      setLoading(true);
      try {
        let followedIds: string[] | null = null;
        if (scope === 'friends') {
          const { data: auth } = await supabase.auth.getUser();
          const uid = auth?.user?.id;
          if (!uid) {
            if (alive) { setItems([]); setLoading(false); }
            return;
          }
          const { data: follows } = await supabase
            .from('user_follows')
            .select('following_id')
            .eq('follower_id', uid);
          followedIds = Array.from(new Set([...(follows ?? []).map((f: any) => f.following_id), uid]));
          if (followedIds.length === 0) {
            if (alive) { setItems([]); setLoading(false); }
            return;
          }
        }

        let query = supabase
          .from('posts')
          .select('id, user_id, content, media_url, media_type, likes_count, comments_count, created_at')
          .not('media_url', 'is', null)
          .order('created_at', { ascending: false })
          .limit(limit);
        if (followedIds) query = query.in('user_id', followedIds);
        const { data, error } = await query;
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
        // Your own Digital Vault entries, visible only to you (owner-only RLS).
        let vaultItems: MosaicItem[] = [];
        if (scope === 'all') {
          const memories = await listLegacyMemories();
          vaultItems = memories
            .filter((m) => isUnlocked(m))
            .slice(0, 12)
            .map((m) => ({
              id: `vault-${m.id}`,
              authorId: null,
              createdAt: m.createdAt,
              content: m.body ? `${m.title} — ${m.body}` : m.title,
              mediaUrl: m.mediaUrl,
              mediaType: m.mediaType,
              velocity: 0,
              displayName: 'From your vault',
              username: '',
              avatarUrl: null,
              kind: 'vault' as const,
            }));
        }

        if (alive) setItems([...mapped, ...vaultItems]);
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

  // Astrology affinity from real birth dates — empty map when yours is unset.
  useEffect(() => {
    let alive = true;
    const authorIds = items.map((i) => i.authorId).filter(Boolean) as string[];
    if (authorIds.length === 0) return;
    void buildAstroBoost(authorIds).then((m) => { if (alive) setAstro(m); });
    return () => { alive = false; };
  }, [items]);

  // Recompute closeness from the member's own real interactions on open, so
  // likes, comments, saves, messages and dwell actually move the ordering.
  const { ordered } = useIntimacyFeed(items, { recomputeOnMount: true, astro });

  const visible = useMemo(() => ordered.filter((i) => i.mediaUrl || i.kind === 'vault'), [ordered]);

  if (loading) {
    return (
      <div>
        <ZoeFeedCards />
        <div className={cn('grid grid-cols-2 gap-3 p-3', className)}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-xl border border-border bg-muted/40" />
          ))}
        </div>
      </div>
    );
  }

  if (visible.length === 0) {
    return (
      <div>
        <ZoeFeedCards />
        <p className="px-6 py-10 text-center text-sm text-muted-foreground">
          Nothing here yet — posts with photos will appear in this mosaic.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-end px-3 pt-3">
        <Link to="/astrology" className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground underline-offset-4 hover:underline">
          Astrology
        </Link>
      </div>
      <ZoeFeedCards />
    <div className={cn(style.columnsClass, style.gapClass, 'p-3 [column-fill:_balance]', className)} data-testid="mosaic-feed">
      {visible.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => {
            void recordFeedEvent({ type: 'view', postId: item.id, targetUserId: item.authorId, surface: 'mosaic' });
            setOpenItem(item);
          }}
          className="mb-3 block w-full break-inside-avoid overflow-hidden rounded-xl border border-border bg-card text-left transition-transform duration-200 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          data-mosaic-card
          data-author-id={item.authorId ?? ''}
        >
          {!item.mediaUrl ? null : isImage(item.mediaType) ? (
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
      <Dialog open={!!openItem} onOpenChange={(o) => !o && setOpenItem(null)}>
        <DialogContent className="max-w-lg overflow-hidden p-0">
          <DialogHeader className="px-4 pt-4">
            <DialogTitle className="text-sm font-semibold">{openItem?.displayName}</DialogTitle>
          </DialogHeader>
          {openItem?.mediaUrl && (
            isImage(openItem.mediaType) ? (
              <img src={openItem.mediaUrl} alt={openItem.content ?? 'Post media'} className="max-h-[60vh] w-full object-contain grayscale" />
            ) : (
              <video src={openItem.mediaUrl} controls playsInline className="max-h-[60vh] w-full object-contain grayscale" />
            )
          )}
          {openItem?.content && <p className="px-4 pb-4 text-sm text-foreground">{openItem.content}</p>}
        </DialogContent>
      </Dialog>
    </div>
    </div>
  );
};

export default MosaicFeed;
