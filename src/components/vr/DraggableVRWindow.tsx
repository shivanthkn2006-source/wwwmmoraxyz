/**
 * Draggable VR Window Manager
 * Makes VR windows draggable, handles z-index stacking, prevents overlay issues
 * All windows stay visible and accessible
 */

import React, { useState, useRef, useCallback, useEffect, createContext, useContext } from 'react';
import { motion, PanInfo } from 'framer-motion';
import { GripVertical, Minimize2, Maximize2, X, Pin, PinOff } from 'lucide-react';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES & CONTEXT
// ═══════════════════════════════════════════════════════════════════════════════

interface WindowState {
  id: string;
  x: number;
  y: number;
  zIndex: number;
  minimized: boolean;
  pinned: boolean;
  width?: number;
  height?: number;
}

interface WindowManagerContextType {
  windows: Map<string, WindowState>;
  registerWindow: (id: string, initialX?: number, initialY?: number) => void;
  unregisterWindow: (id: string) => void;
  bringToFront: (id: string) => void;
  updatePosition: (id: string, x: number, y: number) => void;
  toggleMinimize: (id: string) => void;
  togglePin: (id: string) => void;
  getWindowState: (id: string) => WindowState | undefined;
  topZIndex: number;
}

const WindowManagerContext = createContext<WindowManagerContextType | null>(null);

// Base z-index for VR windows - high enough to be above most content but below critical overlays
const BASE_Z_INDEX = 1000;
const MAX_Z_INDEX = 9000; // Below modals (9999)

// ═══════════════════════════════════════════════════════════════════════════════
// WINDOW MANAGER PROVIDER
// ═══════════════════════════════════════════════════════════════════════════════

export const VRWindowManager: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [windows, setWindows] = useState<Map<string, WindowState>>(new Map());
  const [topZIndex, setTopZIndex] = useState(BASE_Z_INDEX);

  const registerWindow = useCallback((id: string, initialX = 20, initialY = 100) => {
    setWindows(prev => {
      if (prev.has(id)) return prev;
      
      const newMap = new Map(prev);
      const newZIndex = topZIndex + 1;
      
      newMap.set(id, {
        id,
        x: initialX,
        y: initialY,
        zIndex: newZIndex,
        minimized: false,
        pinned: false,
      });
      
      setTopZIndex(Math.min(newZIndex, MAX_Z_INDEX));
      return newMap;
    });
  }, [topZIndex]);

  const unregisterWindow = useCallback((id: string) => {
    setWindows(prev => {
      const newMap = new Map(prev);
      newMap.delete(id);
      return newMap;
    });
  }, []);

  const bringToFront = useCallback((id: string) => {
    setWindows(prev => {
      const window = prev.get(id);
      if (!window || window.zIndex === topZIndex) return prev;
      
      const newZIndex = Math.min(topZIndex + 1, MAX_Z_INDEX);
      const newMap = new Map(prev);
      newMap.set(id, { ...window, zIndex: newZIndex });
      
      setTopZIndex(newZIndex);
      return newMap;
    });
  }, [topZIndex]);

  const updatePosition = useCallback((id: string, x: number, y: number) => {
    setWindows(prev => {
      const window = prev.get(id);
      if (!window) return prev;
      
      const newMap = new Map(prev);
      newMap.set(id, { ...window, x, y });
      return newMap;
    });
  }, []);

  const toggleMinimize = useCallback((id: string) => {
    setWindows(prev => {
      const window = prev.get(id);
      if (!window) return prev;
      
      const newMap = new Map(prev);
      newMap.set(id, { ...window, minimized: !window.minimized });
      return newMap;
    });
  }, []);

  const togglePin = useCallback((id: string) => {
    setWindows(prev => {
      const window = prev.get(id);
      if (!window) return prev;
      
      const newMap = new Map(prev);
      newMap.set(id, { ...window, pinned: !window.pinned });
      return newMap;
    });
  }, []);

  const getWindowState = useCallback((id: string) => {
    return windows.get(id);
  }, [windows]);

  return (
    <WindowManagerContext.Provider value={{
      windows,
      registerWindow,
      unregisterWindow,
      bringToFront,
      updatePosition,
      toggleMinimize,
      togglePin,
      getWindowState,
      topZIndex,
    }}>
      {children}
    </WindowManagerContext.Provider>
  );
};

