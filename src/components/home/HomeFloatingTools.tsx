import React from 'react';
import { Camera, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import { useHomeSearch, recordHomeSearch, type HomeSearchResult } from '@/hooks/useHomeSearch';
import DraggableHomeControl from '@/components/home/DraggableHomeControl';

interface HomeFloatingToolsProps {
  query: string;
  onQueryChange: (query: string) => void;
  onOpenEditor: () => void;
}

const ICON_SIZE = 36;
const GAP = 6;
const EDGE_GAP = 8;

export default function HomeFloatingTools({ query, onQueryChange, onOpenEditor }: HomeFloatingToolsProps) {
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [iconPosition, setIconPosition] = React.useState<{ x: number; y: number }>({ x: 8, y: 80 });
  const navigate = useNavigate();
  const { results, loading, error } = useHomeSearch(query, searchOpen);

  const handleSelect = React.useCallback((result: HomeSearchResult) => {
    void recordHomeSearch(query, result);
    if (result.route) {
      setSearchOpen(false);
      navigate(result.route);
    } else {
      // Post results keep the feed filtered in place.
      setSearchOpen(false);
    }
  }, [navigate, query]);

  const handleSubmit = React.useCallback((event: React.FormEvent) => {
    event.preventDefault();
    if (!query.trim()) return;
    void recordHomeSearch(query.trim());
  }, [query]);

  const handleIconPosition = React.useCallback((position: { x: number; y: number }) => {
    setIconPosition(position);
  }, []);

  // Bar grows sideways (left -> right) from the search icon's current spot.
  const availableWidth = Math.max(
    120,
    window.innerWidth - (iconPosition.x + ICON_SIZE + GAP) - EDGE_GAP,
  );
  const barWidth = Math.min(availableWidth, 420);

  return (
    <>
      <DraggableHomeControl
        storageKey="mmora.home.search-position.v3"
        defaultPosition={{ x: 8, y: 80 }}
        ariaLabel={searchOpen ? 'Close home search' : 'Search home'}
        onActivate={() => setSearchOpen((current) => !current)}
        onPositionChange={handleIconPosition}
      >
        {searchOpen ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
      </DraggableHomeControl>

      <DraggableHomeControl
        storageKey="mmora.home.camera-position.v3"
        defaultPosition={{ x: 8, y: 124 }}
        ariaLabel="Create a short"
        onActivate={onOpenEditor}
      >
        <Camera className="h-5 w-5" />
      </DraggableHomeControl>

      <div
        className="fixed z-[9996] flex items-center overflow-hidden rounded-full border border-border/60 bg-background/80 p-1.5 shadow-xl backdrop-blur-2xl transition-[width,opacity] duration-200 ease-out"
        style={{
          left: iconPosition.x + ICON_SIZE + GAP,
          top: iconPosition.y,
          width: searchOpen ? barWidth : 0,
          opacity: searchOpen ? 1 : 0,
          borderWidth: searchOpen ? undefined : 0,
          padding: searchOpen ? undefined : 0,
          pointerEvents: searchOpen ? 'auto' : 'none',
        }}
        aria-hidden={!searchOpen}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        <form onSubmit={handleSubmit} className="flex min-w-0 flex-1 items-center gap-2 px-2">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search posts, shorts, tags or creators"
            tabIndex={searchOpen ? 0 : -1}
            className="h-9 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          {query && (
            <button type="button" className="rounded-full p-1 text-muted-foreground hover:text-foreground" aria-label="Clear search" onClick={() => onQueryChange('')}>
              <X className="h-4 w-4" />
            </button>
          )}
        </form>
      </div>

      {searchOpen && query.trim().length >= 2 && (
        <div
          className="fixed z-[9996] max-h-[50vh] overflow-y-auto rounded-2xl border border-border/60 bg-background/90 p-1 shadow-xl backdrop-blur-2xl"
          style={{
            left: iconPosition.x + ICON_SIZE + GAP,
            top: iconPosition.y + 52,
            width: barWidth,
          }}
          onPointerDown={(event) => event.stopPropagation()}
        >
          {loading && <p className="px-3 py-2 text-xs text-muted-foreground">Searching…</p>}
          {!loading && error && <p className="px-3 py-2 text-xs text-muted-foreground">{error}</p>}
          {!loading && !error && results.length === 0 && (
            <p className="px-3 py-2 text-xs text-muted-foreground">No results for "{query.trim()}"</p>
          )}
          {results.map((result) => (
            <button
              key={`${result.type}-${result.id}`}
              type="button"
              onClick={() => handleSelect(result)}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left hover:bg-muted/60"
            >
              {result.avatarUrl && (
                <img src={result.avatarUrl} alt="" className="h-7 w-7 shrink-0 rounded-full object-cover" />
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-foreground">{result.title}</span>
                {result.subtitle && (
                  <span className="block truncate text-[11px] text-muted-foreground">{result.subtitle}</span>
                )}
              </span>
            </button>
          ))}
        </div>
      )}
    </>
  );
}
