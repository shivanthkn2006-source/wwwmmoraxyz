import React from 'react';
import { Camera, GripHorizontal, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import DraggableHomeControl from '@/components/home/DraggableHomeControl';

interface HomeFloatingToolsProps {
  query: string;
  onQueryChange: (query: string) => void;
  onOpenEditor: () => void;
}

export default function HomeFloatingTools({ query, onQueryChange, onOpenEditor }: HomeFloatingToolsProps) {
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [searchPosition, setSearchPosition] = React.useState<{ x: number; y: number }>(() => {
    const fallback = { x: 12, y: Math.max(72, window.innerHeight - 76) };
    try {
      const stored = localStorage.getItem('mmora.home.search-panel-position.v1');
      return stored ? JSON.parse(stored) : fallback;
    } catch { return fallback; }
  });
  const dragRef = React.useRef<{ id: number; x: number; y: number; originX: number; originY: number } | null>(null);

  const clampSearch = React.useCallback((x: number, y: number) => ({
    x: Math.max(8, Math.min(x, window.innerWidth - Math.min(512, window.innerWidth - 24) - 8)),
    y: Math.max(8, Math.min(y, window.innerHeight - 58)),
  }), []);

  return (
    <>
      <DraggableHomeControl
        storageKey="mmora.home.search-position.v3"
        defaultPosition={{ x: 8, y: 80 }}
        ariaLabel={searchOpen ? 'Close home search' : 'Search home'}
        onActivate={() => setSearchOpen((current) => !current)}
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


      {searchOpen && (
        <div
          className="fixed z-[9996] flex w-[calc(100vw-1.5rem)] max-w-lg items-center rounded-full border border-border/60 bg-background/80 p-1.5 shadow-xl backdrop-blur-2xl"
          style={{ left: searchPosition.x, top: searchPosition.y }}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            aria-label="Drag search bar"
            className="flex h-9 w-8 touch-none items-center justify-center text-muted-foreground"
            onPointerDown={(event) => {
              event.preventDefault(); event.stopPropagation();
              event.currentTarget.setPointerCapture(event.pointerId);
              dragRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY, originX: searchPosition.x, originY: searchPosition.y };
              (window as Window & { __mmoraHomeControlDragging?: boolean }).__mmoraHomeControlDragging = true;
            }}
            onPointerMove={(event) => {
              const drag = dragRef.current;
              if (!drag || drag.id !== event.pointerId) return;
              setSearchPosition(clampSearch(drag.originX + event.clientX - drag.x, drag.originY + event.clientY - drag.y));
            }}
            onPointerUp={(event) => {
              event.preventDefault(); event.stopPropagation();
              const drag = dragRef.current;
              if (!drag || drag.id !== event.pointerId) return;
              const next = clampSearch(drag.originX + event.clientX - drag.x, drag.originY + event.clientY - drag.y);
              dragRef.current = null;
              setSearchPosition(next);
              try { localStorage.setItem('mmora.home.search-panel-position.v1', JSON.stringify(next)); } catch { /* unavailable */ }
              window.setTimeout(() => { (window as Window & { __mmoraHomeControlDragging?: boolean }).__mmoraHomeControlDragging = false; }, 0);
            }}
            onPointerCancel={() => {
              dragRef.current = null;
              (window as Window & { __mmoraHomeControlDragging?: boolean }).__mmoraHomeControlDragging = false;
            }}
          >
            <GripHorizontal className="h-4 w-4" />
          </button>
          <div className="flex min-w-0 flex-1 items-center gap-2 px-2">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Search posts, shorts, playlists, tags or creators"
              className="h-9 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            {query && (
              <button type="button" className="rounded-full p-1 text-muted-foreground hover:text-foreground" aria-label="Clear search" onClick={() => onQueryChange('')}>
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}