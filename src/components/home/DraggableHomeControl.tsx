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
  className?: string;
  children: React.ReactNode;
  onActivate: () => void;
}

const CONTROL_SIZE = 36;
const EDGE_GAP = 8;

export default function DraggableHomeControl({
  storageKey,
  defaultPosition,
  ariaLabel,
  className,
  children,
  onActivate,
}: DraggableHomeControlProps) {
  const [position, setPosition] = useState<Position>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? (JSON.parse(saved) as Position) : defaultPosition;
    } catch {
      return defaultPosition;
    }
  });
  const pointerRef = useRef<{ id: number; startX: number; startY: number; originX: number; originY: number; moved: boolean } | null>(null);

  const clamp = React.useCallback((next: Position): Position => ({
    x: Math.max(EDGE_GAP, Math.min(next.x, window.innerWidth - CONTROL_SIZE - EDGE_GAP)),
    y: Math.max(EDGE_GAP, Math.min(next.y, window.innerHeight - CONTROL_SIZE - EDGE_GAP)),
  }), []);

  useEffect(() => {
    const onResize = () => setPosition((current) => clamp(current));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [clamp]);

  const blockZoeInteraction = (blocked: boolean) => {
    (window as Window & { __mmoraHomeControlDragging?: boolean }).__mmoraHomeControlDragging = blocked;
  };

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      title={`${ariaLabel} · drag to move`}
      className={cn(
        'fixed z-[9997] flex h-9 w-9 touch-none select-none items-center justify-center rounded-full bg-white/10 text-white shadow-none backdrop-blur-md transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}

      style={{ left: position.x, top: position.y }}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onPointerDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.setPointerCapture(event.pointerId);
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
        if (!pointer.moved) onActivate();
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