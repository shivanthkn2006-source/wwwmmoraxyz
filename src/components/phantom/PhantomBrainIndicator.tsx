// ═══════════════════════════════════════════════════════════════════════════════
// PHANTOM BRAIN INDICATOR
// Visual indicator showing SSM local processing status
// ═══════════════════════════════════════════════════════════════════════════════

import React, { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Cpu, Cloud, Zap, Battery, Wifi } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePhantomBrain } from '@/hooks/usePhantomBrain';

interface PhantomBrainIndicatorProps {
  className?: string;
  showDetails?: boolean;
  compact?: boolean;
}

const PhantomBrainIndicator: React.FC<PhantomBrainIndicatorProps> = ({
  className,
  showDetails = false,
  compact = false,
}) => {
  const { 
    isInitialized, 
    isProcessing, 
    deviceTier, 
    lastLatencyMs,
    batteryImpact,
    getSoulSummary,
  } = usePhantomBrain();
  
  const soulSummary = getSoulSummary();
  
  // Tier colors
  const tierColors = {
    local: 'text-emerald-400',
    hybrid: 'text-cyan-400',
    cloud: 'text-violet-400',
  };
  
  const tierBgColors = {
    local: 'bg-emerald-500/20',
    hybrid: 'bg-cyan-500/20',
    cloud: 'bg-violet-500/20',
  };
  
  const tierIcons = {
    local: <Cpu className="w-3 h-3" />,
    hybrid: <Zap className="w-3 h-3" />,
    cloud: <Cloud className="w-3 h-3" />,
  };
  
  const tierLabels = {
    local: 'Local AI',
    hybrid: 'Hybrid',
    cloud: 'Cloud',
  };
  
  if (!isInitialized && !isProcessing) {
    return null;
  }
  
  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn(
          'flex items-center gap-1 px-2 py-1 rounded-full text-xs',
          tierBgColors[deviceTier],
          tierColors[deviceTier],
          className
        )}
      >
        {tierIcons[deviceTier]}
        <AnimatePresence>
          {isProcessing && (
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: 'auto' }}
              exit={{ width: 0 }}
              className="overflow-hidden"
            >
              <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ repeat: Infinity, duration: 1 }}
                className="px-1"
              >
                •
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'backdrop-blur-xl rounded-lg border border-white/10',
        'bg-gradient-to-br from-black/60 to-black/40',
        'p-3 text-white',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <motion.div
            animate={isProcessing ? { 
              scale: [1, 1.1, 1],
              boxShadow: ['0 0 0px rgba(16, 185, 129, 0.5)', '0 0 10px rgba(16, 185, 129, 0.8)', '0 0 0px rgba(16, 185, 129, 0.5)']
            } : {}}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className={cn(
              'w-6 h-6 rounded-full flex items-center justify-center',
              tierBgColors[deviceTier]
            )}
          >
            <Brain className={cn('w-3.5 h-3.5', tierColors[deviceTier])} />
          </motion.div>
          <div>
            <div className="text-xs font-medium">Phantom Brain</div>
            <div className={cn('text-[10px] opacity-70', tierColors[deviceTier])}>
              {tierLabels[deviceTier]} Mode
            </div>
          </div>
        </div>
        
        {/* Status indicator */}
        <div className={cn(
          'flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px]',
          tierBgColors[deviceTier]
        )}>
          {tierIcons[deviceTier]}
          <span className={tierColors[deviceTier]}>
            {isProcessing ? 'Processing...' : 'Ready'}
          </span>
        </div>
      </div>
      
      {/* Stats */}
      {showDetails && (
        <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-white/10">
          {/* Latency */}
          <div className="text-center">
            <Zap className="w-3 h-3 mx-auto mb-1 text-amber-400" />
            <div className="text-[10px] font-mono">
              {lastLatencyMs.toFixed(0)}ms
            </div>
            <div className="text-[8px] opacity-50">Latency</div>
          </div>
          
          {/* Battery Impact */}
          <div className="text-center">
            <Battery className="w-3 h-3 mx-auto mb-1 text-green-400" />
            <div className="text-[10px] font-mono">
              {(batteryImpact * 100).toFixed(1)}%
            </div>
            <div className="text-[8px] opacity-50">Battery</div>
          </div>
          
          {/* Soul State */}
          <div className="text-center">
            <Wifi className="w-3 h-3 mx-auto mb-1 text-cyan-400" />
            <div className="text-[10px] font-mono">
              {soulSummary.totalObservations}
            </div>
            <div className="text-[8px] opacity-50">Obs</div>
          </div>
        </div>
      )}
      
      {/* Soul Hash */}
      {showDetails && soulSummary.vectorHash && (
        <div className="mt-2 pt-2 border-t border-white/5">
          <div className="flex items-center justify-between">
            <span className="text-[8px] opacity-40">Soul Hash</span>
            <code className="text-[8px] font-mono text-cyan-400/70">
              0x{soulSummary.vectorHash}
            </code>
          </div>
        </div>
      )}
      
      {/* Cost Indicator */}
      <div className="mt-2 flex items-center justify-center">
        <div className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[9px]">
          {deviceTier === 'local' ? '💚 $0.00 Cost' : deviceTier === 'hybrid' ? '⚡ Minimal Cost' : '☁️ Cloud Cost'}
        </div>
      </div>
    </motion.div>
  );
};

export default memo(PhantomBrainIndicator);
