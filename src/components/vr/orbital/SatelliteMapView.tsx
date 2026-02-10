/**
 * SATELLITE MAP VIEW - Real-Time World Overview
 * RESPONSIVE: 4.1" to 95" displays + VR/AR devices
 * 
 * Displays the VR world from orbit with:
 * - Live structure updates
 * - Camera position indicator
 * - Waypoint markers
 * - Clickable POIs
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Satellite, MapPin, Navigation, Building2, Sparkles } from 'lucide-react';
import { CameraPosition, WorldStructure } from '@/hooks/useOrbitalNavigation';
import { useResponsiveVR } from '@/hooks/useResponsiveVR';
import { cn } from '@/lib/utils';

interface SatelliteMapViewProps {
  camera: CameraPosition;
  structures: WorldStructure[];
  activeWaypoint?: { x: number; y: number; z: number } | null;
  onStructureClick?: (structureId: string) => void;
  compact?: boolean;
  className?: string;
}

const STRUCTURE_ICONS: Record<string, React.ReactNode> = {
  castle: <Building2 className="w-full h-full" />,
  tower: <Navigation className="w-full h-full" />,
  portal: <Sparkles className="w-full h-full" />,
  beacon: <MapPin className="w-full h-full" />,
  zone: <div className="w-2 h-2 rounded-full bg-current" />,
  custom: <div className="w-2 h-2 rounded-sm bg-current" />
};

const STRUCTURE_COLORS: Record<string, string> = {
  castle: 'text-amber-400 shadow-amber-400/50',
  tower: 'text-cyan-400 shadow-cyan-400/50',
  portal: 'text-fuchsia-400 shadow-fuchsia-400/50',
  beacon: 'text-emerald-400 shadow-emerald-400/50',
  zone: 'text-blue-400 shadow-blue-400/50',
  custom: 'text-white shadow-white/50'
};

export const SatelliteMapView: React.FC<SatelliteMapViewProps> = ({
  camera,
  structures,
  activeWaypoint,
  onStructureClick,
  compact = false,
  className
}) => {
  const { device, config } = useResponsiveVR();
  const [hoveredStructure, setHoveredStructure] = useState<string | null>(null);
  const [mapRotation, setMapRotation] = useState(0);

  // Auto compact on small screens
  const isCompact = compact || device.isMobile || config.compactMode;

  // Slow rotation effect - reduce on mobile
  useEffect(() => {
    if (device.isMobile) return; // Skip on mobile for performance
    const interval = setInterval(() => {
      setMapRotation(prev => (prev + 0.1) % 360);
    }, 100);
    return () => clearInterval(interval);
  }, [device.isMobile]);

  // Convert world position to map position (normalized 0-100)
  const worldToMap = (x: number, z: number) => {
    const scale = 0.01;
    return {
      x: 50 + x * scale,
      y: 50 + z * scale
    };
  };

  const cameraMapPos = worldToMap(camera.x, camera.z);
  const waypointMapPos = activeWaypoint ? worldToMap(activeWaypoint.x, activeWaypoint.z) : null;

  // Responsive sizes
  const mapSize = isCompact 
    ? 'w-32 h-32 sm:w-36 sm:h-36' 
    : device.isTV 
      ? 'w-80 h-80' 
      : 'w-48 h-48 md:w-56 md:h-56 lg:w-64 lg:h-64';

  const iconSize = isCompact ? 'w-2.5 h-2.5' : 'w-3 h-3';
  const textSize = isCompact ? 'text-[7px]' : 'text-[9px]';

  return (
    <motion.div
      className={cn(
        "relative bg-black/90 backdrop-blur-xl border border-cyan-500/30 rounded-xl overflow-hidden",
        mapSize,
        className
      )}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className={cn(
        "absolute top-0 left-0 right-0 z-20 flex items-center gap-1 bg-black/60 border-b border-cyan-500/20",
        isCompact ? "px-1.5 py-0.5" : "px-2 py-1"
      )}>
        <Satellite className={cn(iconSize, "text-cyan-400")} />
        <span className={cn("font-bold text-white/80 uppercase tracking-wider", textSize)}>
          {isCompact ? 'MAP' : 'Orbital View'}
        </span>
        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400 animate-gpu-status-green" />
      </div>

      {/* Map Area */}
      <div className={cn("absolute inset-0", isCompact ? "top-5" : "top-6")}>
        {/* Grid Background */}
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `radial-gradient(circle, rgba(0,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: isCompact ? '15px 15px' : '30px 30px'
          }}
        />

        {/* Rotation indicator ring - hide on mobile */}
        {!device.isMobile && (
          <motion.div
            className="absolute inset-4 border border-dashed border-cyan-500/20 rounded-full"
            style={{ rotate: mapRotation }}
          />
        )}

        {/* Center crosshair */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <div className={cn("bg-white/20", isCompact ? "w-2 h-[1px]" : "w-4 h-[1px]")} />
          <div className={cn(
            "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white/20",
            isCompact ? "w-[1px] h-2" : "w-[1px] h-4"
          )} />
        </div>

        {/* Waypoint line - GPU Accelerated */}
        {waypointMapPos && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            <line
              x1={`${cameraMapPos.x}%`}
              y1={`${cameraMapPos.y}%`}
              x2={`${waypointMapPos.x}%`}
              y2={`${waypointMapPos.y}%`}
              stroke="url(#waypointGradient)"
              strokeWidth={isCompact ? "1" : "2"}
              strokeDasharray="4 4"
              className="animate-gpu-dash-march"
            />
            <defs>
              <linearGradient id="waypointGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(6, 182, 212, 0.8)" />
                <stop offset="100%" stopColor="rgba(217, 70, 239, 0.8)" />
              </linearGradient>
            </defs>
          </svg>
        )}

        {/* Structures */}
        {structures.map(structure => {
          const pos = worldToMap(structure.position.x, structure.position.z);
          const isHovered = hoveredStructure === structure.id;
          
          return (
            <motion.div
              key={structure.id}
              className={cn(
                "absolute cursor-pointer transition-all z-10",
                STRUCTURE_COLORS[structure.type] || STRUCTURE_COLORS.custom,
                iconSize
              )}
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                transform: 'translate(-50%, -50%)',
                minWidth: config.minTouchTarget / 2,
                minHeight: config.minTouchTarget / 2
              }}
              onMouseEnter={() => setHoveredStructure(structure.id)}
              onMouseLeave={() => setHoveredStructure(null)}
              onTouchStart={() => setHoveredStructure(structure.id)}
              onClick={() => onStructureClick?.(structure.id)}
              whileHover={{ scale: 1.5 }}
              animate={isHovered ? { scale: 1.3 } : { scale: 1 }}
            >
              <div className="relative">
                <motion.div className="shadow-lg">
                  {STRUCTURE_ICONS[structure.type] || STRUCTURE_ICONS.custom}
                </motion.div>

                {/* Tooltip - only on non-compact */}
                {!isCompact && (
                  <AnimatePresence>
                    {isHovered && (
                      <motion.div
                        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 
                                   bg-black/90 border border-white/20 rounded text-[8px] text-white 
                                   whitespace-nowrap z-30"
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                      >
                        {structure.name}
                      </motion.div>
                    )}
                  </AnimatePresence>
                )}
              </div>
            </motion.div>
          );
        })}

        {/* Active Waypoint */}
        {waypointMapPos && (
          <motion.div
            className="absolute z-20"
            style={{
              left: `${waypointMapPos.x}%`,
              top: `${waypointMapPos.y}%`,
              transform: 'translate(-50%, -50%)'
            }}
          >
            <div
              className={cn(
                "border-2 border-fuchsia-400 rounded-full animate-gpu-ring-scale-pulse",
                isCompact ? "w-3 h-3" : "w-4 h-4"
              )}
            />
          </motion.div>
        )}

        {/* Camera Position Indicator */}
        <motion.div
          className="absolute z-30"
          style={{
            left: `${cameraMapPos.x}%`,
            top: `${cameraMapPos.y}%`,
            transform: 'translate(-50%, -50%)'
          }}
        >
          <motion.div className="relative" style={{ rotate: camera.yaw }}>
            {/* Camera FOV cone - simplified on compact */}
            {!isCompact && (
              <svg width="24" height="24" viewBox="0 0 24 24" className="absolute -top-3 -left-3">
                <path
                  d="M12 12 L6 2 L18 2 Z"
                  fill="rgba(6, 182, 212, 0.3)"
                  stroke="rgba(6, 182, 212, 0.8)"
                  strokeWidth="1"
                />
              </svg>
            )}
            
            {/* Camera dot - GPU Accelerated */}
            <div
              className={cn(
                "bg-cyan-400 rounded-full shadow-lg shadow-cyan-400/50 animate-gpu-glow-cyan",
                isCompact ? "w-2 h-2" : "w-3 h-3"
              )}
            />
          </motion.div>
        </motion.div>
      </div>

      {/* Coordinate Display - hide on compact */}
      {!isCompact && (
        <div className="absolute bottom-1 left-1 right-1 flex justify-between text-[8px] text-white/40 font-mono">
          <span>X: {camera.x.toFixed(0)}</span>
          <span>Z: {camera.z.toFixed(0)}</span>
        </div>
      )}
    </motion.div>
  );
};

export default SatelliteMapView;
