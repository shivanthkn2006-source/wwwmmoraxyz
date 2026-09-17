// ═══════════════════════════════════════════════════════════════════════════════
// VR DRAGGABLE PANEL
// Additive wrapper that makes any existing VR control cluster draggable and
// collapsible (tap the pill to drop it down). The wrapped children keep their own
// design, components and behaviour untouched.
// Position + open/closed state persist across refreshes, and the wrapped content
// is only mounted the first time it is opened (lazy) to keep VR entry fast.
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useEffect, useRef, useState } from 'react';
import { motion, useDragControls, useMotionValue } from 'framer-motion';
import { ChevronDown, ChevronUp, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VRDraggablePanelProps {
  id: string;
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  /** Positioning classes for the resting place of the panel (fixed positioning). */
  positionClassName?: string;
  defaultOpen?: boolean;
  /** Chevron direction when collapsed. */
  openDirection?: 'down' | 'up';
  className?: string;
  contentClassName?: string;
}

interface StoredPosition {
  x: number;
  y: number;
}

const readPosition = (key: string): StoredPosition => {
  if (typeof window === 'undefined') return { x: 0, y: 0 };
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return { x: 0, y: 0 };
    const parsed = JSON.parse(raw) as StoredPosition;
    if (typeof parsed?.x !== 'number' || typeof parsed?.y !== 'number') return { x: 0, y: 0 };
    // Clamp so a saved position from a bigger screen can never park a panel off-screen.
    const maxX = Math.max(0, window.innerWidth - 80);
    const maxY = Math.max(0, window.innerHeight - 80);
    return {
      x: Math.max(-maxX, Math.min(maxX, parsed.x)),
      y: Math.max(-maxY, Math.min(maxY, parsed.y)),
    };
  } catch {
    return { x: 0, y: 0 };
  }
};

export const VRDraggablePanel: React.FC<VRDraggablePanelProps> = ({
  id,
  title,
  icon,
  children,
  positionClassName = 'fixed top-4 left-4 z-[9995]',
  defaultOpen = true,
  openDirection = 'down',
  className,
  contentClassName,
}) => {
  const storageKey = `vr-panel-open:${id}`;
  const positionKey = `vr-panel-pos:${id}`;
  const [isOpen, setIsOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return defaultOpen;
    const stored = window.localStorage.getItem(storageKey);
    return stored === null ? defaultOpen : stored === '1';
  });
  // Lazy content: never mount the children until the panel has been opened once.
  const [hasOpened, setHasOpened] = useState<boolean>(isOpen);
  const constraintsRef = useRef<HTMLDivElement | null>(null);

  const initialPosition = useRef(readPosition(positionKey));
  const x = useMotionValue(initialPosition.current.x);
  const y = useMotionValue(initialPosition.current.y);

  useEffect(() => {
    if (isOpen) setHasOpened(true);
    try {
      window.localStorage.setItem(storageKey, isOpen ? '1' : '0');
    } catch {
      /* storage unavailable */
    }
  }, [isOpen, storageKey]);

  const persistPosition = () => {
    try {
      window.localStorage.setItem(positionKey, JSON.stringify({ x: x.get(), y: y.get() }));
    } catch {
      /* storage unavailable */
    }
  };

  const Chevron = isOpen
    ? (openDirection === 'down' ? ChevronUp : ChevronDown)
    : (openDirection === 'down' ? ChevronDown : ChevronUp);

  return (
    <motion.div
      ref={constraintsRef}
      drag
      dragMomentum={false}
      dragElastic={0.05}
      style={{ touchAction: 'none', x, y }}
      onDragEnd={persistPosition}
      whileDrag={{ scale: 1.02, cursor: 'grabbing' }}
      className={cn(positionClassName, 'cursor-grab active:cursor-grabbing touch-none', className)}
    >
      <div className="flex flex-col gap-1.5">
        {/* Drag handle + dropdown toggle */}
        <button
          type="button"
          onClick={() => setIsOpen(v => !v)}
          aria-expanded={isOpen}
          aria-label={`${title} — tap to ${isOpen ? 'hide' : 'show'}, drag to move`}
          className="flex items-center gap-1.5 self-start min-h-[44px] px-3.5 py-2.5 rounded-full bg-black/70 backdrop-blur-xl
                     border border-white/20 text-white/80 hover:bg-black/85 hover:border-white/35 transition-all shadow-lg
                     focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2
                     focus-visible:ring-offset-black/50 active:bg-black/90"
        >
          <GripVertical className="w-4 h-4 text-white/50" aria-hidden />
          {icon}
          <span className="text-[11px] sm:text-xs font-mono tracking-wide">{title}</span>
          <Chevron className="w-4 h-4 text-white/70" aria-hidden />
        </button>

        {hasOpened && (
          <motion.div
            initial={{ opacity: 0, y: openDirection === 'down' ? -6 : 6 }}
            animate={{ opacity: isOpen ? 1 : 0, y: 0 }}
            className={cn('pointer-events-auto', isOpen ? '' : 'hidden', contentClassName)}
            aria-hidden={!isOpen}
          >
            {children}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default VRDraggablePanel;
