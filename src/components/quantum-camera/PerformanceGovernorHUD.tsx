// ═══════════════════════════════════════════════════════════════════════════════
// PERFORMANCE GOVERNOR HUD - Project Coolant Status Display
// Real-time FPS, Memory, and Power Mode visualization
// RESPONSIVE: 4.1" mobile to 16K displays | AUTO-HIDE after 5 seconds
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import {
  Zap,
  Battery,
  Cpu,
  ThermometerSun,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Eye,
  EyeOff,
  GripVertical,
  ChevronUp,
} from 'lucide-react';
import type { PerformanceMetrics, CoolantActions, PowerMode } from '@/hooks/usePerformanceGovernor';

interface PerformanceGovernorHUDProps {
  metrics: PerformanceMetrics;
  coolantActions: CoolantActions;
  isActive: boolean;
  logs: string[];
  onForceMode?: (mode: PowerMode) => void;
  showLogs?: boolean;
}

const PowerModeColors: Record<PowerMode, string> = {
  LOW_POWER: 'text-amber-400',
  BALANCED: 'text-blue-400',
  PERFORMANCE: 'text-green-400',
  ULTRA: 'text-purple-400',
};

const PowerModeBg: Record<PowerMode, string> = {
  LOW_POWER: 'bg-amber-500/20 border-amber-500/30',
  BALANCED: 'bg-blue-500/20 border-blue-500/30',
  PERFORMANCE: 'bg-green-500/20 border-green-500/30',
  ULTRA: 'bg-purple-500/20 border-purple-500/30',
};

// Get warning urgency for mode transitions
const shouldShowWarning = (mode: PowerMode, prevMode: PowerMode | null): boolean => {
  if (!prevMode) return mode === 'LOW_POWER';
  return mode !== prevMode && (mode === 'LOW_POWER' || mode === 'BALANCED');
};

