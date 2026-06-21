// ═══════════════════════════════════════════════════════════════════════════════
// PROTOCOL ATLAS: HUD TOGGLE BUTTON
// Purpose: Floating button to toggle the Atlas/Smith HUD interface
// ═══════════════════════════════════════════════════════════════════════════════

import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { Orbit } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AtlasHUDToggleProps {
  isHUDActive: boolean;
  onToggle: () => void;
  className?: string;
}

export const AtlasHUDToggle: React.FC<AtlasHUDToggleProps> = memo(({
  isHUDActive,
  onToggle,
  className,
}) => {
  return (
    <motion.button
      onClick={onToggle}
      className={cn(
        'fixed z-[9980] w-12 h-12 rounded-full',
        'bg-atlas-void/90 backdrop-blur-sm',
        'border border-atlas-cyan/40 hover:border-atlas-cyan/80',
        'shadow-[0_0_20px_rgba(0,255,255,0.2)]',
        'hover:shadow-[0_0_30px_rgba(0,255,255,0.4)]',
        'transition-all duration-300',
        'flex items-center justify-center',
        'group',
        className
      )}
      style={{ bottom: '6rem', right: '1.5rem' }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 1, duration: 0.3 }}
      title={isHUDActive ? 'Close Atlas HUD' : 'Open Atlas HUD'}
    >
      {/* Outer ring animation */}
      <motion.div
        className="absolute inset-0 rounded-full border border-atlas-cyan/20"
        animate={{ rotate: 360 }}
        transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
      />
      
      {/* Icon */}
      <Orbit 
        className={cn(
          'w-5 h-5 transition-colors duration-300',
          isHUDActive ? 'text-green-400' : 'text-atlas-cyan',
          'group-hover:text-atlas-cyan'
        )} 
      />
      
      {/* Pulse when active */}
      {isHUDActive && (
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-green-400/50"
          animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
      
      {/* Tooltip */}
      <div className="absolute right-full mr-3 px-2 py-1 bg-atlas-void/90 border border-atlas-cyan/30 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
        <span className="text-xs font-share-tech text-atlas-cyan tracking-wider">
          {isHUDActive ? 'CLOSE ATLAS' : 'OPEN ATLAS'}
        </span>
      </div>
    </motion.button>
  );
});

AtlasHUDToggle.displayName = 'AtlasHUDToggle';

export default AtlasHUDToggle;
