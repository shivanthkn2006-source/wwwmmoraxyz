import React from 'react';
import { Home } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface GlassDockItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  onSelect: () => void;
}

interface HomeGlassDockProps {
  /** Future menu entries. Empty for now — the shell is ready to receive them. */
  items?: GlassDockItem[];
  className?: string;
}

/**
 * Bottom-right home dock. Tap the home icon to extend a single horizontal,
 * swipeable glass-morphism rail leftwards (Samsung edge-panel behaviour,
 * rotated to one horizontal line). Purely additive — no other UI is touched.
 */
export default function HomeGlassDock({ items = [], className }: HomeGlassDockProps) {
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);

  // Tap outside / Escape closes the rail.
  React.useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('pointerdown', onPointer);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onPointer);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      className={cn(
        'fixed right-2 z-[9996] flex items-center justify-end',
        'bottom-[calc(env(safe-area-inset-bottom,0px)+12px)]',
        className,
      )}
    >
      {/* Horizontal glass tube: extends right → left, same height as the home icon */}
      <div
        className={cn(
          'flex h-11 items-center overflow-hidden transition-all duration-300 ease-out',
          open ? 'mr-1 max-w-[72vw] opacity-100' : 'pointer-events-none mr-0 max-w-0 opacity-0',
        )}
      >
        <div
          className={cn(
            'flex h-11 items-center gap-2 overflow-x-auto rounded-full border border-white/25 px-2',
            'bg-white/10 backdrop-blur-xl',
            '[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden',
            'snap-x touch-pan-x',
          )}
        >
          {items.length === 0 ? (
            <span className="whitespace-nowrap px-3 text-[11px] text-white/60">Menus coming soon</span>
          ) : (
            items.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-label={item.label}
                title={item.label}
                onClick={() => {
                  setOpen(false);
                  item.onSelect();
                }}
                className={cn(
                  'flex h-9 w-9 shrink-0 snap-start items-center justify-center rounded-full',
                  'text-white/90 transition-transform active:scale-95 hover:bg-white/15',
                )}
              >
                {item.icon}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Bare home trigger — no outer ring */}
      <button
        type="button"
        aria-label={open ? 'Close home menu' : 'Open home menu'}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          'flex h-11 w-11 shrink-0 items-center justify-center rounded-full',
          'text-white/90 drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)] transition-transform',
          'active:scale-95',
        )}
      >
        <Home className="h-[22px] w-[22px]" />
      </button>
    </div>
  );
}

