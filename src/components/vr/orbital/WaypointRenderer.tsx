/**
 * WAYPOINT RENDERER - AR-Style Glowing Path
 * 
 * Draws a glowing line on the "floor" leading the user
 * to their objective in AR/VR style.
 */

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ViewLevel, CameraPosition } from '@/hooks/useOrbitalNavigation';
import { cn } from '@/lib/utils';

interface WaypointRendererProps {
  from: CameraPosition;
  to: { x: number; y: number; z: number };
  viewLevel: ViewLevel;
  color?: string;
  className?: string;
}

export const WaypointRenderer: React.FC<WaypointRendererProps> = ({
  from,
  to,
  viewLevel,
  color = 'fuchsia',
  className
}) => {
  // Only show in ground/immersive views
  if (viewLevel === 'exosphere' || viewLevel === 'stratosphere') {
    return null;
  }

  // Calculate path points for the AR line
  const pathData = useMemo(() => {
    const dx = to.x - from.x;
    const dz = to.z - from.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    const numPoints = Math.min(20, Math.max(5, Math.floor(distance / 10)));
    
    const points = [];
    for (let i = 0; i <= numPoints; i++) {
      const t = i / numPoints;
      points.push({
        x: from.x + dx * t,
        z: from.z + dz * t,
        // Add slight wave for visual interest
        offset: Math.sin(t * Math.PI * 4) * 2
      });
    }
    
    return { points, distance };
  }, [from.x, from.z, to.x, to.z]);

  // Convert world coords to screen position (simplified 2D projection)
  const projectToScreen = (x: number, z: number, offset: number) => {
    // Center of screen as origin, scale based on distance
    const relX = (x - from.x) * 0.5;
    const relZ = (z - from.z) * 0.3;
    
    return {
      x: 50 + relX + offset,
      y: 70 - relZ // Invert and offset to appear on "floor"
    };
  };

  const colorClasses = {
    fuchsia: {
      stroke: '#d946ef',
      glow: 'drop-shadow-[0_0_10px_rgba(217,70,239,0.8)]',
      particle: 'bg-fuchsia-400'
    },
    cyan: {
      stroke: '#22d3ee',
      glow: 'drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]',
      particle: 'bg-cyan-400'
    }
  };

  const colors = colorClasses[color as keyof typeof colorClasses] || colorClasses.fuchsia;

  return (
    <div className={cn("fixed inset-0 pointer-events-none z-30", className)}>
      {/* SVG Path Line */}
      <svg className="absolute inset-0 w-full h-full">
        <defs>
          {/* Gradient for the line */}
          <linearGradient id="waypointLineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(217,70,239,0.2)" />
            <stop offset="50%" stopColor="rgba(217,70,239,0.8)" />
            <stop offset="100%" stopColor="rgba(217,70,239,0.2)" />
          </linearGradient>
          
          {/* Glow filter */}
          <filter id="waypointGlow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Main path line */}
        <motion.path
          d={pathData.points.map((p, i) => {
            const screen = projectToScreen(p.x, p.z, p.offset);
            return `${i === 0 ? 'M' : 'L'} ${screen.x}% ${screen.y}%`;
          }).join(' ')}
          fill="none"
          stroke={colors.stroke}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray="10 10"
          filter="url(#waypointGlow)"
          className={cn(colors.glow, "animate-gpu-dash-march")}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ pathLength: { duration: 1 } }}
        />

        {/* Outer glow line */}
        <motion.path
          d={pathData.points.map((p, i) => {
            const screen = projectToScreen(p.x, p.z, p.offset);
            return `${i === 0 ? 'M' : 'L'} ${screen.x}% ${screen.y}%`;
          }).join(' ')}
          fill="none"
          stroke={colors.stroke}
          strokeWidth="8"
          strokeLinecap="round"
          strokeOpacity="0.2"
          filter="url(#waypointGlow)"
        />
      </svg>

      {/* Animated particles along path - GPU accelerated */}
      {pathData.points.filter((_, i) => i % 3 === 0).map((point, i) => {
        const screen = projectToScreen(point.x, point.z, point.offset);
        return (
          <div
            key={i}
            className={cn(
              "absolute w-2 h-2 rounded-full animate-gpu-pulse-scale",
              colors.particle
            )}
            style={{
              left: `${screen.x}%`,
              top: `${screen.y}%`,
              transform: 'translate(-50%, -50%)',
              animationDelay: `${i * 0.2}s`,
            }}
          />
        );
      })}

      {/* Destination marker */}
      <motion.div
        className="absolute"
        style={{
          left: `${projectToScreen(to.x, to.z, 0).x}%`,
          top: `${projectToScreen(to.x, to.z, 0).y}%`,
          transform: 'translate(-50%, -50%)'
        }}
      >
        {/* Outer ring - CSS animation */}
        <div className="absolute inset-0 w-12 h-12 -m-6 border-2 border-fuchsia-400 rounded-full animate-gpu-ring-pulse" />
        
        {/* Inner ring - CSS animation */}
        <div
          className="w-8 h-8 -m-4 border-2 border-fuchsia-400 rounded-full bg-fuchsia-400/20 animate-gpu-spin-3s"
          style={{
            boxShadow: '0 0 20px rgba(217,70,239,0.5)'
          }}
        />
        
        {/* Center dot - CSS animation */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-fuchsia-400 rounded-full animate-gpu-pulse-scale" />
      </motion.div>

      {/* Distance indicator */}
      <motion.div
        className="absolute bg-background/80 backdrop-blur px-3 py-1 rounded-full border border-accent/30"
        style={{
          left: `${projectToScreen(to.x, to.z, 0).x}%`,
          top: `calc(${projectToScreen(to.x, to.z, 0).y}% + 40px)`,
          transform: 'translate(-50%, 0)'
        }}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <span className="text-xs font-bold text-fuchsia-400">
          {pathData.distance > 1000 
            ? `${(pathData.distance / 1000).toFixed(1)} km`
            : `${pathData.distance.toFixed(0)} m`
          }
        </span>
      </motion.div>
    </div>
  );
};

export default WaypointRenderer;
