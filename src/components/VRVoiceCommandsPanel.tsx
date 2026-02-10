// ═══════════════════════════════════════════════════════════════════════════════
// VR VOICE COMMANDS PANEL - Draggable Compact Glassmorphic Dropdown
// Shows all available voice commands for Zoe VR World
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, 
  ChevronDown, 
  ChevronUp, 
  Move, 
  Car, 
  Plane, 
  Hammer, 
  Wrench, 
  Eye, 
  Cloud, 
  Hand,
  Compass,
  Volume2,
  X,
  GripVertical
} from 'lucide-react';
import { VR_COMMANDS, VRCommand } from '@/hooks/useVRVoiceCommands';
import { cn } from '@/lib/utils';

interface VRVoiceCommandsPanelProps {
  isVisible: boolean;
  onClose?: () => void;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

const CATEGORY_CONFIG = {
  navigation: { icon: Compass, label: 'Open/Exit', color: 'text-blue-400' },
  movement: { icon: Move, label: 'Movement', color: 'text-green-400' },
  action: { icon: Hammer, label: 'Build/Create', color: 'text-amber-400' },
  control: { icon: Eye, label: 'Camera/View', color: 'text-purple-400' },
  environment: { icon: Cloud, label: 'Environment', color: 'text-cyan-400' },
  interaction: { icon: Hand, label: 'Interact', color: 'text-pink-400' }
};

export const VRVoiceCommandsPanel: React.FC<VRVoiceCommandsPanelProps> = ({
  isVisible,
  onClose,
  position = 'top-right'
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const constraintsRef = useRef<HTMLDivElement>(null);
  // Group commands by category
  const groupedCommands = useMemo(() => {
    const groups: Record<string, VRCommand[]> = {};
    VR_COMMANDS.forEach(cmd => {
      if (!groups[cmd.category]) groups[cmd.category] = [];
      groups[cmd.category].push(cmd);
    });
    return groups;
  }, []);

  // Position classes - Avoid overlapping with integrity indicator
  const getInitialPosition = () => {
    switch (position) {
      case 'top-left': return { top: 8, left: 8 };
      case 'top-right': return { top: 40, right: 8 };
      case 'bottom-left': return { bottom: 80, left: 8 };
      case 'bottom-right': return { bottom: 80, right: 8 };
      default: return { top: 40, right: 8 };
    }
  };

  const initialPosition = useMemo(() => getInitialPosition(), [position]);

  const handleClose = () => {
    setIsExpanded(false);
    onClose?.();
  };

  if (!isVisible) return null;

  if (typeof document === 'undefined') return null;

  return createPortal(
    <>
      {/* Drag bounds (prevents "panel disappeared" by dragging off-screen) */}
      <div ref={constraintsRef} className="fixed inset-0 pointer-events-none" />

      <motion.div
        drag={isExpanded}
        dragConstraints={constraintsRef}
        dragMomentum={false}
        dragElastic={0.1}
        whileDrag={{ scale: 1.02, cursor: 'grabbing' }}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="fixed z-[9999] pointer-events-auto"
        style={{ ...initialPosition, touchAction: 'none' }}
      >
        {/* Collapsed Button - Click to Expand */}
        {!isExpanded && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsExpanded(true);
            }}
            className="flex items-center gap-1.5 px-2 py-1 xxs:px-2.5 xxs:py-1.5 xs:px-3 xs:py-2 
                     bg-black/80 backdrop-blur-xl border border-cyan-400/30 rounded-lg
                     text-white hover:bg-black/90 hover:border-cyan-400/50 transition-all shadow-lg pointer-events-auto cursor-pointer"
          >
            <GripVertical className="w-3 h-3 text-white/40" />
            <Mic className="w-3 h-3 xxs:w-3.5 xxs:h-3.5 xs:w-4 xs:h-4 text-cyan-400" />
            <span className="text-[9px] xxs:text-[10px] xs:text-xs sm:text-sm font-semibold">VR Voice</span>
            <ChevronDown className="w-2.5 h-2.5 xxs:w-3 xxs:h-3" />
          </motion.button>
        )}

