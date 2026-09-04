import React from 'react';
import { X, Bookmark, BookmarkCheck, ExternalLink, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { KIND_LABEL, portalForItem, tagsForItem, type FeedSearchItem } from '@/lib/feedSearchItems';

interface Props {
  item: FeedSearchItem;
  onDismiss?: () => void;
  onToggleSave?: () => void;
  saved?: boolean;
}

/**
 * Renders a non-video search result (web, image, news, weather, shopping,
 * music or in-platform hit) as a full-viewport shorts-style feed slide, using
 * the same frame as PostCard so the feed layout never changes.
 */
export default function FeedSearchCard({ item, onDismiss, onToggleSave, saved = false }: Props) {
  const navigate = useNavigate();
  const media = item.image || item.thumbnail;
  const tags = tagsForItem(item);
  const portal = portalForItem(item);

  return (
    <div
      className="relative flex h-full w-full flex-col overflow-hidden bg-black"
      data-testid="feed-search-card"
      data-search-kind={item.kind}
    >
      <div className="flex h-full w-full items-center justify-center overflow-hidden">
        {media ? (
          <img
            src={media}
            alt={item.title}
            loading="lazy"
            className="h-full w-full object-contain"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 via-background to-background px-8">
            <p className="text-center text-lg font-semibold leading-snug text-foreground/90">{item.title}</p>
          </div>
        )}
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent px-4 pb-24 pt-12">
        <span className="pointer-events-auto inline-flex rounded-full bg-white/15 px-2 py-0.5 text-[10px] uppercase tracking-wide text-white/90 backdrop-blur">
          {KIND_LABEL[item.kind]}
        </span>
        <p className="mt-2 line-clamp-3 text-sm font-semibold text-white">{item.title}</p>
        {item.subtitle && <p className="mt-1 line-clamp-3 text-xs text-white/75">{item.subtitle}</p>}

        {tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1" data-testid="feed-search-tags">
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-white/10 px-2 py-[2px] text-[10px] text-white/80 backdrop-blur"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="pointer-events-auto mt-3 flex items-center gap-2">
          {item.route && (
            <button
              type="button"
              onClick={() => navigate(item.route!)}
              className="inline-flex items-center gap-1 rounded-full bg-white/90 px-3 py-1.5 text-[11px] font-semibold text-black"
            >
              Open in M’Mora <ArrowRight className="h-3 w-3" />
            </button>
          )}
          {item.url && (
            <button
              type="button"
              onClick={() =>
                navigate(
                  `/source?${new URLSearchParams({
                    url: item.url!,
                    title: item.title ?? '',
                    excerpt: item.summary ?? '',
                    source: portal ?? 'Live web source',
                  }).toString()}`,
                )
              }
              className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1.5 text-[11px] text-white backdrop-blur"
            >
              {portal ? `Source · ${portal}` : 'Open source'} <ExternalLink className="h-3 w-3" />
            </button>
          )}
        </div>
        {item.publishedAt && (
          <p className="mt-2 text-[10px] uppercase tracking-wide text-white/50">{item.publishedAt}</p>
        )}
      </div>

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Remove this search result from the feed"
          className="absolute left-3 top-24 z-10 rounded-full bg-black/60 p-1.5 text-white backdrop-blur hover:bg-black/80"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      {onToggleSave && (
        <button
          type="button"
          onClick={onToggleSave}
          aria-label={saved ? 'Remove this result from saved' : 'Save this result'}
          aria-pressed={saved}
          className="absolute right-3 top-24 z-10 rounded-full bg-black/60 p-1.5 text-white backdrop-blur hover:bg-black/80"
        >
          {saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
        </button>
      )}
    </div>
  );
}
