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
      className={cn('fixed bottom-20 right-3 z-[9996] flex items-center justify-end gap-2', className)}
    >
      {/* Extending rail: right → left, one horizontal swipeable line */}
      <div
        className={cn(
          'flex items-center overflow-hidden transition-all duration-300 ease-out',
          open ? 'max-w-[70vw] opacity-100' : 'pointer-events-none max-w-0 opacity-0',
        )}
      >
        <div
          className={cn(
            'flex items-center gap-3 overflow-x-auto rounded-full border border-white/25 px-3 py-2',
            'bg-white/10 backdrop-blur-xl shadow-[0_8px_28px_rgba(0,0,0,0.35)]',
            '[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden',
            'snap-x snap-mandatory touch-pan-x',
          )}
        >
          {items.length === 0 ? (
            <span className="whitespace-nowrap px-2 text-[11px] text-white/70">Menus coming soon</span>
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
                  'border border-white/20 bg-white/10 text-white/90 transition-transform',
                  'active:scale-95 hover:bg-white/20',
                )}
              >
                {item.icon}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Home trigger */}
      <button
        type="button"
        aria-label={open ? 'Close home menu' : 'Open home menu'}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
          'border border-white/25 bg-white/10 backdrop-blur-xl',
          'text-white shadow-[0_6px_20px_rgba(0,0,0,0.35)] transition-transform',
          'active:scale-95 hover:bg-white/20',
        )}
      >
        <Home className="h-[18px] w-[18px]" />
      </button>
    </div>
  );
}
