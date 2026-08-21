import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useNavigate } from 'react-router-dom';

export type CollectionMode = 'saved' | 'liked';

interface CollectionItem {
  id: string;
  caption: string | null;
  media_url: string | null;
  media_type: string | null;
  created_at: string;
}

interface HomeCollectionSheetProps {
  mode: CollectionMode | null;
  onOpenChange: (open: boolean) => void;
}

/**
 * Read-only list of the signed-in user's saved posts or liked posts.
 * Opened from the home glass dock (bookmark / heart icons).
 */
export default function HomeCollectionSheet({ mode, onOpenChange }: HomeCollectionSheetProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = React.useState<CollectionItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!mode || !user?.id) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const table = mode === 'saved' ? 'saved_posts' : 'post_likes';
        const { data: links, error: linkError } = await supabase
          .from(table)
          .select('post_id, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50);
        if (linkError) throw linkError;

        const ids = (links ?? []).map((row: any) => row.post_id).filter(Boolean);
        if (ids.length === 0) {
          if (!cancelled) setItems([]);
          return;
        }

        const { data: posts, error: postError } = await supabase
          .from('posts')
          .select('id, caption, media_url, media_type, created_at')
          .in('id', ids);
        if (postError) throw postError;

        const order = new Map(ids.map((id: string, index: number) => [id, index]));
        const sorted = (posts ?? []).slice().sort(
          (a: any, b: any) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0),
        );
        if (!cancelled) setItems(sorted as CollectionItem[]);
      } catch (err: any) {
        console.error('[HomeCollectionSheet] load failed', err);
        if (!cancelled) setError(err?.message ?? 'Could not load this collection.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [mode, user?.id]);

  return (
    <Sheet open={Boolean(mode)} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto border-l border-border/50 bg-background/85 backdrop-blur-xl sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{mode === 'saved' ? 'Saved posts' : 'Liked posts'}</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-2">
          {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!loading && error && <p className="text-sm text-destructive">{error}</p>}
          {!loading && !error && items.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {mode === 'saved' ? 'You have not saved any posts yet.' : 'You have not liked any posts yet.'}
            </p>
          )}
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onOpenChange(false);
                navigate(`/home?post=${item.id}`);
              }}
              className="flex w-full items-center gap-3 rounded-xl border border-border/50 p-2 text-left hover:bg-muted/60"
            >
              {item.media_url && item.media_type !== 'video' ? (
                <img src={item.media_url} alt="" loading="lazy" className="h-12 w-12 shrink-0 rounded-md object-cover" />
              ) : (
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-muted text-[10px] uppercase text-muted-foreground">
                  {item.media_type ?? 'post'}
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-foreground">{item.caption || 'Untitled post'}</span>
                <span className="block text-[11px] text-muted-foreground">
                  {new Date(item.created_at).toLocaleDateString()}
                </span>
              </span>
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
