import React from 'react';
import { Camera, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
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
        <div className="flex min-w-0 flex-1 items-center gap-2 px-2">
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
        </div>
      </div>
    </>
  );
}
