// ═══════════════════════════════════════════════════════════════════════════════
// DRAGGABLE HUD WINDOW - Universal wrapper for quantum camera HUD elements
// Responsive: 4.1" mobile to 16K displays | Touch + Mouse support
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useRef, useEffect } from 'react';
import { motion, PanInfo, useDragControls } from 'framer-motion';
import { GripVertical, Minimize2, Maximize2 } from 'lucide-react';

interface DraggableHUDWindowProps {
  children: React.ReactNode;
  id: string;
  title?: string;
  initialPosition?: { x: number; y: number };
  isCompact?: boolean;
  onCompactToggle?: () => void;
  className?: string;
  dragConstraints?: React.RefObject<HTMLElement> | { top: number; left: number; right: number; bottom: number };
  zIndex?: number;
}

// Get stored position from localStorage
const getStoredPosition = (id: string): { x: number; y: number } | null => {
  try {
    const stored = localStorage.getItem(`quantum-hud-pos-${id}`);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

// Store position to localStorage
const storePosition = (id: string, position: { x: number; y: number }) => {
  try {
    localStorage.setItem(`quantum-hud-pos-${id}`, JSON.stringify(position));
  } catch {
    // localStorage not available
  }
};

export const DraggableHUDWindow: React.FC<DraggableHUDWindowProps> = ({
  children,
  id,
  title,
  initialPosition = { x: 0, y: 0 },
  isCompact = false,
  onCompactToggle,
  className = '',
  dragConstraints,
  zIndex = 40,
}) => {
  const dragControls = useDragControls();
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    return getStoredPosition(id) || initialPosition;
  });
  const [isDragging, setIsDragging] = useState(false);

  // Get responsive compact sizing based on screen width
  const getCompactClass = () => {
    // For very small screens (4.1" - 5.5"), use extra compact
    // For medium screens (5.5" - 7.7"), use compact
    // For larger screens, use normal sizing
    return isCompact 
      ? 'scale-[0.75] sm:scale-[0.85] md:scale-90 lg:scale-100 origin-top-left' 
      : '';
  };

  // Handle drag end - store position
  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const newPosition = {
      x: position.x + info.offset.x,
      y: position.y + info.offset.y,
    };
    setPosition(newPosition);
    storePosition(id, newPosition);
    setIsDragging(false);
  };

  // Ensure window stays within viewport on resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const maxX = window.innerWidth - rect.width;
        const maxY = window.innerHeight - rect.height;
        
        if (position.x > maxX || position.y > maxY) {
          const newPosition = {
            x: Math.min(position.x, maxX),
            y: Math.min(position.y, maxY),
          };
          setPosition(newPosition);
          storePosition(id, newPosition);
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [position, id]);

  return (
    <motion.div
      ref={containerRef}
      drag
      dragControls={dragControls}
      dragMomentum={false}
      dragElastic={0.1}
      dragConstraints={dragConstraints || {
        top: 0,
        left: 0,
        right: typeof window !== 'undefined' ? window.innerWidth - 100 : 500,
        bottom: typeof window !== 'undefined' ? window.innerHeight - 100 : 500,
      }}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={handleDragEnd}
      initial={false}
      animate={{
        x: position.x,
        y: position.y,
      }}
      style={{ zIndex }}
      className={`
        ${getCompactClass()}
        ${isDragging ? 'cursor-grabbing' : ''}
        ${className}
      `}
    >
      {/* Drag Handle Header */}
      {title && (
        <div 
          className="flex items-center justify-between px-2 py-1 bg-black/40 rounded-t-lg border-b border-white/10 cursor-grab active:cursor-grabbing"
          onPointerDown={(e) => dragControls.start(e)}
        >
          <div className="flex items-center gap-1.5">
            <GripVertical className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-foreground/40" />
            <span className="text-[9px] sm:text-[10px] font-mono text-foreground/60 select-none">
              {title}
            </span>
          </div>
          
          {onCompactToggle && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCompactToggle();
              }}
              className="p-0.5 hover:bg-white/10 rounded transition-colors"
            >
              {isCompact ? (
                <Maximize2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-foreground/50" />
              ) : (
                <Minimize2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-foreground/50" />
              )}
            </button>
          )}
        </div>
      )}

      {/* Content */}
      <div 
        className={`
          ${title ? '' : 'cursor-grab active:cursor-grabbing'}
          ${!title ? 'touch-none' : ''}
        `}
        onPointerDown={!title ? (e) => dragControls.start(e) : undefined}
      >
        {children}
      </div>
    </motion.div>
  );
};

export default DraggableHUDWindow;
