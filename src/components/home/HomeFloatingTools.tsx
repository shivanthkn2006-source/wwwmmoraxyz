import React from 'react';
import { Camera, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import DraggableHomeControl from '@/components/home/DraggableHomeControl';

interface HomeFloatingToolsProps {
  query: string;
  onQueryChange: (query: string) => void;
  onOpenEditor: () => void;
}

export default function HomeFloatingTools({ query, onQueryChange, onOpenEditor }: HomeFloatingToolsProps) {
  const [searchOpen, setSearchOpen] = React.useState(false);

  return (
    <>
      <DraggableHomeControl
        storageKey="mmora.home.camera-position.v2"
        defaultPosition={{ x: 16, y: Math.max(120, window.innerHeight - 176) }}
        ariaLabel="Create a short"
        onActivate={onOpenEditor}
      >
        <Camera className="h-5 w-5" />
      </DraggableHomeControl>

      <DraggableHomeControl
        storageKey="mmora.home.search-position.v2"
        defaultPosition={{ x: Math.max(16, window.innerWidth - 64), y: Math.max(72, window.innerHeight - 176) }}
        ariaLabel={searchOpen ? 'Close home search' : 'Search home'}
        onActivate={() => setSearchOpen((current) => !current)}
      >
        {searchOpen ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
      </DraggableHomeControl>

      {searchOpen && (
        <div
          className="fixed inset-x-3 bottom-[max(1rem,env(safe-area-inset-bottom))] z-[9996] mx-auto max-w-lg rounded-full border border-border/60 bg-background/65 p-1.5 shadow-xl backdrop-blur-2xl"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-center gap-2 px-2">
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