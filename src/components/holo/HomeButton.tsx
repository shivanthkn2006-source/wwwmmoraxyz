// ═══════════════════════════════════════════════════════════════════════════════
// HOME BUTTON - Simple navigation back to home from non-home pages
// Shows on all protected pages except home, replacing full HUD navigation
// ═══════════════════════════════════════════════════════════════════════════════

import React from 'react';
import { motion } from 'framer-motion';
import { Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface HomeButtonProps {
  className?: string;
}

export const HomeButton: React.FC<HomeButtonProps> = ({ className }) => {
  const navigate = useNavigate();

  return (
    <motion.button
      className={cn(
        'fixed bottom-24 left-4 z-50',
        'w-12 h-12 rounded-xl',
        'bg-background/90 backdrop-blur-md',
        'border-2 border-primary/30 hover:border-primary',
        'flex items-center justify-center',
        'shadow-lg shadow-primary/20',
        'group transition-all duration-300',
        'hover:bg-primary/20',
        className
      )}
      onClick={() => navigate('/home')}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    >
      <Home className="w-5 h-5 text-primary group-hover:text-primary" />
      
      {/* Tooltip - appears on right side on hover */}
      <div className={cn(
        'absolute left-full ml-3 whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium',
        'bg-background/95 backdrop-blur-md text-foreground',
        'border border-primary/30',
        'opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0',
        'transition-all duration-200 pointer-events-none',
        'shadow-lg shadow-primary/10'
      )}>
        Back to Home
      </div>
    </motion.button>
  );
};

export default HomeButton;
