import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Play } from 'lucide-react';

interface RailPost {
  id: string;
  media_url: string | null;
  media_preview_url: string | null;
  media_type: string | null;
  content: string | null;
  likes_count: number | null;
  comments_count: number | null;
  created_at: string;
}

interface RailSlot {
  key: string;
  label: string;
  post: RailPost;
}

interface AuthorPreviewRailProps {
  authorId: string;
  currentPostId: string;
  onSelect?: (postId: string) => void;
}

/**
 * Transparent rail on the left of a post showing three labelled previews from
 * the same author: most viewed, top rated (liked) and most recent.
 */
const AuthorPreviewRail: React.FC<AuthorPreviewRailProps> = ({ authorId, currentPostId, onSelect }) => {
  const [slots, setSlots] = useState<RailSlot[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('feed_posts_safe')
        .select('id, media_url, media_preview_url, media_type, content, likes_count, comments_count, created_at')
        .eq('user_id', authorId)
        .neq('id', currentPostId)
        .order('created_at', { ascending: false })
        .limit(30);

      if (cancelled) return;
      const posts = (data as RailPost[]) || [];
      if (posts.length === 0) {
        setSlots([]);
        return;
      }

      const engagement = (p: RailPost) => (p.likes_count ?? 0) + (p.comments_count ?? 0);
      const byViews = [...posts].sort((a, b) => engagement(b) - engagement(a));
      const byLikes = [...posts].sort((a, b) => (b.likes_count ?? 0) - (a.likes_count ?? 0));
      const byRecent = [...posts];

      const picked: RailSlot[] = [];
      const used = new Set<string>();
      const push = (key: string, label: string, list: RailPost[]) => {
        const post = list.find((p) => !used.has(p.id));
        if (!post) return;
        used.add(post.id);
        picked.push({ key, label, post });
      };
      push('viewed', 'Viewed', byViews);
      push('top', 'Top', byLikes);
      push('recent', 'New', byRecent);

      setSlots(picked);

      // Some rows come back with media stripped (oversized inline blobs are nulled in
      // the safe feed view). Fetch the real media for those few posts so every
      // preview tile shows a thumbnail instead of a bare "Post" label.
      const missing = picked.filter((s) => !s.post.media_preview_url && !s.post.media_url).map((s) => s.post.id);
      if (missing.length > 0) {
        const { data: full } = await supabase
          .from('posts')
          .select('id, media_url, media_preview_url, media_type')
          .in('id', missing);
        if (cancelled || !full) return;
        const byId = new Map(full.map((p: any) => [p.id, p]));
        setSlots((current) =>
          current.map((slot) => {
            const extra = byId.get(slot.post.id);
            if (!extra) return slot;
            return {
              ...slot,
              post: {
                ...slot.post,
                media_url: extra.media_url ?? slot.post.media_url,
                media_preview_url: extra.media_preview_url ?? slot.post.media_preview_url,
                media_type: extra.media_type ?? slot.post.media_type,
              },
            };
          }),
        );
      }

    })();
    return () => {
      cancelled = true;
    };
  }, [authorId, currentPostId]);

  if (slots.length === 0) return null;

  return (
    <div
      className="pointer-events-auto absolute bottom-24 left-2 z-20 flex w-16 flex-col gap-2"
      aria-label="More from this creator"
      data-testid="author-preview-rail"
    >
      {slots.map(({ key, label, post }) => {
        const poster = post.media_preview_url || (post.media_type === 'image' ? post.media_url : null);
        const isVideo = post.media_type === 'video' || (!!post.media_url && !poster);
        return (
          <button
            key={key}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelect?.(post.id);
            }}
            className="relative h-24 w-16 overflow-hidden rounded-lg border border-white/25 bg-white/5 backdrop-blur-[2px] transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            title={`${label}: ${post.content || 'View post'}`}
          >
            {poster ? (
              <img
                src={poster}
                alt={post.content?.slice(0, 40) || `${label} post preview`}
                loading="lazy"
                className="h-full w-full object-cover opacity-90"
              />
            ) : isVideo && post.media_url ? (
              <video
                src={`${post.media_url}#t=0.1`}
                muted
                playsInline
                preload="metadata"
                className="h-full w-full object-cover opacity-90"
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center p-1 text-[9px] leading-tight text-white/90 drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
                {post.content?.slice(0, 40) || 'Post'}
              </span>
            )}
            <span className="absolute left-0 top-0 rounded-br-md bg-black/45 px-1 py-0.5 text-[8px] font-semibold uppercase tracking-wide text-white">
              {label}
            </span>
            {post.media_type === 'video' && (
              <Play className="absolute bottom-1 left-1 h-3 w-3 fill-white text-white drop-shadow" />
            )}
            <span className="absolute bottom-0 right-1 text-[9px] font-semibold text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
              {post.likes_count ?? 0}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default AuthorPreviewRail;
