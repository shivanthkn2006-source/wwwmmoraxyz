/**
 * ORBITAL COMMAND - Main Container for God View System
 * RESPONSIVE: 4.1" to 95" displays + VR/AR devices
 * 
 * Integrates:
 * - Satellite Map View (Exosphere)
 * - Story Mode HUD
 * - Dynamic Waypoints
 * - Real-time Structure Updates
 */

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Satellite, Globe, Eye, User, Map, 
  ZoomIn, ZoomOut, Play, Pause, Menu, X
} from 'lucide-react';
import { useOrbitalNavigation, ViewLevel, WorldStructure } from '@/hooks/useOrbitalNavigation';
import { useResponsiveVR } from '@/hooks/useResponsiveVR';
import SatelliteMapView from './SatelliteMapView';
import StoryModeHUD from './StoryModeHUD';
import WaypointRenderer from './WaypointRenderer';
import { cn } from '@/lib/utils';

interface OrbitalCommandProps {
  onLevelChange?: (level: ViewLevel) => void;
  onStructureSelect?: (structure: WorldStructure) => void;
  className?: string;
}

const VIEW_ICONS: Record<ViewLevel, React.ReactNode> = {
  exosphere: <Satellite className="w-full h-full" />,
  stratosphere: <Globe className="w-full h-full" />,
  ground: <Eye className="w-full h-full" />,
  immersive: <User className="w-full h-full" />
};

const VIEW_LABELS: Record<ViewLevel, string> = {
  exosphere: 'Satellite View',
  stratosphere: 'Aerial Drone',
  ground: 'Third Person',
  immersive: 'First Person VR'
};

// Short labels for compact mode
const VIEW_LABELS_SHORT: Record<ViewLevel, string> = {
  exosphere: 'SAT',
  stratosphere: 'AIR',
  ground: '3RD',
  immersive: 'VR'
};

