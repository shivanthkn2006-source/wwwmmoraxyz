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
      {/* One rectangular glass box: scrollable icon strip + home button at its end */}
      <div
        className={cn(
          'flex h-12 items-stretch overflow-hidden rounded-2xl border border-white/25',
          'bg-white/10 backdrop-blur-xl shadow-[0_8px_24px_rgba(0,0,0,0.35)]',
          'transition-all duration-300 ease-out',
        )}
      >
        <div
          className={cn(
            'flex items-center overflow-hidden transition-all duration-300 ease-out',
            open ? 'max-w-[70vw] opacity-100' : 'pointer-events-none max-w-0 opacity-0',
          )}
        >
          <div
            className={cn(
              'flex h-12 items-center gap-1 overflow-x-auto px-2',
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
                    'flex h-10 w-10 shrink-0 snap-start items-center justify-center rounded-xl',
                    'text-white/90 transition-transform active:scale-95 hover:bg-white/15',
                  )}
                >
                  {item.icon}
                </button>
              ))
            )}
          </div>
          <div className="my-2 w-px shrink-0 bg-white/20" />
        </div>

        <button
          type="button"
          aria-label={open ? 'Close home menu' : 'Open home menu'}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className={cn(
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl',
            'text-white/90 transition-transform active:scale-95 hover:bg-white/10',
          )}
        >
          <Home className="h-[22px] w-[22px]" />
        </button>
      </div>
    </div>
  );
}


