import React from 'react';
import { motion } from 'framer-motion';
import type { Threshold } from '@/data/universalTimelineData';
import { cn } from '@/lib/utils';

interface TimelineThresholdNodeProps {
  threshold: Threshold;
  onClick: () => void;
  zoomLevel: number;
}

/**
 * Helper to determine era based on threshold ID
 */
const getEraFromThreshold = (id: number): string => {
  if (id <= 2) return 'early-universe';
  if (id <= 5) return 'life';
  if (id <= 8) return 'human';
  if (id === 9) return 'digital';
  return 'future';
};

/**
 * Memoized threshold node component for performance
 */
export const TimelineThresholdNode = React.memo<TimelineThresholdNodeProps>(({ 
  threshold, 
  onClick, 
  zoomLevel 
}) => {
  const era = getEraFromThreshold(threshold.id);
  
  return (
    <motion.div
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={cn(
        "cursor-pointer group relative flex flex-col items-center",
        "min-w-[140px]"
      )}
      style={{ transform: `scale(${zoomLevel})` }}
    >
      <div 
        className={cn(
          "w-20 h-20 rounded-full flex items-center justify-center",
          "border-4 shadow-2xl transition-all duration-300",
          "group-hover:shadow-[0_0_30px_rgba(255,255,255,0.5)]"
        )}
        style={{
          backgroundColor: `hsl(${threshold.color})`,
          borderColor: `hsl(${threshold.glowColor})`,
          boxShadow: `0 0 20px hsl(${threshold.glowColor} / 0.4), inset 0 0 10px hsl(${threshold.glowColor} / 0.2)`
        }}
      >
        <span className="text-3xl filter drop-shadow-lg">{threshold.icon}</span>
      </div>
      
      <div className="mt-3 text-center">
        <p className="text-sm font-bold text-white/90 drop-shadow-lg">
          {threshold.name}
        </p>
        <p className="text-xs text-white/70 font-mono">
          {threshold.displayTime}
        </p>
      </div>
    </motion.div>
  );
});

TimelineThresholdNode.displayName = 'TimelineThresholdNode';