export const PerformanceGovernorHUD: React.FC<PerformanceGovernorHUDProps> = ({
  metrics,
  coolantActions,
  isActive,
  logs,
  onForceMode,
  showLogs = false,
}) => {
  const [isWarningVisible, setIsWarningVisible] = useState(false);
  const [isMinimized, setIsMinimized] = useState(true);
  const [prevPowerMode, setPrevPowerMode] = useState<PowerMode | null>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Show warning banner when power mode changes to LOW_POWER or BALANCED
  useEffect(() => {
    if (!isActive) return;

    const showWarning = shouldShowWarning(metrics.powerMode, prevPowerMode);
    
    if (showWarning || (prevPowerMode === null && metrics.powerMode === 'LOW_POWER')) {
      setIsWarningVisible(true);
      setIsMinimized(false);
      
      // Clear any existing timeout
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
      
      // Auto-hide after 5 seconds
      hideTimeoutRef.current = setTimeout(() => {
        setIsWarningVisible(false);
        setIsMinimized(true);
      }, 5000);
    }

    setPrevPowerMode(metrics.powerMode);

    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, [metrics.powerMode, isActive, prevPowerMode]);

  // Show warning on critical FPS drops
  useEffect(() => {
    if (!isActive) return;
    
    if (metrics.lowFPSDuration >= 3 && !isWarningVisible) {
      setIsWarningVisible(true);
      setIsMinimized(false);
      
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
      
      hideTimeoutRef.current = setTimeout(() => {
        setIsWarningVisible(false);
        setIsMinimized(true);
      }, 5000);
    }
  }, [metrics.lowFPSDuration, isActive, isWarningVisible]);

  if (!isActive) return null;

  const modeColor = PowerModeColors[metrics.powerMode];
  const modeBg = PowerModeBg[metrics.powerMode];

  return (
    <>
      {/* Minimized Indicator Tab - Always visible at top-left when minimized */}
      <AnimatePresence>
        {isMinimized && (
          <motion.button
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -40, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            onClick={() => {
              setIsMinimized(false);
              setIsWarningVisible(true);
              // Auto-hide after 5 seconds
              if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
              hideTimeoutRef.current = setTimeout(() => {
                setIsWarningVisible(false);
                setIsMinimized(true);
              }, 5000);
            }}
            className={`fixed top-0 left-2 sm:left-3 z-[100] px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-b-md border-b border-l border-r backdrop-blur-sm ${modeBg} 
              hover:scale-105 transition-transform cursor-pointer pointer-events-auto
              text-[8px] sm:text-[9px] font-mono flex items-center gap-0.5 sm:gap-1`}
          >
            <Zap className={`w-2 h-2 sm:w-2.5 sm:h-2.5 ${modeColor}`} />
            <span className={`${modeColor} hidden xs:inline`}>
              {metrics.powerMode.replace('_', ' ')}
            </span>
            <span className="text-foreground/60">{metrics.avgFPS.toFixed(0)}</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Full Warning Banner - Slides down from top */}
      <AnimatePresence>
        {isWarningVisible && !isMinimized && (
          <motion.div
            initial={{ y: '-100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '-100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed top-0 left-0 right-0 z-[100] pointer-events-auto"
          >
            {/* Main Warning Card - COMPACT half-size */}
            <div 
              className={`mx-auto max-w-[70vw] sm:max-w-[280px] md:max-w-[320px] rounded-b-md border-b border-l border-r backdrop-blur-md ${modeBg} 
                p-1.5 sm:p-2 shadow-md shadow-black/30`}
            >
              {/* Header with Power Mode */}
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1">
                  <Zap className={`w-2 h-2 sm:w-2.5 sm:h-2.5 ${modeColor}`} />
                  <span className={`text-[7px] sm:text-[8px] font-bold ${modeColor}`}>
                    {metrics.powerMode.replace('_', ' ')}
                  </span>
                  {metrics.isDowngraded && (
                    <span className="text-[6px] sm:text-[7px] text-amber-400 font-mono px-0.5 py-0.5 bg-amber-500/20 rounded animate-gpu-pulse-opacity">
                      OPT
                    </span>
                  )}
                </div>
                
                {/* Minimize button */}
                <button
                  onClick={() => {
                    setIsMinimized(true);
                    setIsWarningVisible(false);
                    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
                  }}
                  className="p-0.5 rounded hover:bg-white/10 transition-colors"
                >
                  <ChevronUp className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-foreground/60" />
                </button>
              </div>

              {/* Metrics Row - COMPACT */}
              <div className="flex flex-wrap gap-1.5 sm:gap-2 text-[6px] sm:text-[7px] font-mono">
                {/* FPS */}
                <div className="flex items-center gap-0.5">
                  <Cpu className="w-2 h-2 text-cyan-400" />
                  <span className={`font-bold ${
                    metrics.avgFPS >= 50 ? 'text-green-400' :
                    metrics.avgFPS >= 25 ? 'text-yellow-400' :
                    'text-red-400'
                  }`}>
                    {metrics.avgFPS.toFixed(0)}
                  </span>
                </div>

                {/* Memory */}
                <div className="flex items-center gap-0.5">
                  <Battery className="w-2 h-2 text-blue-400" />
                  <span className={`font-bold ${
                    metrics.deviceMemoryGB >= 8 ? 'text-green-400' :
                    metrics.deviceMemoryGB >= 4 ? 'text-yellow-400' :
                    'text-red-400'
                  }`}>
                    {metrics.deviceMemoryGB}G
                  </span>
                </div>

                {/* Low FPS Warning */}
                {metrics.lowFPSDuration > 0 && (
                  <div className="flex items-center gap-0.5 text-orange-400">
                    <ThermometerSun className="w-2 h-2" />
                    <span>{metrics.lowFPSDuration.toFixed(1)}s</span>
                    {metrics.lowFPSDuration >= 3 && <span>⚠</span>}
                  </div>
                )}
              </div>

              {/* Feature Status Pills - COMPACT */}
              <div className="mt-1 pt-1 border-t border-white/10 flex flex-wrap gap-0.5">
                <FeatureIndicator
                  enabled={coolantActions.enableQuantumShaders}
                  label="SHD"
                  icon={<Eye className="w-1.5 h-1.5" />}
                  disabledIcon={<EyeOff className="w-1.5 h-1.5" />}
                />
                <FeatureIndicator
                  enabled={coolantActions.voiceMode === 'continuous'}
                  label="P2T"
                  icon={<Mic className="w-1.5 h-1.5" />}
                  disabledIcon={<MicOff className="w-1.5 h-1.5" />}
                />
                <FeatureIndicator
                  enabled={coolantActions.enableAtmosphereGlow}
                  label="GLB"
                  icon={<Volume2 className="w-1.5 h-1.5" />}
                  disabledIcon={<VolumeX className="w-1.5 h-1.5" />}
                />
              </div>

              {/* Auto-hide progress bar */}
              <motion.div
                initial={{ scaleX: 1 }}
                animate={{ scaleX: 0 }}
                transition={{ duration: 5, ease: 'linear' }}
                className="mt-1 h-0.5 bg-gradient-to-r from-cyan-500/50 to-purple-500/50 rounded-full origin-left"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Logs Panel - Only when expanded and logs enabled */}
      <AnimatePresence>
        {showLogs && logs.length > 0 && isWarningVisible && !isMinimized && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-20 left-2 sm:left-4 z-[99] rounded-lg border border-white/10 bg-black/80 backdrop-blur-sm p-2 max-w-[90vw] sm:max-w-xs max-h-32 overflow-y-auto pointer-events-auto"
          >
            <div className="text-[8px] sm:text-[9px] font-mono space-y-0.5 text-foreground/60">
              {logs.slice(-10).map((log, i) => (
                <div key={i} className="truncate">
                  {log}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

// Feature indicator pill - COMPACT sizing
const FeatureIndicator: React.FC<{
  enabled: boolean;
  label: string;
  icon: React.ReactNode;
  disabledIcon: React.ReactNode;
}> = ({ enabled, label, icon, disabledIcon }) => (
  <div
    className={`flex items-center gap-0.5 px-0.5 py-0.5 rounded text-[5px] sm:text-[6px] font-mono ${
      enabled
        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
        : 'bg-red-500/20 text-red-400/60 border border-red-500/20'
    }`}
  >
    {enabled ? icon : disabledIcon}
    <span>{label}</span>
  </div>
);

export default PerformanceGovernorHUD;