export const OrbitalCommand: React.FC<OrbitalCommandProps> = ({
  onLevelChange,
  onStructureSelect,
  className
}) => {
  const orbital = useOrbitalNavigation();
  const { device, config } = useResponsiveVR();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(!device.isMobile);
  const [showMiniMap, setShowMiniMap] = useState(!device.isMobile);
  const [showControls, setShowControls] = useState(true);

  // Auto-collapse on mobile landscape
  useEffect(() => {
    if (device.isMobile && device.orientation === 'landscape') {
      setIsExpanded(false);
    }
  }, [device.isMobile, device.orientation]);

  // Handle scroll for zoom
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      orbital.handleScroll(e.deltaY);
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [orbital.handleScroll]);

  // Notify parent of level changes
  useEffect(() => {
    onLevelChange?.(orbital.viewLevel);
  }, [orbital.viewLevel, onLevelChange]);

  // Get altitude display string
  const getAltitudeDisplay = () => {
    const alt = orbital.altitude;
    if (alt >= 1000) return `${(alt / 1000).toFixed(1)}km`;
    return `${alt.toFixed(0)}m`;
  };

  // Responsive sizes
  const iconSize = config.compactMode ? 'w-3 h-3' : device.isTV ? 'w-6 h-6' : 'w-4 h-4';
  const buttonSize = config.compactMode ? 'p-1.5' : device.isTV ? 'p-4' : 'p-2';
  const textSize = config.compactMode ? 'text-[8px]' : device.isTV ? 'text-base' : 'text-xs';
  const panelPadding = config.compactMode ? 'p-2' : device.isTV ? 'p-6' : 'p-4';
  const gap = config.compactMode ? 'gap-1' : device.isTV ? 'gap-4' : 'gap-2';

  return (
    <div 
      ref={containerRef}
      className={cn(
        "relative w-full h-full bg-black overflow-hidden touch-none",
        className
      )}
    >
      {/* Main View Area - 3D World would render here */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
        {/* Starfield effect for exosphere - reduced on mobile for performance */}
        {orbital.viewLevel === 'exosphere' && (
          <div className="absolute inset-0 overflow-hidden">
            {Array.from({ length: device.isMobile ? 30 : 100 }).map((_, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 bg-white rounded-full animate-gpu-pulse-opacity"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  opacity: Math.random() * 0.8 + 0.2,
                  animationDuration: `${2 + Math.random() * 3}s`,
                  animationDelay: `${Math.random() * 2}s`
                }}
              />
            ))}
          </div>
        )}

        {/* Planet/Ground View */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            scale: Math.max(0.1, 1 - orbital.altitude / 50000),
            opacity: orbital.altitude < 30000 ? 1 : 0.5
          }}
        >
          <div 
            className="relative rounded-full bg-gradient-to-br from-emerald-900 via-blue-900 to-slate-900 shadow-2xl"
            style={{
              width: device.isMobile ? '150%' : '200%',
              height: device.isMobile ? '150%' : '200%'
            }}
          >
            {/* Grid overlay */}
            <div 
              className="absolute inset-0 rounded-full opacity-30"
              style={{
                backgroundImage: `
                  linear-gradient(rgba(0,255,255,0.1) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(0,255,255,0.1) 1px, transparent 1px)
                `,
                backgroundSize: device.isMobile ? '30px 30px' : '50px 50px'
              }}
            />
            
            {/* World structures */}
            {orbital.worldStructures.map(structure => (
              <motion.div
                key={structure.id}
                className="absolute w-4 h-4 cursor-pointer"
                style={{
                  left: `${50 + structure.position.x / 100}%`,
                  top: `${50 + structure.position.z / 100}%`,
                  transform: 'translate(-50%, -50%)'
                }}
                whileHover={{ scale: 1.5 }}
                onClick={() => onStructureSelect?.(structure)}
              >
                <div className="w-full h-full bg-fuchsia-500 rounded-sm shadow-lg shadow-fuchsia-500/50" />
                {!config.compactMode && (
                  <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[8px] text-white whitespace-nowrap">
                    {structure.name}
                  </span>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Toggle Controls Button (Mobile/Compact) */}
      {(device.isMobile || config.compactMode) && (
        <motion.button
          className={cn(
            "absolute top-2 left-2 z-50 bg-black/80 border border-cyan-500/30 rounded-lg",
            buttonSize
          )}
          onClick={() => setShowControls(!showControls)}
          whileTap={{ scale: 0.9 }}
          style={{ minWidth: config.minTouchTarget, minHeight: config.minTouchTarget }}
        >
          {showControls ? <X className={iconSize} /> : <Menu className={iconSize} />}
        </motion.button>
      )}

      {/* Orbital Controls Panel - Responsive */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            className={cn(
              "absolute z-50",
              device.isMobile ? "top-12 left-2 right-2" : "top-4 left-4",
              device.isTV && "top-8 left-8"
            )}
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -100, opacity: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div 
              className={cn(
                "bg-black/80 backdrop-blur-xl border border-cyan-500/30 rounded-xl space-y-2",
                panelPadding,
                gap,
                device.isMobile && !isExpanded && "max-w-fit"
              )}
              style={{ 
                maxWidth: device.isMobile ? (isExpanded ? '100%' : 'auto') : config.panelWidth 
              }}
            >
              {/* Header with expand toggle */}
              <div className="flex items-center justify-between">
                <div className={cn("flex items-center", gap)}>
                  <div className={iconSize}>
                    {VIEW_ICONS[orbital.viewLevel]}
                  </div>
                  {(!config.compactMode || isExpanded) && (
                    <span className={cn("font-bold text-white uppercase tracking-wider", textSize)}>
                      {config.compactMode ? VIEW_LABELS_SHORT[orbital.viewLevel] : VIEW_LABELS[orbital.viewLevel]}
                    </span>
                  )}
                </div>
                {device.isMobile && (
                  <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="text-white/60 hover:text-white"
                  >
                    {isExpanded ? '−' : '+'}
                  </button>
                )}
              </div>

              {/* Altitude Display */}
              {(!device.isMobile || isExpanded) && (
                <div className="text-center">
                  <div className={cn(
                    "font-mono font-bold text-cyan-400",
                    config.compactMode ? "text-lg" : device.isTV ? "text-4xl" : "text-2xl"
                  )}>
                    {getAltitudeDisplay()}
                  </div>
                  <div className={cn("text-white/50 uppercase", textSize)}>Altitude</div>
                </div>
              )}

              {/* Quick Level Buttons - Responsive Grid */}
              {(!device.isMobile || isExpanded) && (
                <div className={cn(
                  "grid gap-1",
                  config.compactMode ? "grid-cols-4" : "grid-cols-2",
                  device.isTV && "grid-cols-4 gap-3"
                )}>
                  {(['exosphere', 'stratosphere', 'ground', 'immersive'] as ViewLevel[]).map(level => (
                    <motion.button
                      key={level}
                      className={cn(
                        "flex items-center justify-center rounded-lg font-medium transition-all",
                        gap,
                        buttonSize,
                        orbital.viewLevel === level
                          ? "bg-cyan-500/20 border border-cyan-500/50 text-cyan-400"
                          : "bg-white/5 border border-white/10 text-white/60 hover:bg-white/10"
                      )}
                      style={{ minHeight: config.minTouchTarget }}
                      onClick={() => orbital.zoomToLevel(level)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      disabled={orbital.isTransitioning}
                    >
                      <div className={iconSize}>{VIEW_ICONS[level]}</div>
                      {!config.compactMode && (
                        <span className={textSize}>{level.slice(0, 4)}</span>
                      )}
                    </motion.button>
                  ))}
                </div>
              )}

              {/* Zoom Controls */}
              {(!device.isMobile || isExpanded) && (
                <div className={cn("flex items-center justify-center", gap)}>
                  <motion.button
                    className={cn(
                      "bg-white/5 border border-white/10 rounded-lg text-white/60 hover:bg-white/10 hover:text-white",
                      buttonSize
                    )}
                    style={{ minWidth: config.minTouchTarget, minHeight: config.minTouchTarget }}
                    onClick={() => orbital.handleScroll(100)}
                    whileTap={{ scale: 0.9 }}
                  >
                    <ZoomOut className={iconSize} />
                  </motion.button>
                  
                  <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden min-w-[40px]">
                    <motion.div
                      className="h-full bg-gradient-to-r from-cyan-500 to-fuchsia-500"
                      style={{ width: `${100 - (orbital.altitude / 500)}%` }}
                    />
                  </div>
                  
                  <motion.button
                    className={cn(
                      "bg-white/5 border border-white/10 rounded-lg text-white/60 hover:bg-white/10 hover:text-white",
                      buttonSize
                    )}
                    style={{ minWidth: config.minTouchTarget, minHeight: config.minTouchTarget }}
                    onClick={() => orbital.handleScroll(-100)}
                    whileTap={{ scale: 0.9 }}
                  >
                    <ZoomIn className={iconSize} />
                  </motion.button>
                </div>
              )}

              {/* Story Mode Toggle */}
              {(!device.isMobile || isExpanded) && (
                <motion.button
                  className={cn(
                    "w-full flex items-center justify-center rounded-lg font-medium transition-all",
                    buttonSize, gap,
                    orbital.storyModeActive
                      ? "bg-fuchsia-500/20 border border-fuchsia-500/50 text-fuchsia-400"
                      : "bg-white/5 border border-white/10 text-white/60 hover:bg-white/10"
                  )}
                  style={{ minHeight: config.minTouchTarget }}
                  onClick={() => orbital.toggleStoryMode()}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {orbital.storyModeActive ? <Pause className={iconSize} /> : <Play className={iconSize} />}
                  {!config.compactMode && <span className={textSize}>Story Mode</span>}
                </motion.button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mini Satellite Map - Responsive positioning */}
      <AnimatePresence>
        {showMiniMap && (
          <motion.div
            className={cn(
              "absolute z-40",
              device.isMobile ? "bottom-16 right-2" : "bottom-4 right-4",
              device.isTV && "bottom-8 right-8"
            )}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
          >
            <SatelliteMapView
              camera={orbital.camera}
              structures={orbital.worldStructures}
              activeWaypoint={orbital.activeWaypoint}
              onStructureClick={(id) => orbital.focusOnStructure(id)}
              compact={device.isMobile || config.compactMode}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Map Toggle */}
      <motion.button
        className={cn(
          "absolute z-50 bg-black/80 border border-white/20 rounded-full",
          buttonSize,
          device.isMobile ? "bottom-16 right-2" : "bottom-4 right-4",
          device.isTV && "bottom-8 right-8"
        )}
        style={{ 
          marginRight: showMiniMap ? (device.isMobile ? '150px' : '180px') : '0px',
          minWidth: config.minTouchTarget,
          minHeight: config.minTouchTarget
        }}
        onClick={() => setShowMiniMap(!showMiniMap)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <Map className={iconSize} />
      </motion.button>

      {/* Story Mode HUD - Only when active */}
      <AnimatePresence>
        {orbital.storyModeActive && (
          <StoryModeHUD
            waypoint={orbital.activeWaypoint}
            camera={orbital.camera}
          />
        )}
      </AnimatePresence>

      {/* Waypoint Renderer */}
      {orbital.storyModeActive && orbital.activeWaypoint && (
        <WaypointRenderer
          from={orbital.camera}
          to={orbital.activeWaypoint}
          viewLevel={orbital.viewLevel}
        />
      )}

      {/* Transition Overlay */}
      <AnimatePresence>
        {orbital.isTransitioning && (
          <motion.div
            className="absolute inset-0 z-60 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 via-transparent to-fuchsia-500/20" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <div
                className={cn(
                  "border-2 border-cyan-400 rounded-full animate-gpu-spin-scale",
                  device.isMobile ? "w-12 h-12" : "w-16 h-16"
                )}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Camera Position Debug (dev mode) - Hidden on mobile */}
      {process.env.NODE_ENV === 'development' && !device.isMobile && (
        <div className={cn("absolute bottom-4 left-4 text-white/40 font-mono", textSize)}>
          X: {orbital.camera.x.toFixed(0)} | 
          Y: {orbital.camera.y.toFixed(0)} | 
          Z: {orbital.camera.z.toFixed(0)} |
          {device.isVR && ' VR'}{device.isAR && ' AR'}
        </div>
      )}
    </div>
  );
};

export default OrbitalCommand;
