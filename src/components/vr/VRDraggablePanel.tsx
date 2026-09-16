// ═══════════════════════════════════════════════════════════════════════════════
// VR DRAGGABLE PANEL
// Additive wrapper that makes any existing VR control cluster draggable and
// collapsible (tap the pill to drop it down). The wrapped children keep their own
// design, components and behaviour untouched.
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
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
  const [isOpen, setIsOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return defaultOpen;
    const stored = window.localStorage.getItem(storageKey);
    return stored === null ? defaultOpen : stored === '1';
  });
  const constraintsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, isOpen ? '1' : '0');
    } catch {
      /* storage unavailable */
    }
  }, [isOpen, storageKey]);

  const Chevron = isOpen
    ? (openDirection === 'down' ? ChevronUp : ChevronDown)
    : (openDirection === 'down' ? ChevronDown : ChevronUp);

  return (
    <motion.div
      ref={constraintsRef}
      drag
      dragMomentum={false}
      dragElastic={0.05}
      whileDrag={{ scale: 1.02, cursor: 'grabbing' }}
      className={cn(positionClassName, 'cursor-grab active:cursor-grabbing touch-none', className)}
      style={{ touchAction: 'none' }}
    >
      <div className="flex flex-col gap-1.5">
        {/* Drag handle + dropdown toggle */}
        <button
          type="button"
          onClick={() => setIsOpen(v => !v)}
          aria-expanded={isOpen}
          aria-label={`${title} — tap to ${isOpen ? 'hide' : 'show'}, drag to move`}
          className="flex items-center gap-1.5 self-start px-2.5 py-1.5 rounded-full bg-black/70 backdrop-blur-xl
                     border border-white/20 text-white/80 hover:bg-black/85 hover:border-white/35 transition-all shadow-lg"
        >
          <GripVertical className="w-3 h-3 text-white/40" />
          {icon}
          <span className="text-[10px] sm:text-xs font-mono tracking-wide">{title}</span>
          <Chevron className="w-3 h-3 text-white/60" />
        </button>

        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: openDirection === 'down' ? -6 : 6 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn('pointer-events-auto', contentClassName)}
          >
            {children}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default VRDraggablePanel;
