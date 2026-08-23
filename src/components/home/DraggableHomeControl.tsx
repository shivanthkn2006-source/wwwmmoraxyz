import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface Position {
  x: number;
  y: number;
}

interface DraggableHomeControlProps {
  storageKey: string;
  defaultPosition: Position;
  ariaLabel: string;
  /** Tooltip text; falls back to the aria label. */
  tooltip?: string;
  className?: string;
  children: React.ReactNode;
  onActivate: () => void;
  onPositionChange?: (position: Position) => void;
  /** Renders the control non-interactive (used while search videos are injecting). */
  disabled?: boolean;
  busy?: boolean;
}

const CONTROL_SIZE = 36;
const EDGE_GAP = 8;
/** Brand logo safe zone at the top-left — controls never sit under it. */
const LOGO_ZONE = { width: 176, height: 64 };

/** Every mounted control's rect, so siblings never stack on top of each other. */
const occupied = new Map<string, Position>();

const overlaps = (a: Position, b: Position) =>
  Math.abs(a.x - b.x) < CONTROL_SIZE + 4 && Math.abs(a.y - b.y) < CONTROL_SIZE + 4;

export default function DraggableHomeControl({
  storageKey,
  defaultPosition,
  ariaLabel,
  tooltip,
  className,
  children,
  onActivate,
  onPositionChange,
  disabled = false,
  busy = false,
}: DraggableHomeControlProps) {
  const clamp = React.useCallback((next: Position): Position => {
    const maxX = Math.max(EDGE_GAP, window.innerWidth - CONTROL_SIZE - EDGE_GAP);
    const maxY = Math.max(EDGE_GAP, window.innerHeight - CONTROL_SIZE - EDGE_GAP);
    let x = Math.max(EDGE_GAP, Math.min(next.x, maxX));
    let y = Math.max(EDGE_GAP, Math.min(next.y, maxY));
    // Keep clear of the M'Mora brand logo.
    if (x < LOGO_ZONE.width && y < LOGO_ZONE.height) y = LOGO_ZONE.height + EDGE_GAP;
    // Keep clear of sibling controls (search / camera / feed) in any orientation.
    let guard = 0;
    while (
      guard++ < 12 &&
      [...occupied.entries()].some(([key, rect]) => key !== storageKey && overlaps({ x, y }, rect))
    ) {
      y = Math.min(y + CONTROL_SIZE + 8, maxY);
      if (y >= maxY) {
        y = LOGO_ZONE.height + EDGE_GAP;
        x = Math.min(x + CONTROL_SIZE + 8, maxX);
      }
    }
    return { x, y };
  }, [storageKey]);

  const [position, setPosition] = useState<Position>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? (JSON.parse(saved) as Position) : defaultPosition;
    } catch {
      return defaultPosition;
    }
  });
  const pointerRef = useRef<{ id: number; startX: number; startY: number; originX: number; originY: number; moved: boolean } | null>(null);

  useEffect(() => {
    occupied.set(storageKey, position);
    return () => {
      occupied.delete(storageKey);
    };
  }, [storageKey, position]);

  // Resolve overlaps/out-of-bounds on mount and whenever the viewport changes.
  useEffect(() => {
    setPosition((current) => clamp(current));
  }, [clamp]);

  useEffect(() => {
    onPositionChange?.(position);
  }, [position, onPositionChange]);

  useEffect(() => {
    const onResize = () => setPosition((current) => clamp(current));
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, [clamp]);


  const blockZoeInteraction = (blocked: boolean) => {
    (window as Window & { __mmoraHomeControlDragging?: boolean }).__mmoraHomeControlDragging = blocked;
  };

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-disabled={disabled || undefined}
      aria-busy={busy || undefined}
      title={`${tooltip ?? ariaLabel} · drag to move`}
      className={cn(
        'fixed z-[9997] flex h-9 w-9 touch-none select-none items-center justify-center text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        disabled && 'cursor-not-allowed opacity-50',
        className,
      )}


      style={{ left: position.x, top: position.y }}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          event.stopPropagation();
          if (!disabled) onActivate();
        }
      }}
      onPointerDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.setPointerCapture?.(event.pointerId);
        pointerRef.current = {
          id: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          originX: position.x,
          originY: position.y,
          moved: false,
        };
        blockZoeInteraction(true);
      }}
      onPointerMove={(event) => {
        event.stopPropagation();
        const pointer = pointerRef.current;
        if (!pointer || pointer.id !== event.pointerId) return;
        const dx = event.clientX - pointer.startX;
        const dy = event.clientY - pointer.startY;
        if (Math.hypot(dx, dy) > 6) pointer.moved = true;
        setPosition(clamp({ x: pointer.originX + dx, y: pointer.originY + dy }));
      }}
      onPointerUp={(event) => {
        event.preventDefault();
        event.stopPropagation();
        const pointer = pointerRef.current;
        if (!pointer || pointer.id !== event.pointerId) return;
        pointerRef.current = null;
        try { localStorage.setItem(storageKey, JSON.stringify(position)); } catch { /* local storage unavailable */ }
        window.setTimeout(() => blockZoeInteraction(false), 0);
        if (!pointer.moved && !disabled) onActivate();
      }}
      onPointerCancel={(event) => {
        event.stopPropagation();
        pointerRef.current = null;
        blockZoeInteraction(false);
      }}
    >
      {children}
    </button>
  );
}
