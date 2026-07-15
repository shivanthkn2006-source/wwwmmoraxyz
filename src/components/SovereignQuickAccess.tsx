import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap } from 'lucide-react';
import { useDevMode } from '@/components/security/DevModeContext';
// SmartFeatureRecommendations banner removed per user request.

export const SovereignQuickAccess = () => {
  const { isAdmin } = useDevMode();
  const [isHovered, setIsHovered] = useState(false);
  const [hideTimeout, setHideTimeout] = useState<NodeJS.Timeout | null>(null);

  const handleMouseEnter = useCallback(() => {
    if (hideTimeout) {
      clearTimeout(hideTimeout);
      setHideTimeout(null);
    }
    setIsHovered(true);
  }, [hideTimeout]);

  const handleMouseLeave = useCallback(() => {
    const timeout = setTimeout(() => {
      setIsHovered(false);
    }, 300);
    setHideTimeout(timeout);
  }, []);

  const handleSovereignClick = () => {
    window.dispatchEvent(new CustomEvent('open-admin-toolbar'));
  };

  return (
    <div 
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Sovereign Controls Button - Slides in from left */}
      <AnimatePresence>
        {isHovered && isAdmin && (
          <motion.button
            initial={{ x: -60, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -60, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            onClick={handleSovereignClick}
            className="absolute -left-14 top-1/2 -translate-y-1/2 z-50 
                       w-11 h-11 rounded-xl
                       bg-background/80 backdrop-blur-md border border-border/50
                       flex items-center justify-center
                       shadow-lg hover:shadow-xl hover:scale-105
                       transition-all duration-200
                       group"
            title="Sovereign Controls"
          >
            <Zap className="h-5 w-5 text-purple-400 group-hover:text-purple-300 transition-colors" />
            
            {/* Glow effect */}
            <div className="absolute inset-0 rounded-xl bg-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Smart Recommendations banner removed */}
    </div>
  );
};