export const useVRWindowManager = () => {
  const context = useContext(WindowManagerContext);
  if (!context) {
    // Return a no-op context if not wrapped
    return {
      windows: new Map(),
      registerWindow: () => {},
      unregisterWindow: () => {},
      bringToFront: () => {},
      updatePosition: () => {},
      toggleMinimize: () => {},
      togglePin: () => {},
      getWindowState: () => undefined,
      topZIndex: BASE_Z_INDEX,
    };
  }
  return context;
};

// ═══════════════════════════════════════════════════════════════════════════════
// DRAGGABLE WINDOW COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

interface DraggableVRWindowProps {
  id: string;
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  initialX?: number;
  initialY?: number;
  className?: string;
  headerClassName?: string;
  onClose?: () => void;
  showControls?: boolean;
  resizable?: boolean;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
}

export const DraggableVRWindow: React.FC<DraggableVRWindowProps> = ({
  id,
  title,
  icon,
  children,
  initialX = 20,
  initialY = 100,
  className,
  headerClassName,
  onClose,
  showControls = true,
  resizable = false,
  minWidth = 200,
  minHeight = 100,
  maxWidth = 600,
  maxHeight = 500,
}) => {
  const manager = useVRWindowManager();
  const [position, setPosition] = useState({ x: initialX, y: initialY });
  const [size, setSize] = useState({ width: minWidth, height: minHeight });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const windowState = manager.getWindowState(id);

  // Register on mount
  useEffect(() => {
    manager.registerWindow(id, initialX, initialY);
    return () => manager.unregisterWindow(id);
  }, [id, initialX, initialY]);

  // Sync with manager state
  useEffect(() => {
    if (windowState) {
      setPosition({ x: windowState.x, y: windowState.y });
    }
  }, [windowState?.x, windowState?.y]);

  const handleDragStart = () => {
    setIsDragging(true);
    manager.bringToFront(id);
  };

  const handleDrag = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const newX = Math.max(0, Math.min(window.innerWidth - 100, position.x + info.delta.x));
    const newY = Math.max(0, Math.min(window.innerHeight - 50, position.y + info.delta.y));
    setPosition({ x: newX, y: newY });
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    manager.updatePosition(id, position.x, position.y);
  };

  const handleClick = () => {
    manager.bringToFront(id);
  };

  // Constrain to viewport
  useEffect(() => {
    const handleResize = () => {
      setPosition(prev => ({
        x: Math.min(prev.x, window.innerWidth - 100),
        y: Math.min(prev.y, window.innerHeight - 50),
      }));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const zIndex = windowState?.zIndex ?? BASE_Z_INDEX;
  const minimized = windowState?.minimized ?? false;
  const pinned = windowState?.pinned ?? false;

  if (minimized) {
    return (
      <motion.div
        ref={containerRef}
        style={{
          position: 'fixed',
          left: position.x,
          top: position.y,
          zIndex,
        }}
        className="pointer-events-auto"
      >
        <button
          onClick={() => manager.toggleMinimize(id)}
          className="flex items-center gap-2 px-3 py-1.5 bg-black/70 backdrop-blur-md rounded-full border border-white/20 hover:bg-black/80 transition-colors"
        >
          {icon}
          <span className="text-xs text-white/80">{title}</span>
          <Maximize2 className="w-3 h-3 text-white/60" />
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      ref={containerRef}
      drag={!pinned}
      dragMomentum={false}
      dragElastic={0}
      onDragStart={handleDragStart}
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        zIndex,
        width: resizable ? size.width : 'auto',
        maxWidth,
        touchAction: 'none',
      }}
      className={cn(
        'pointer-events-auto',
        isDragging && 'cursor-grabbing',
        !isDragging && !pinned && 'cursor-grab',
        className
      )}
    >
      <div className={cn(
        'bg-black/85 backdrop-blur-xl rounded-xl border overflow-hidden shadow-2xl',
        pinned ? 'border-primary/50' : 'border-white/20',
      )}>
        {/* Header */}
        <div 
          className={cn(
            'flex items-center justify-between px-3 py-2 border-b border-white/10',
            pinned ? 'bg-primary/20' : 'bg-black/40',
            headerClassName
          )}
        >
          <div className="flex items-center gap-2">
            <GripVertical className={cn(
              'w-3.5 h-3.5',
              pinned ? 'text-primary/40' : 'text-white/40'
            )} />
            {icon}
            <span className="text-xs font-semibold text-white truncate max-w-[120px]">{title}</span>
          </div>
          
          {showControls && (
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => { e.stopPropagation(); manager.togglePin(id); }}
                className="p-1 hover:bg-white/20 rounded transition-colors"
                title={pinned ? 'Unpin' : 'Pin'}
              >
                {pinned ? (
                  <PinOff className="w-3.5 h-3.5 text-primary" />
                ) : (
                  <Pin className="w-3.5 h-3.5 text-white/60 hover:text-white" />
                )}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); manager.toggleMinimize(id); }}
                className="p-1 hover:bg-white/20 rounded transition-colors"
                title="Minimize"
              >
                <Minimize2 className="w-3.5 h-3.5 text-white/60 hover:text-white" />
              </button>
              {onClose && (
                <button
                  onClick={(e) => { e.stopPropagation(); onClose(); }}
                  className="p-1 hover:bg-red-500/50 rounded transition-colors"
                  title="Close"
                >
                  <X className="w-3.5 h-3.5 text-white/60 hover:text-white" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Content */}
        <div 
          className="p-2 overflow-auto"
          style={{ 
            maxHeight: maxHeight - 40,
            touchAction: 'pan-y',
          }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      </div>

      {/* Resize Handle */}
      {resizable && (
        <div
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
          onPointerDown={(e) => {
            e.stopPropagation();
            setIsResizing(true);
            
            const startX = e.clientX;
            const startY = e.clientY;
            const startWidth = size.width;
            const startHeight = size.height;

            const handleMove = (moveEvent: PointerEvent) => {
              const newWidth = Math.max(minWidth, Math.min(maxWidth, startWidth + moveEvent.clientX - startX));
              const newHeight = Math.max(minHeight, Math.min(maxHeight, startHeight + moveEvent.clientY - startY));
              setSize({ width: newWidth, height: newHeight });
            };

            const handleUp = () => {
              setIsResizing(false);
              window.removeEventListener('pointermove', handleMove);
              window.removeEventListener('pointerup', handleUp);
            };

            window.addEventListener('pointermove', handleMove);
            window.addEventListener('pointerup', handleUp);
          }}
        >
          <svg 
            className="w-full h-full text-white/30 hover:text-white/60 transition-colors"
            viewBox="0 0 10 10"
          >
            <path d="M 10 0 L 10 10 L 0 10" fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
        </div>
      )}
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MINIMIZED WINDOWS DOCK
// ═══════════════════════════════════════════════════════════════════════════════

export const MinimizedWindowsDock: React.FC = () => {
  const { windows, toggleMinimize } = useVRWindowManager();
  
  const minimizedWindows = Array.from(windows.values()).filter(w => w.minimized);
  
  if (minimizedWindows.length === 0) return null;
  
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9000] flex gap-2 px-4 py-2 bg-black/60 backdrop-blur-md rounded-full border border-white/10">
      {minimizedWindows.map(window => (
        <button
          key={window.id}
          onClick={() => toggleMinimize(window.id)}
          className="px-3 py-1 text-xs text-white/80 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
        >
          {window.id}
        </button>
      ))}
    </div>
  );
};

export default DraggableVRWindow;
