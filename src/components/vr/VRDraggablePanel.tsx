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
  const dragControls = useDragControls();

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

  // A saved position from a larger screen (or from portrait) must never park the
  // panel off-screen after a rotation or on a smaller device.
  useEffect(() => {
    const reclamp = () => {
      const clamped = readPosition(positionKey);
      x.set(clamped.x);
      y.set(clamped.y);
    };
    window.addEventListener('resize', reclamp);
    window.addEventListener('orientationchange', reclamp);
    return () => {
      window.removeEventListener('resize', reclamp);
      window.removeEventListener('orientationchange', reclamp);
    };
  }, [positionKey, x, y]);

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
      // Dragging starts from the header pill only, so the panel's own controls,
      // inputs and scrolling keep working untouched.
      dragListener={false}
      dragControls={dragControls}
      dragMomentum={false}
      dragElastic={0.05}
      style={{ x, y }}
      onDragEnd={persistPosition}
      whileDrag={{ scale: 1.02 }}
      className={cn(positionClassName, className)}
    >
      <div className="flex flex-col gap-1.5">
        {/* One pill: the grip moves the panel, the label taps it open or shut.
            Drag lives on its own handle because a pointer-capture drag start on
            the toggle itself swallows the tap. */}
        <div className="flex items-center self-start rounded-full bg-black/70 backdrop-blur-xl border border-white/20
                        shadow-lg overflow-hidden">
          <span
            role="button"
            tabIndex={-1}
            aria-label={`Drag to move ${title}`}
            onPointerDown={(event) => dragControls.start(event)}
            style={{ touchAction: 'none' }}
            className="flex items-center min-h-[44px] min-w-[36px] justify-center pl-2.5 pr-1 text-white/50
                       cursor-grab active:cursor-grabbing hover:text-white/80"
          >
            <GripVertical className="w-4 h-4" aria-hidden />
          </span>
          <button
            type="button"
            onClick={() => setIsOpen(v => !v)}
            aria-expanded={isOpen}
            aria-label={`${title} — tap to ${isOpen ? 'hide' : 'show'}`}
            className="flex items-center gap-1.5 min-h-[44px] pl-1 pr-3.5 py-2.5 text-white/80
                       hover:bg-white/10 transition-colors
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-inset
                       active:bg-white/15"
          >
            {icon}
            <span className="text-[11px] sm:text-xs font-mono tracking-wide">{title}</span>
            <Chevron className="w-4 h-4 text-white/70" aria-hidden />
          </button>
        </div>

        {hasOpened && (
          <motion.div
            initial={{ opacity: 0, y: openDirection === 'down' ? -6 : 6 }}
            animate={{ opacity: isOpen ? 1 : 0, y: 0 }}
            className={cn(
              // Height follows the real viewport (landscape phones are only ~390px
              // tall), so every field inside a panel stays reachable by scrolling.
              'pointer-events-auto max-h-[calc(100dvh-8rem)] overflow-y-auto overscroll-contain',
              isOpen ? '' : 'hidden',
              contentClassName,
            )}
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
