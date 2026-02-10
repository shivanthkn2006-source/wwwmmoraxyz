// ═══════════════════════════════════════════════════════════════════════════════
// NEURAL HUD - PROJECT EXODUS 2120
// Contextual Awareness: Do not show a 'Menu Bar' constantly
// Only reveal controls when the user looks/hovers near the edge (Proximity Detection)
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { 
  Settings, 
  MessageCircle, 
  Compass, 
  Shield, 
  Zap,
  Eye,
  Home,
  Globe,
  Users
} from 'lucide-react';

type EdgePosition = 'left' | 'right' | 'top' | 'bottom';

export interface HUDItem {
  id: string;
  icon: React.ElementType;
  label: string;
  onClick?: () => void;
  color?: string;
  badge?: number; // notification badge count
  badgeColor?: string; // gradient class for badge
  profilePhotoUrl?: string; // optional profile photo URL for avatar display
}

interface NeuralHUDProps {
  leftItems?: HUDItem[];
  rightItems?: HUDItem[];
  topItems?: HUDItem[];
  bottomItems?: HUDItem[];
  topLeftItems?: HUDItem[];
  topRightItems?: HUDItem[];
  utilityLeftItems?: HUDItem[]; // Utility items on left (admin controls)
  utilityRightItems?: HUDItem[]; // Utility items on right (auto-scroll, compact)
  edgeThreshold?: number; // pixels from edge to trigger
  onEdgeHover?: (edge: EdgePosition | null) => void;
  className?: string;
}

const defaultLeftItems: HUDItem[] = [
  { id: 'home', icon: Home, label: 'Home', color: 'text-omega-cyan' },
  { id: 'chat', icon: MessageCircle, label: 'Zoe Chat', color: 'text-omega-purple' },
  { id: 'explore', icon: Compass, label: 'Explore', color: 'text-omega-pink' },
];

const defaultRightItems: HUDItem[] = [
  { id: 'security', icon: Shield, label: 'Security', color: 'text-amber-400' },
  { id: 'settings', icon: Settings, label: 'Settings', color: 'text-slate-400' },
];

