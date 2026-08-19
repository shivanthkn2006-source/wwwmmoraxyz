import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Camera, Play } from 'lucide-react';

interface RailPost {
  id: string;
  media_url: string | null;
  media_preview_url: string | null;
  media_type: string | null;
  content: string | null;
  likes_count: number | null;
  created_at: string;
}

interface AuthorPreviewRailProps {
  authorId: string;
  currentPostId: string;
  onSelect?: (postId: string) => void;
}

/**
 * Transparent 64px-wide rail on the left of a post showing the same author's
 * most-viewed (top rated) posts, with the newest ones after them.
 */
const AuthorPreviewRail: React.FC<AuthorPreviewRailProps> = ({ authorId, currentPostId, onSelect }) => {
  const [posts, setPosts] = useState<RailPost[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('feed_posts_safe')
        .select('id, media_url, media_preview_url, media_type, content, likes_count, created_at')
        .eq('user_id', authorId)
        .neq('id', currentPostId)
        .order('likes_count', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(3);
      if (!cancelled) setPosts((data as RailPost[]) || []);
    })();
    return () => {
      cancelled = true;
    };
  }, [authorId, currentPostId]);

  if (posts.length === 0) return null;

  return (
    <div
      className="pointer-events-auto absolute bottom-24 left-2 z-20 flex w-16 flex-col gap-2"
      aria-label="More from this creator"
    >
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          window.dispatchEvent(new Event('mmora:request-shorts-upload'));
        }}
        className="flex h-10 w-10 items-center justify-center self-center rounded-full border border-white/30 bg-black/30 text-white backdrop-blur-md transition-colors hover:bg-black/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        aria-label="Upload a short"
        title="Upload a short"
      >
        <Camera className="h-4 w-4" />
      </button>
      <span className="text-center text-[10px] font-medium uppercase tracking-wide text-white/80 drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]">Top</span>
      {posts.map((p) => {
        const poster = p.media_preview_url || (p.media_type === 'image' ? p.media_url : null);
        return (
          <button
            key={p.id}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelect?.(p.id);
            }}
            className="relative h-24 w-16 overflow-hidden rounded-lg border border-white/25 bg-white/5 backdrop-blur-[2px] transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            title={p.content || 'View post'}
          >
            {poster ? (
              <img src={poster} alt={p.content?.slice(0, 40) || 'Post preview'} loading="lazy" className="h-full w-full object-cover opacity-90" />
            ) : (
              <span className="flex h-full w-full items-center justify-center p-1 text-[9px] leading-tight text-white/90 drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
                {p.content?.slice(0, 40) || 'Post'}
              </span>
            )}
            {p.media_type === 'video' && (
              <Play className="absolute bottom-1 left-1 h-3 w-3 fill-white text-white drop-shadow" />
            )}
            <span className="absolute bottom-0 right-1 text-[9px] font-semibold text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
              {p.likes_count ?? 0}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default AuthorPreviewRail;
