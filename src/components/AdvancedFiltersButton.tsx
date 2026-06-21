import { motion } from 'framer-motion';
import { SlidersHorizontal, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdvancedFiltersButtonProps {
  isOpen: boolean;
  onClick: () => void;
}

export const AdvancedFiltersButton = ({ isOpen, onClick }: AdvancedFiltersButtonProps) => {
  return (
    <motion.button
      onClick={onClick}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.3, type: 'spring', damping: 15 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="relative group"
      title="Advanced Filters"
    >
      {/* Outer glow ring */}
      <div className={cn("absolute inset-0 rounded-2xl", isOpen && "animate-gpu-glow-primary")} />

      {/* Main button */}
      <div
        className="relative w-12 h-12 rounded-2xl overflow-hidden backdrop-blur-xl border transition-all duration-300"
        style={{
          background: isOpen
            ? 'linear-gradient(135deg, hsl(var(--primary) / 0.3) 0%, hsl(var(--accent) / 0.2) 100%)'
            : 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)',
          borderColor: isOpen ? 'hsl(var(--primary) / 0.5)' : 'rgba(255, 255, 255, 0.1)',
          boxShadow: isOpen
            ? '0 8px 32px hsl(var(--primary) / 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
            : '0 4px 16px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        }}
      >
        {/* Animated background gradient */}
        <motion.div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{
            background: 'linear-gradient(135deg, hsl(var(--primary) / 0.2) 0%, hsl(var(--accent) / 0.15) 100%)',
          }}
        />

        {/* Sparkle effect */}
        {isOpen && (
          <div className="absolute -top-1 -right-1 animate-gpu-spin-3s">
            <Sparkles className="w-4 h-4 text-primary drop-shadow-[0_0_8px_hsl(var(--primary))]" />
          </div>
        )}

        {/* Icon container */}
        <div className="relative h-full flex items-center justify-center">
          <motion.div
            animate={{
              rotate: isOpen ? 90 : 0,
            }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <SlidersHorizontal 
              className="w-5 h-5 text-foreground drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]" 
              strokeWidth={2.5}
            />
          </motion.div>
        </div>

        {/* Pulse ring when active */}
        {isOpen && (
          <div
            className="absolute inset-0 rounded-2xl border-2 animate-gpu-ring-scale-pulse"
            style={{
              borderColor: 'hsl(var(--primary) / 0.6)',
            }}
          />
        )}
      </div>

      {/* Status indicator */}
      {isOpen && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-background"
          style={{
            background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%)',
            boxShadow: '0 0 12px hsl(var(--primary) / 0.6)',
          }}
        />
      )}
    </motion.button>
  );
};
