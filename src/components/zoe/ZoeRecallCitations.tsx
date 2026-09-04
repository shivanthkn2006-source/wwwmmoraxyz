import { useNavigate } from 'react-router-dom';
import { BookOpen, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

/**
 * Provenance payload returned by every Zoe backend (`omniRecallSources`).
 * Each entry is one row from the universal index that grounded the answer.
 */
export interface ZoeRecallSource {
  citationId: number;
  entityType: string;
  entityId: string;
  title: string | null;
  route: string | null;
  createdAt: string | null;
  stale: boolean;
  score: number;
  excerpt: string;
}

export function parseRecallSources(raw: unknown): ZoeRecallSource[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    .map((item, index) => ({
      citationId: Number(item.citationId ?? index + 1),
      entityType: String(item.entityType ?? 'unknown'),
      entityId: String(item.entityId ?? ''),
      title: typeof item.title === 'string' ? item.title : null,
      route: typeof item.route === 'string' ? item.route : null,
      createdAt: typeof item.createdAt === 'string' ? item.createdAt : null,
      stale: Boolean(item.stale),
      score: Number(item.score ?? 0),
      excerpt: String(item.excerpt ?? ''),
    }));
}

/** Renders numbered citation buttons under a Zoe reply. */
export const ZoeRecallCitations = ({ sources }: { sources: ZoeRecallSource[] }) => {
  const navigate = useNavigate();
  if (!sources.length) return null;

  const openSource = (source: ZoeRecallSource) => {
    // Web-grounded citations point at real external pages — open them in a new tab.
    if (source.route && /^https?:\/\//i.test(source.route)) {
      window.open(source.route, '_blank', 'noopener,noreferrer');
      return;
    }
    const target =
      source.route ||
      `/admin/search-index?type=${encodeURIComponent(source.entityType)}&id=${encodeURIComponent(source.entityId)}`;
    navigate(target);
  };

  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      <BookOpen className="h-3 w-3 opacity-60" aria-hidden />
      {sources.map((source) => (
        <Popover key={`${source.entityType}-${source.entityId}-${source.citationId}`}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-6 rounded-full px-2 text-[11px]"
              aria-label={`Source ${source.citationId}: ${source.title ?? source.entityType}`}
            >
              [{source.citationId}]
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 text-xs" align="start">
            <p className="font-medium">{source.title ?? source.entityType}</p>
            <p className="mt-1 opacity-70">
              {source.entityType === 'web' ? 'Live web source' : source.entityType}
              {source.createdAt ? ` · ${source.createdAt.slice(0, 10)}` : ''}
              {source.stale ? ' · historical' : ''}
            </p>
            <p className="mt-2 max-h-24 overflow-y-auto whitespace-pre-wrap opacity-90">
              {source.excerpt}
            </p>
            <Button
              variant="secondary"
              size="sm"
              className="mt-3 h-7 w-full text-xs"
              onClick={() => openSource(source)}
            >
              <ExternalLink className="mr-1 h-3 w-3" /> Open source
            </Button>
          </PopoverContent>
        </Popover>
      ))}
    </div>
  );
};

export default ZoeRecallCitations;
