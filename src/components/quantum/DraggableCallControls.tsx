// ═══════════════════════════════════════════════════════════════════════════════
// DRAGGABLE CALL CONTROLS - Universal draggable wrapper for Quantum Call UI
// Responsive: 4.1" mobile to 16K displays | Touch + Mouse support
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, PanInfo, useDragControls } from 'framer-motion';
import { GripVertical, Minimize2, Maximize2 } from 'lucide-react';

interface DraggableCallControlsProps {
  children: React.ReactNode;
  id: string;
  title?: string;
  initialPosition?: { x: number; y: number };
  isCompact?: boolean;
  onCompactToggle?: () => void;
  className?: string;
  constrainToParent?: boolean;
  zIndex?: number;
}

// Get stored position from localStorage
const getStoredPosition = (id: string): { x: number; y: number } | null => {
  try {
    const stored = localStorage.getItem(`quantum-call-pos-${id}`);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

// Store position to localStorage
const storePosition = (id: string, position: { x: number; y: number }) => {
  try {
    localStorage.setItem(`quantum-call-pos-${id}`, JSON.stringify(position));
  } catch {
    // localStorage not available
  }
};

export const DraggableCallControls: React.FC<DraggableCallControlsProps> = ({
  children,
  id,
  title,
  initialPosition = { x: 0, y: 0 },
  isCompact = false,
  onCompactToggle,
  className = '',
  constrainToParent = true,
  zIndex = 50,
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
      ? 'scale-[0.7] xs:scale-[0.75] sm:scale-[0.85] md:scale-90 lg:scale-100 origin-center' 
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

  // Ensure element stays within viewport on resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const maxX = window.innerWidth - rect.width;
        const maxY = window.innerHeight - rect.height;
        
        if (position.x > maxX || position.y > maxY || position.x < 0 || position.y < 0) {
          const newPosition = {
            x: Math.max(0, Math.min(position.x, maxX)),
            y: Math.max(0, Math.min(position.y, maxY)),
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
      dragConstraints={constrainToParent ? {
        top: -100,
        left: -100,
        right: typeof window !== 'undefined' ? window.innerWidth - 50 : 500,
        bottom: typeof window !== 'undefined' ? window.innerHeight - 50 : 500,
      } : undefined}
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
        touch-none select-none
        ${className}
      `}
    >
      {/* Drag Handle (small grip icon) */}
      {title && (
        <div 
          className="absolute -top-5 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-0.5 bg-background/60 backdrop-blur-sm rounded-full border border-border/30 cursor-grab active:cursor-grabbing"
          onPointerDown={(e) => dragControls.start(e)}
        >
          <GripVertical className="w-2.5 h-2.5 text-foreground/40" />
          <span className="text-[8px] font-mono text-foreground/50 uppercase tracking-wider">
            {title}
          </span>
          
          {onCompactToggle && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCompactToggle();
              }}
              className="ml-1 p-0.5 hover:bg-foreground/10 rounded transition-colors"
            >
              {isCompact ? (
                <Maximize2 className="w-2 h-2 text-foreground/40" />
              ) : (
                <Minimize2 className="w-2 h-2 text-foreground/40" />
              )}
            </button>
          )}
        </div>
      )}

      {/* Content - make draggable by touching anywhere if no title */}
      <div 
        className={!title ? 'cursor-grab active:cursor-grabbing touch-none' : ''}
        onPointerDown={!title ? (e) => dragControls.start(e) : undefined}
      >
        {children}
      </div>
    </motion.div>
  );
};

export default DraggableCallControls;
