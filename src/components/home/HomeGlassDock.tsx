import React from 'react';
import {
  Home,
  Compass,
  Bell,
  Camera,
  MessageCircle,
  Bookmark,
  Settings,
  Sparkles,
  User,
  Heart,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface GlassDockItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  onSelect: () => void;
  /** Numeric unread/pending count rendered centred on top of the icon. */
  badge?: number;
  /** Marks the icon as the currently-open surface (rendered brighter). */
  active?: boolean;
}


interface HomeGlassDockProps {
  /** Future menu entries. When empty, placeholder slots are shown. */
  items?: GlassDockItem[];
  className?: string;
}

const PLACEHOLDER_ICONS = [Compass, Bell, Camera, MessageCircle, Sparkles, Bookmark, Settings, User, Heart, Search];

/**
 * Bottom-right home dock. Tap, press Enter/Space, or swipe the bare home icon
 * right→left to slide out a single horizontal rectangular glass tube holding
 * the menu icons. Purely additive — no other UI is touched.
 */
export default function HomeGlassDock({ items = [], className }: HomeGlassDockProps) {
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const swipeStart = React.useRef<{ x: number; y: number } | null>(null);
  const longPressTimer = React.useRef<number | null>(null);
  const longPressPreview = React.useRef(false);
  const suppressClick = React.useRef(false);


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

  React.useEffect(() => () => {
    if (longPressTimer.current) window.clearTimeout(longPressTimer.current);
  }, []);

  const clearLongPress = () => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handlePointerDown = (event: React.PointerEvent) => {
    swipeStart.current = { x: event.clientX, y: event.clientY };
    clearLongPress();
    longPressPreview.current = false;
    longPressTimer.current = window.setTimeout(() => {
      longPressPreview.current = true;
      setOpen(true);
    }, 350);
  };

  const endLongPress = () => {
    clearLongPress();
    if (longPressPreview.current) {
      longPressPreview.current = false;
      setOpen(false);
      return true;
    }
    return false;
  };

  const handlePointerUp = (event: React.PointerEvent) => {
    const start = swipeStart.current;
    swipeStart.current = null;
    const wasPreview = endLongPress();
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) > 24 && Math.abs(dx) > Math.abs(dy)) {
      suppressClick.current = true;
      setOpen(dx < 0); // swipe left opens, swipe right closes
      return;
    }
    if (wasPreview) suppressClick.current = true;
  };



  const slots: GlassDockItem[] =
    items.length > 0
      ? items
      : PLACEHOLDER_ICONS.map((Icon, index) => ({
          id: `placeholder-${index}`,
          label: `Menu slot ${index + 1}`,
          icon: <Icon className="h-[22px] w-[22px]" />,
          onSelect: () => {},
        }));

  return (
    <div
      ref={rootRef}
      className={cn(
        'fixed right-0 z-[9996] flex items-center justify-end',
        'bottom-[calc(env(safe-area-inset-bottom,0px)+12px)]',
        className,
      )}
    >
      {/* Rectangular horizontal glass tube — slides out right → left, auto-sized to viewport */}
      <div
        className={cn(
          'flex h-12 items-center overflow-hidden transition-all duration-300 ease-out',
          open
            ? 'mr-0 max-w-[calc(100vw-env(safe-area-inset-left,0px)-env(safe-area-inset-right,0px)-52px)] translate-x-0 opacity-100'
            : 'pointer-events-none mr-0 max-w-0 translate-x-4 opacity-0',
        )}
      >
        <div
          className={cn(
            'flex h-12 items-center gap-1 overflow-x-auto rounded-2xl rounded-r-none border border-white/25 border-r-0 px-2',
            'bg-white/10 backdrop-blur-xl shadow-[0_8px_24px_rgba(0,0,0,0.35)]',
            '[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden',
            'snap-x snap-mandatory scroll-px-2 scroll-smooth touch-pan-x [overscroll-behavior-x:contain]',
          )}
        >

          {slots.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-label={item.label}
              title={item.label}
              tabIndex={open ? 0 : -1}
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
              className={cn(
                'flex h-10 w-10 shrink-0 snap-start items-center justify-center rounded-xl',
                'border border-white/15 bg-white/5 text-white/90',
                'transition-transform active:scale-95 hover:bg-white/15',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60',
              )}
            >
              {item.icon}
            </button>
          ))}
        </div>
      </div>

      {/* Bare home trigger — flush at the right edge, no ring, no box */}
      <button
        type="button"
        aria-label={open ? 'Close home menu' : 'Open home menu'}
        aria-expanded={open}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => {
          swipeStart.current = null;
          endLongPress();
        }}
        onContextMenu={(event) => event.preventDefault()}
        onClick={() => {
          if (suppressClick.current) {
            suppressClick.current = false;
            return;
          }
          setOpen((value) => !value);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setOpen((value) => !value);
          }
        }}
        className={cn(
          'relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-transparent',
          'pr-1 text-white/90 drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)] transition-transform',
          'select-none touch-none active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60',
          // Enlarged invisible hit + focus area without changing the visual size
          'after:absolute after:-inset-2.5 after:content-[""] after:rounded-full',
        )}
      >

        <Home className="h-[22px] w-[22px]" />
      </button>
    </div>
  );
}
