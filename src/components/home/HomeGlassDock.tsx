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
  Music,
  Video,
  Globe,
  Calendar,
  Map,
  Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { readDockUsage, recordDockUsage, orderByFrequency, type DockUsageMap } from '@/lib/homeDockUsage';
import { useDockBadgesEnabled } from '@/components/home/DockBadgeBoundary';



export interface GlassDockItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  onSelect: () => void;
  /** Numeric unread/pending count rendered centred on top of the icon. */
  badge?: number;
  /** Marks the icon as the currently-open surface (rendered brighter). */
  active?: boolean;
  /** Badge value comes from a cached snapshot (realtime/auth failure). */
  badgeStale?: boolean;
}


interface HomeGlassDockProps {
  /** Future menu entries. When empty, placeholder slots are shown. */
  items?: GlassDockItem[];
  className?: string;
  /** Timestamp of the last successful badge refresh (for the stale note). */
  badgesUpdatedAt?: number | null;
  /** Total unread count rendered on top of the bare home trigger itself. */
  triggerBadge?: number;
}

const PLACEHOLDER_ICONS = [
  Compass,
  Bell,
  Camera,
  MessageCircle,
  Sparkles,
  Bookmark,
  Settings,
  User,
  Heart,
  Search,
  Music,
  Video,
  Globe,
  Calendar,
  Map,
  Layers,
];

/**
 * Bottom-right home dock. Tap, press Enter/Space, or swipe the home icon to
 * open a compact glass panel. Home owns the bottom row; menu actions are
 * packed into five- or seven-column rows above it.
 */