        {/* Expanded Panel - Draggable with Extended Height */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, y: -10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -10, height: 0 }}
              onPointerDown={(e) => e.stopPropagation()}
              className="bg-black/80 backdrop-blur-2xl border border-white/30 rounded-xl overflow-hidden shadow-2xl
                       w-44 xxs:w-52 xs:w-60 sm:w-72 md:w-80 
                       max-h-72 xxs:max-h-80 xs:max-h-96 sm:max-h-[28rem] 
                       landscape:max-h-48 landscape:xxs:max-h-56 landscape:xs:max-h-64 pointer-events-auto"
            >
              {/* Header with Drag Handle and Close Button */}
              <div className="flex items-center justify-between px-2.5 py-1.5 xxs:px-3 xxs:py-2 
                            border-b border-white/20 bg-gradient-to-r from-purple-500/30 to-cyan-500/30">
                <div className="flex items-center gap-1.5">
                  <GripVertical className="w-3.5 h-3.5 text-white/50" />
                  <Volume2 className="w-3.5 h-3.5 xxs:w-4 xxs:h-4 text-cyan-400 animate-pulse" />
                  <span className="text-[10px] xxs:text-xs xs:text-sm font-bold text-white">VR Voice Commands</span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClose();
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="p-1 hover:bg-white/20 rounded-md transition-colors cursor-pointer"
                  title="Collapse Panel"
                >
                  <X className="w-3.5 h-3.5 xxs:w-4 xxs:h-4 text-white/80 hover:text-white" />
                </button>
              </div>

              {/* Categories - Extended Height - Scrollable */}
              <div
                className="overflow-y-auto max-h-56 xxs:max-h-64 xs:max-h-80 sm:max-h-96 
                             landscape:max-h-36 landscape:xxs:max-h-44 landscape:xs:max-h-52
                             scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent overscroll-contain"
                style={{ touchAction: 'pan-y' }}
              >
                {Object.entries(CATEGORY_CONFIG).map(([category, config]) => {
                  const commands = groupedCommands[category] || [];
                  const Icon = config.icon;
                  const isActive = activeCategory === category;

                  return (
                    <div key={category} className="border-b border-white/10 last:border-0">
                      {/* Category Header - Bigger Text */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveCategory(isActive ? null : category);
                        }}
                        className="w-full flex items-center justify-between px-2.5 py-1.5 xxs:px-3 xxs:py-2 
                                 hover:bg-white/10 transition-colors"
                      >
                        <div className="flex items-center gap-1.5">
                          <Icon className={cn('w-3 h-3 xxs:w-3.5 xxs:h-3.5 xs:w-4 xs:h-4', config.color)} />
                          <span className="text-[9px] xxs:text-[10px] xs:text-xs sm:text-sm font-semibold text-white">
                            {config.label}
                          </span>
                          <span className="text-[8px] xxs:text-[9px] xs:text-[10px] text-white/50">({commands.length})</span>
                        </div>
                        <ChevronDown
                          className={cn(
                            'w-3 h-3 xxs:w-3.5 xxs:h-3.5 text-white/50 transition-transform',
                            isActive && 'rotate-180'
                          )}
                        />
                      </button>

                      {/* Commands List - Bigger Text for Readability */}
                      <AnimatePresence>
                        {isActive && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden bg-white/5"
                          >
                            <div className="px-2 py-1 xxs:px-2.5 xxs:py-1.5 space-y-1">
                              {commands.slice(0, 10).map((cmd, idx) => (
                                <div
                                  key={`${category}-${cmd.action}-${idx}`}
                                  className="flex items-start gap-1.5 px-1.5 py-1 rounded-md hover:bg-white/10 transition-colors"
                                >
                                  <Mic className="w-2.5 h-2.5 xxs:w-3 xxs:h-3 text-cyan-400/70 mt-0.5 flex-shrink-0" />
                                  <div className="min-w-0 flex-1">
                                    <p className="text-[8px] xxs:text-[9px] xs:text-[10px] sm:text-xs text-white font-medium">
                                      "{cmd.description}"
                                    </p>
                                  </div>
                                </div>
                              ))}
                              {commands.length > 10 && (
                                <p className="text-[8px] xxs:text-[9px] xs:text-[10px] text-white/50 text-center py-1">
                                  +{commands.length - 10} more commands
                                </p>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>

              {/* Footer Hint - Bigger Text */}
              <div className="px-2.5 py-1.5 xxs:px-3 xxs:py-2 border-t border-white/20 bg-cyan-500/10">
                <p className="text-[8px] xxs:text-[9px] xs:text-[10px] sm:text-xs text-cyan-400 text-center font-medium">
                  Say "Zoe" + command • e.g. "Zoe walk forward"
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </>,
    document.body
  );
};

export default VRVoiceCommandsPanel;