export const NeuralHUD: React.FC<NeuralHUDProps> = ({
  leftItems = defaultLeftItems,
  rightItems = defaultRightItems,
  topItems = [],
  bottomItems = [],
  edgeThreshold = 50,
  onEdgeHover,
  className,
  topLeftItems = [],
  topRightItems = [],
  utilityLeftItems = [],
  utilityRightItems = [],
}) => {
  const [visibleEdge, setVisibleEdge] = useState<EdgePosition | null>(null);
  // Initialize mouse position to center of screen to prevent panels showing on page load
  const [mousePosition, setMousePosition] = useState({ x: typeof window !== 'undefined' ? window.innerWidth / 2 : 500, y: typeof window !== 'undefined' ? window.innerHeight / 2 : 500 });
  const [hoveredZone, setHoveredZone] = useState<string | null>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const { clientX, clientY } = e;
    const { innerWidth, innerHeight } = window;
    
    setMousePosition({ x: clientX, y: clientY });

    // Clear any pending hide timeout
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }

    // Detect which edge we're near
    let detectedEdge: EdgePosition | null = null;
    
    if (clientX <= edgeThreshold) {
      detectedEdge = 'left';
    } else if (clientX >= innerWidth - edgeThreshold) {
      detectedEdge = 'right';
    } else if (clientY <= edgeThreshold) {
      detectedEdge = 'top';
    } else if (clientY >= innerHeight - edgeThreshold) {
      detectedEdge = 'bottom';
    }

    // Determine specific zone based on position
    let zone: string | null = null;
    if (detectedEdge === 'right') {
      const screenHeight = innerHeight;
      if (clientY < screenHeight * 0.15) {
        zone = 'right-top'; // Top right corner - profile area
      } else if (clientY < screenHeight * 0.4) {
        zone = 'right-utility'; // Utility/auto-scroll area
      } else {
        zone = 'right-main'; // Main right panel
      }
    } else if (detectedEdge === 'left') {
      const screenHeight = innerHeight;
      if (clientY < screenHeight * 0.35) {
        zone = 'left-utility'; // Admin utility area
      } else {
        zone = 'left-main'; // Main left panel
      }
    }

    setHoveredZone(zone);

    if (detectedEdge !== visibleEdge) {
      setVisibleEdge(detectedEdge);
      onEdgeHover?.(detectedEdge);
    }

    // Auto-hide after 3 seconds of no edge proximity
    if (!detectedEdge && visibleEdge) {
      hideTimeoutRef.current = setTimeout(() => {
        setVisibleEdge(null);
        setHoveredZone(null);
        onEdgeHover?.(null);
      }, 300);
    }
  }, [edgeThreshold, visibleEdge, onEdgeHover]);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, [handleMouseMove]);

  const renderEdgePanel = (
    position: EdgePosition,
    items: HUDItem[],
    isVisible: boolean
  ) => {
    if (items.length === 0) return null;

    const isHorizontal = position === 'top' || position === 'bottom';

    return (
      <AnimatePresence>
        {isVisible && (
          <motion.div
            className={cn(
              'neural-hud-edge glass-2120 p-2',
              isHorizontal ? 'flex-row space-x-2' : 'flex-col space-y-2',
              'flex items-center',
              position === 'left' && 'rounded-r-xl',
              position === 'right' && 'rounded-l-xl',
              position === 'top' && 'rounded-b-xl',
              position === 'bottom' && 'rounded-t-xl',
              className
            )}
            data-position={position}
            initial={{ 
              opacity: 0,
              x: position === 'left' ? -100 : position === 'right' ? 100 : 0,
              y: position === 'top' ? -100 : position === 'bottom' ? 100 : 0,
            }}
            animate={{ 
              opacity: 1,
              x: position === 'left' || position === 'right' ? 0 : undefined,
              y: position === 'top' || position === 'bottom' ? 0 : undefined,
            }}
            exit={{ 
              opacity: 0,
              x: position === 'left' ? -100 : position === 'right' ? 100 : 0,
              y: position === 'top' ? -100 : position === 'bottom' ? 100 : 0,
            }}
            transition={{
              type: 'spring',
              stiffness: 400,
              damping: 30,
            }}
            style={{
              position: 'fixed',
              [position]: 0,
              ...(position === 'left' || position === 'right' 
                ? { top: '50%', transform: 'translateY(-50%)' }
                : { left: '50%', transform: 'translateX(-50%)' }
              ),
              zIndex: 9997,
              pointerEvents: 'auto',
            }}
          >
            {items.map((item) => (
              <motion.button
                key={item.id}
                className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center',
                  'bg-white/5 hover:bg-white/10 transition-colors',
                  'border border-white/10 hover:border-omega-cyan/30',
                  'group relative'
                )}
                onClick={item.onClick}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <item.icon className={cn('w-3 h-3', item.color || 'text-white/70')} />
                
                {/* Notification Badge */}
                {item.badge && item.badge > 0 && (
                  <Badge className={cn(
                    'absolute -top-1 -right-1 h-4 min-w-[16px] px-1',
                    'flex items-center justify-center text-[9px] text-white',
                    'border border-background rounded-full',
                    item.badgeColor || 'bg-gradient-to-r from-pink-500 to-rose-500'
                  )}>
                    {item.badge > 9 ? '9+' : item.badge}
                  </Badge>
                )}
                
                {/* Tooltip */}
                <div className={cn(
                  'absolute whitespace-nowrap px-2 py-1 rounded text-xs',
                  'bg-black/80 text-white/90 opacity-0 group-hover:opacity-100',
                  'transition-opacity pointer-events-none',
                  position === 'left' && 'left-full ml-2',
                  position === 'right' && 'right-full mr-2',
                  position === 'top' && 'top-full mt-2',
                  position === 'bottom' && 'bottom-full mb-2',
                )}>
                  {item.label}
                </div>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    );
  };

  // Render corner HUD panels (top-left, top-right)
  const renderCornerPanel = (
    corner: 'top-left' | 'top-right',
    items: HUDItem[],
    isVisible: boolean
  ) => {
    // Hard-filter: the Zoe orb is revealed via hover/interaction, not via a HUD toggle button.
    const filteredItems = items.filter((item) => item.id !== 'zoe-orb');
    if (filteredItems.length === 0) return null;

    const isProfileOnlyTopRight =
      corner === 'top-right' && filteredItems.length === 1 && Boolean(filteredItems[0]?.profilePhotoUrl);

    return (
      <AnimatePresence>
        {isVisible && (
          <motion.div
            className={cn(
              isProfileOnlyTopRight
                ? 'neural-hud-corner p-0 border-0 bg-transparent backdrop-blur-none'
                : 'neural-hud-corner glass-2120 p-2',
              'flex flex-col space-y-2 items-center',
              corner === 'top-left' && 'rounded-br-xl',
              corner === 'top-right' && 'rounded-bl-xl',
              className
            )}
            data-position={corner}
            initial={{
              opacity: 0,
              x: corner === 'top-left' ? -50 : 50,
              y: -50,
            }}
            animate={{
              opacity: 1,
              x: 0,
              y: 0,
            }}
            exit={{
              opacity: 0,
              x: corner === 'top-left' ? -50 : 50,
              y: -50,
            }}
            transition={{
              type: 'spring',
              stiffness: 400,
              damping: 30,
            }}
            style={{
              position: 'fixed',
              top: 0,
              [corner === 'top-left' ? 'left' : 'right']: 0,
              zIndex: 9997,
              pointerEvents: 'auto',
            }}
          >
            {filteredItems.map((item) => (
              <motion.button
                key={item.id}
                className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden',
                  item.profilePhotoUrl
                    ? 'bg-transparent hover:bg-transparent border-0'
                    : 'bg-white/5 hover:bg-white/10 transition-colors border border-white/10 hover:border-omega-cyan/30',
                  'group relative'
                )}
                onClick={item.onClick}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                {/* Show profile photo if available, otherwise show icon */}
                {item.profilePhotoUrl ? (
                  <img
                    src={item.profilePhotoUrl}
                    alt={item.label}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <item.icon className={cn('w-3 h-3', item.color || 'text-white/70')} />
                )}

                {/* Notification Badge */}
                {item.badge && item.badge > 0 && (
                  <Badge
                    className={cn(
                      'absolute -top-1 -right-1 h-4 min-w-[16px] px-1',
                      'flex items-center justify-center text-[9px] text-white',
                      'border border-background rounded-full',
                      item.badgeColor || 'bg-gradient-to-r from-pink-500 to-rose-500'
                    )}
                  >
                    {item.badge > 9 ? '9+' : item.badge}
                  </Badge>
                )}

                {/* Tooltip */}
                <div
                  className={cn(
                    'absolute whitespace-nowrap px-2 py-1 rounded text-xs',
                    'bg-black/80 text-white/90 opacity-0 group-hover:opacity-100',
                    'transition-opacity pointer-events-none',
                    corner === 'top-left' ? 'left-full ml-2' : 'right-full mr-2'
                  )}
                >
                  {item.label}
                </div>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    );
  };

  // Render utility panel for LEFT side (above main left panel)
  const renderLeftUtilityPanel = (
    items: HUDItem[],
    isVisible: boolean
  ) => {
    if (items.length === 0) return null;

    return (
      <AnimatePresence>
        {isVisible && (
          <motion.div
            className={cn(
              'neural-hud-utility glass-2120 p-2',
              'flex flex-col space-y-2 items-center',
              'rounded-r-xl',
              className
            )}
            data-position="utility-left"
            initial={{ 
              opacity: 0,
              x: -100,
            }}
            animate={{ 
              opacity: 1,
              x: 0,
            }}
            exit={{ 
              opacity: 0,
              x: -100,
            }}
            transition={{
              type: 'spring',
              stiffness: 400,
              damping: 30,
            }}
            style={{
              position: 'fixed',
              left: 0,
              top: '25%',
              transform: 'translateY(-50%)',
              zIndex: 9997,
              pointerEvents: 'auto',
            }}
          >
            {items.map((item) => (
              <motion.button
                key={item.id}
                className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center',
                  'bg-white/5 hover:bg-white/10 transition-colors',
                  'border border-white/10 hover:border-omega-cyan/30',
                  'group relative'
                )}
                onClick={item.onClick}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <item.icon className={cn('w-3 h-3', item.color || 'text-white/70')} />
                
                {/* Tooltip */}
                <div className={cn(
                  'absolute whitespace-nowrap px-2 py-1 rounded text-xs',
                  'bg-black/80 text-white/90 opacity-0 group-hover:opacity-100',
                  'transition-opacity pointer-events-none',
                  'left-full ml-2',
                )}>
                  {item.label}
                </div>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    );
  };

  // Render Feed Selector Panel - attached to left border like the right-side HUD
  const renderFeedSelectorPanel = (
    items: HUDItem[],
    isVisible: boolean
  ) => {
    if (items.length === 0) return null;

    return (
      <AnimatePresence>
        {isVisible && (
          <motion.div
            className={cn(
              'neural-hud-feed-selector glass-2120 p-2',
              'flex flex-col space-y-2 items-center',
              'rounded-r-xl border-l-2 border-omega-cyan/50',
              className
            )}
            data-position="feed-selector"
            initial={{ 
              opacity: 0,
              x: -100,
            }}
            animate={{ 
              opacity: 1,
              x: 0,
            }}
            exit={{ 
              opacity: 0,
              x: -100,
            }}
            transition={{
              type: 'spring',
              stiffness: 400,
              damping: 30,
            }}
            style={{
              position: 'fixed',
              top: '15%',
              left: 0,
              zIndex: 9998,
              pointerEvents: 'auto',
            }}
          >
            {items.map((item) => (
              <motion.button
                key={item.id}
                className={cn(
                  'w-9 h-9 rounded-lg flex items-center justify-center',
                  'bg-white/5 hover:bg-white/15 transition-colors',
                  'border border-white/10 hover:border-omega-cyan/30',
                  'group relative'
                )}
                onClick={item.onClick}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <item.icon className={cn('w-3 h-3', item.color || 'text-white/70')} />
                
                {/* Tooltip */}
                <div className={cn(
                  'absolute whitespace-nowrap px-2 py-1 rounded text-xs',
                  'bg-black/80 text-white/90 opacity-0 group-hover:opacity-100',
                  'transition-opacity pointer-events-none',
                  'left-full ml-2',
                )}>
                  {item.label}
                </div>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    );
  };

  // Render utility panel for RIGHT side (above main right panel - compact auto-scroll)
  const renderRightUtilityPanel = (
    items: HUDItem[],
    isVisible: boolean
  ) => {
    if (items.length === 0) return null;

    return (
      <AnimatePresence>
        {isVisible && (
          <motion.div
            className={cn(
              'neural-hud-utility p-0.5',
              'flex flex-col items-center',
              'rounded-l-sm bg-background/20 backdrop-blur-sm',
              className
            )}
            data-position="utility-right"
            initial={{ 
              opacity: 0,
              x: 50,
            }}
            animate={{ 
              opacity: 1,
              x: 0,
            }}
            exit={{ 
              opacity: 0,
              x: 50,
            }}
            transition={{
              type: 'spring',
              stiffness: 400,
              damping: 30,
            }}
            style={{
              position: 'fixed',
              right: 0,
              top: '20%',
              zIndex: 9997,
              pointerEvents: 'auto',
            }}
          >
            {items.map((item) => (
              <motion.button
                key={item.id}
                className={cn(
                  'w-4 h-4 rounded flex items-center justify-center',
                  'bg-transparent hover:bg-white/10 transition-colors',
                  'group relative'
                )}
                onClick={item.onClick}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <item.icon className={cn('w-2.5 h-2.5', item.color || 'text-white/70')} />
                
                {/* Tooltip */}
                <div className={cn(
                  'absolute whitespace-nowrap px-1 py-0.5 rounded text-[9px]',
                  'bg-black/80 text-white/90 opacity-0 group-hover:opacity-100',
                  'transition-opacity pointer-events-none',
                  'right-full mr-1',
                )}>
                  {item.label}
                </div>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    );
  };

  // Check if mouse is near corners - expanded top-left zone for feed selector
  const isNearTopLeft = mousePosition.x <= edgeThreshold * 2 && mousePosition.y <= edgeThreshold * 2;
  const isNearTopRight = mousePosition.x >= window.innerWidth - edgeThreshold && mousePosition.y <= edgeThreshold;

  return (
    <>
      {renderEdgePanel('left', leftItems, hoveredZone === 'left-main')}
      {renderEdgePanel('right', rightItems, hoveredZone === 'right-main')}
      {renderEdgePanel('top', topItems, visibleEdge === 'top')}
      {renderEdgePanel('bottom', bottomItems, visibleEdge === 'bottom')}
      
      {/* Left utility panel (admin controls) */}
      {renderLeftUtilityPanel(utilityLeftItems, hoveredZone === 'left-utility')}
      
      {/* Right utility panel (compact auto-scroll, above Sovereign Control) */}
      {renderRightUtilityPanel(utilityRightItems, hoveredZone === 'right-utility')}
      
      {/* Feed Selector Panel (top-left corner) */}
      {renderFeedSelectorPanel(topLeftItems, isNearTopLeft)}
      
      {/* Corner HUD panels - skip top-left since feed selector handles it */}
      {renderCornerPanel('top-right', topRightItems, hoveredZone === 'right-top')}
      
      {/* Edge proximity indicators */}
      {['left', 'right', 'top', 'bottom'].map((edge) => (
        <motion.div
          key={edge}
          className={cn(
            'fixed pointer-events-none',
            edge === 'left' && 'left-0 top-0 bottom-0 w-1',
            edge === 'right' && 'right-0 top-0 bottom-0 w-1',
            edge === 'top' && 'top-0 left-0 right-0 h-1',
            edge === 'bottom' && 'bottom-0 left-0 right-0 h-1',
          )}
          style={{
            background: visibleEdge === edge 
              ? 'linear-gradient(to right, hsla(185, 100%, 50%, 0.5), transparent)'
              : 'transparent',
            zIndex: 9996,
          }}
          animate={{
            opacity: visibleEdge === edge ? 1 : 0,
          }}
          transition={{ duration: 0.2 }}
        />
      ))}
    </>
  );
};

export default NeuralHUD;