const formatAgo = (timestamp?: number | null): string => {
  if (!timestamp) return 'never';
  const seconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.round(minutes / 60)}h ago`;
};

export default function HomeGlassDock({ items = [], className, badgesUpdatedAt, triggerBadge = 0 }: HomeGlassDockProps) {
  const badgesEnabled = useDockBadgesEnabled();
  const [open, setOpen] = React.useState(false);

  const rootRef = React.useRef<HTMLDivElement>(null);
  const railRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const swipeStart = React.useRef<{ x: number; y: number } | null>(null);
  const longPressTimer = React.useRef<number | null>(null);
  const longPressPreview = React.useRef(false);
  const suppressClick = React.useRef(false);
  const [usage, setUsage] = React.useState<DockUsageMap>({});

  // Frequently-used ordering (most used lands nearest the home trigger).
  React.useEffect(() => {
    setUsage(readDockUsage());
    const onUsage = () => setUsage(readDockUsage());
    window.addEventListener('mmora:home-dock-usage', onUsage);
    return () => window.removeEventListener('mmora:home-dock-usage', onUsage);
  }, []);



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
    if (Math.abs(dy) > 24 && Math.abs(dy) > Math.abs(dx)) {
      suppressClick.current = true;
      setOpen(dy < 0); // swipe up opens, swipe down closes
      return;
    }
    if (wasPreview) suppressClick.current = true;
  };

  const baseSlots: GlassDockItem[] =
    items.length > 0
      ? items
      : PLACEHOLDER_ICONS.map((Icon, index) => ({
          id: `placeholder-${index}`,
          label: `Menu slot ${index + 1}`,
          icon: <Icon className="h-[22px] w-[22px]" />,
          onSelect: () => {},
        }));

  // Keep the most-used actions nearest the home trigger on the bottom row.
  const slots = React.useMemo(
    () => orderByFrequency(baseSlots, usage),
    [baseSlots, usage],
  );

  // When the rail retracts while focus is still inside it, return focus to the trigger.
  const wasOpen = React.useRef(open);
  React.useEffect(() => {
    if (wasOpen.current && !open) {
      const active = document.activeElement;
      if (active && railRef.current?.contains(active)) triggerRef.current?.focus();
    }
    wasOpen.current = open;
  }, [open]);


  const totalBadge = badgesEnabled && Number.isFinite(triggerBadge)
    ? Math.max(0, Math.floor(triggerBadge))
    : 0;

  const renderIconButton = (item: GlassDockItem, isHome = false) => {
    const badge = badgesEnabled && Number.isFinite(item.badge) ? Math.max(0, Math.floor(item.badge as number)) : 0;
    const highlighted = Boolean(item.active) || badge > 0;
    const badgeStale = badgesEnabled && Boolean(item.badgeStale) && badge > 0;

    return (
      <button
        key={item.id}
        type="button"
        ref={isHome ? triggerRef : undefined}
        data-home-dock-trigger={isHome ? true : undefined}
        role={open ? 'menuitem' : undefined}
        aria-label={
          isHome
            ? open
              ? 'Close home menu'
              : totalBadge > 0
                ? `Open home menu, ${totalBadge > 99 ? '99+' : totalBadge} new notifications`
                : 'Open home menu'
            : badge > 0
              ? `${item.label}, ${badge > 99 ? '99+' : badge} new${badgeStale ? ` (cached, updated ${formatAgo(badgesUpdatedAt)})` : ''}`
              : item.label
        }
        title={badgeStale ? `${item.label} — cached count, updated ${formatAgo(badgesUpdatedAt)}` : item.label}
        aria-current={item.active ? 'true' : undefined}
        tabIndex={open || isHome ? 0 : -1}
        onClick={() => {
          if (isHome && suppressClick.current) {
            suppressClick.current = false;
            return;
          }
          if (isHome) {
            setOpen((value) => !value);
            return;
          }
          setOpen(false);
          try {
            recordDockUsage(item.id);
          } catch {
            /* usage tracking must never block navigation */
          }
          try {
            item.onSelect();
          } catch (error) {
            // A failing action must never take the dock (or HomePage) down.
            console.warn('[HomeGlassDock] action failed', item.id, error);
          }
        }}

        onPointerDown={isHome ? handlePointerDown : undefined}
        onPointerUp={isHome ? handlePointerUp : undefined}
        onPointerCancel={isHome ? () => { swipeStart.current = null; endLongPress(); } : undefined}
        onContextMenu={isHome ? (event) => event.preventDefault() : undefined}
        onKeyDown={isHome ? (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setOpen((value) => !value);
          }
        } : undefined}
        onBlur={isHome ? (event) => {
          // Focus leaving the dock entirely retracts it (never leaves it stuck open).
          const next = event.relatedTarget as Node | null;
          if (next && rootRef.current?.contains(next)) return;
          if (next) setOpen(false);
        } : undefined}
        className={cn(
          'group relative flex h-11 w-11 shrink-0 items-center justify-center',
          'transition-all active:scale-95',
          isHome
            ? 'appearance-none rounded-none !border-0 !bg-transparent p-0 text-white !shadow-none hover:!bg-transparent'
            : highlighted
              ? 'rounded-2xl border border-white/45 bg-white/25 text-white shadow-[0_0_10px_rgba(255,255,255,0.35)] hover:bg-white/30'
              : 'rounded-2xl border border-white/15 bg-white/5 text-white/60 hover:bg-white/15 hover:text-white/90',

          isHome
            ? '!outline-none !ring-0 focus:!outline-none focus:!ring-0 focus-visible:!outline-none focus-visible:!ring-0'
            : 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60',
        )}
      >
        {item.icon}
        <span className="pointer-events-none absolute bottom-full mb-2 hidden whitespace-nowrap rounded-md border border-white/25 bg-black/90 px-2 py-1 text-[10px] font-medium text-white shadow-md group-hover:block group-focus-visible:block ">
          {item.label}
        </span>
        {badge > 0 && !isHome && (
          <span
            aria-hidden="true"
            className={cn(
              'pointer-events-none absolute -top-1.5 left-1/2 -translate-x-1/2',
              'flex h-[16px] min-w-[16px] items-center justify-center rounded-full px-1',
              'bg-black/85 text-[10px] font-semibold leading-none text-white',
              'border shadow-[0_1px_4px_rgba(0,0,0,0.6)]',
              badgeStale ? 'border-dashed border-white/50 text-white/70' : 'border-white/40',
            )}
          >
            {badgeStale ? '~' : ''}{badge > 99 ? '99+' : badge}
          </span>
        )}
        {isHome && totalBadge > 0 && !open && (
          <span
            data-testid="home-dock-trigger-badge"
            aria-hidden="true"
            className={cn(
              'pointer-events-none absolute -top-1 left-1/2 -translate-x-1/2',
              'flex h-[16px] min-w-[16px] items-center justify-center rounded-full px-1',
              'border border-white/60 bg-black/90 text-[10px] font-bold leading-none text-white',
              'shadow-[0_1px_4px_rgba(0,0,0,0.6)]',
            )}
          >
            {totalBadge > 99 ? '99+' : totalBadge}
          </span>
        )}
      </button>
    );
  };

  const homeItem: GlassDockItem = {
    id: 'home-trigger',
    label: open ? 'Close home menu' : 'Open home menu',
    icon: <Home className="h-[22px] w-[22px]" />,
    onSelect: () => {},
  };

  // Four rows of seven rounded-edge icons above the Home row.
  const GRID_COLUMNS = 7;
  const GRID_ROWS = 4;
  const GRID_SIZE = GRID_COLUMNS * GRID_ROWS;

  const gridSlots: GlassDockItem[] = React.useMemo(() => {
    // The "Home feed" navigation action is always guaranteed a slot (nearest the
    // home trigger) so every page can return to the feed from the dock.
    const homeFeed = slots.find((item) => item.id === 'dock-home-return');
    const rest = homeFeed ? slots.filter((item) => item !== homeFeed) : slots;
    const capacity = homeFeed ? GRID_SIZE - 1 : GRID_SIZE;

    // When there are more actions than slots, keep the ones the member actually
    // uses first and then fall back to the authored order — so the core menus
    // stay visible on a fresh install instead of being pushed out by extras.
    let visible = rest.slice();
    if (rest.length > capacity) {
      const authored: Record<string, number> = {};
      baseSlots.forEach((item, index) => { authored[item.id] = index; });
      const keep = new Set(
        rest
          .map((item) => ({ item, score: usage[item.id]?.count ?? 0, order: authored[item.id] ?? 0 }))
          .sort((a, b) => (b.score === a.score ? a.order - b.order : b.score - a.score))
          .slice(0, capacity)
          .map((entry) => entry.item.id),
      );
      visible = rest.filter((item) => keep.has(item.id));
    }
    const filled = homeFeed ? [...visible, homeFeed] : visible;

    for (let index = filled.length; index < GRID_SIZE; index += 1) {
      const Icon = PLACEHOLDER_ICONS[index % PLACEHOLDER_ICONS.length];
      filled.push({
        id: `dock-filler-${index}`,
        label: `Menu slot ${index + 1}`,
        icon: <Icon className="h-[22px] w-[22px]" />,
        onSelect: () => {},
      });
    }
    return filled;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slots, baseSlots, usage]);


  const renderPackedRows = () => {
    const rows: GlassDockItem[][] = [];
    for (let index = 0; index < gridSlots.length; index += GRID_COLUMNS) {
      rows.push(gridSlots.slice(index, index + GRID_COLUMNS));
    }

    return (
      <div className="flex flex-col items-end gap-2">
        {rows.map((row, rowIndex) => (
          <div key={`row-${rowIndex}`} className="flex justify-end gap-2">
            {row.map((item) => renderIconButton(item))}
          </div>
        ))}
      </div>
    );
  };


  return (
    <div
      ref={rootRef}
      data-home-dock
      className={cn(
        'fixed z-[9996] flex flex-col items-end justify-end',
        'bottom-[calc(env(safe-area-inset-bottom,0px)+8px)] right-2',
        className,
      )}
    >
      {/* Glass dock panel — permanently anchored on the computer's right side. */}
      <div
        className={cn(
          'overflow-hidden transition-all duration-300 ease-out',
          open
            ? 'max-h-[70vh] translate-y-0 opacity-100'
            : 'max-h-[64px] translate-y-0 opacity-100',
        )}
      >
        <div
          ref={railRef}
          role={open ? 'menu' : undefined}
          aria-hidden={open ? false : undefined}
          className={cn(
            'flex flex-col items-end gap-2 p-2',
            open
              ? 'rounded-[28px] border-0 bg-white/10 backdrop-blur-xl shadow-none'
              : 'rounded-none border-0 bg-transparent shadow-none',
          )}
          style={{ maxWidth: 'calc(100vw - 16px)' }}
        >
          {open && renderPackedRows()}

          {/* Home is the only control in the bottom row and stays at screen-right. */}
          {renderIconButton(homeItem, true)}
        </div>
      </div>
    </div>
  );
}
