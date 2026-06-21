/**
 * STORY MODE HUD - Quest Log & Holographic Wrist Display
 * RESPONSIVE: 4.1" to 95" displays + VR/AR devices
 * 
 * Features:
 * - Quest log overlay on left wrist position
 * - Active objectives display
 * - Progress tracking
 * - Holographic projection effect
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Target, CheckCircle2, Circle, ChevronRight,
  Sparkles, Navigation, Clock, X
} from 'lucide-react';
import { CameraPosition } from '@/hooks/useOrbitalNavigation';
import { useResponsiveVR } from '@/hooks/useResponsiveVR';
import { cn } from '@/lib/utils';

interface Quest {
  id: string;
  title: string;
  description: string;
  objectives: Objective[];
  isActive: boolean;
  priority: 'main' | 'side' | 'optional';
}

interface Objective {
  id: string;
  text: string;
  completed: boolean;
  progress?: { current: number; total: number };
}

interface StoryModeHUDProps {
  waypoint?: { x: number; y: number; z: number } | null;
  camera: CameraPosition;
  className?: string;
}

const DEMO_QUESTS: Quest[] = [
  {
    id: 'main-1',
    title: 'Protocol: Ready Player One',
    description: 'Initialize the race track system',
    priority: 'main',
    isActive: true,
    objectives: [
      { id: 'obj-1', text: 'Locate the Arena Zone', completed: true },
      { id: 'obj-2', text: 'Activate Track Generator', completed: false },
      { id: 'obj-3', text: 'Complete First Lap', completed: false, progress: { current: 0, total: 3 } }
    ]
  },
  {
    id: 'side-1',
    title: 'Cyberpunk Story Mode',
    description: 'Explore the neon district',
    priority: 'side',
    isActive: false,
    objectives: [
      { id: 'obj-4', text: 'Find the Neon Tower', completed: false },
      { id: 'obj-5', text: 'Meet the AI Guide', completed: false }
    ]
  }
];

export const StoryModeHUD: React.FC<StoryModeHUDProps> = ({
  waypoint,
  camera,
  className
}) => {
  const { device, config } = useResponsiveVR();
  const [quests] = useState<Quest[]>(DEMO_QUESTS);
  const [isExpanded, setIsExpanded] = useState(!device.isMobile);
  const [activeQuest, setActiveQuest] = useState<Quest | null>(DEMO_QUESTS[0]);
  const [isVisible, setIsVisible] = useState(true);

  // Calculate distance and direction to waypoint
  const getWaypointInfo = () => {
    if (!waypoint) return null;
    const dx = waypoint.x - camera.x;
    const dz = waypoint.z - camera.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    const bearing = Math.atan2(dx, dz) * (180 / Math.PI);
    return { distance, bearing };
  };

  const waypointInfo = getWaypointInfo();

  // Responsive sizing
  const isCompact = device.isMobile || config.compactMode;
  const textSize = isCompact ? 'text-[9px]' : device.isTV ? 'text-sm' : 'text-xs';
  const titleSize = isCompact ? 'text-[10px]' : device.isTV ? 'text-base' : 'text-xs';
  const iconSize = isCompact ? 'w-3 h-3' : device.isTV ? 'w-5 h-5' : 'w-4 h-4';
  const padding = isCompact ? 'p-2' : device.isTV ? 'p-6' : 'p-4';
  const gap = isCompact ? 'gap-1' : device.isTV ? 'gap-3' : 'gap-2';

  if (!isVisible) {
    return (
      <motion.button
        className={cn(
          "fixed z-50 bg-background/70 border border-primary/40 rounded-full",
          device.isMobile ? "bottom-20 left-2 p-2" : "bottom-24 left-4 p-3"
        )}
        style={{ minWidth: config.minTouchTarget, minHeight: config.minTouchTarget }}
        onClick={() => setIsVisible(true)}
        whileTap={{ scale: 0.9 }}
      >
        <Sparkles className={iconSize} />
      </motion.button>
    );
  }

  return (
    <motion.div
      className={cn(
        "fixed z-50 pointer-events-auto",
        device.isMobile ? "bottom-16 left-2 right-2" : "bottom-24 left-4",
        device.isTV && "bottom-32 left-8",
        className
      )}
      initial={{ x: -200, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -200, opacity: 0 }}
      transition={{ type: 'spring', damping: 20 }}
    >
      {/* Holographic Container */}
      <div className="relative">
        {/* Holographic glow effect - reduced on mobile */}
        {!device.isMobile && (
          <div className="absolute -inset-2 bg-gradient-to-r from-cyan-500/20 via-fuchsia-500/20 to-cyan-500/20 
                          rounded-2xl blur-xl animate-pulse" />
        )}
        
        {/* Main panel */}
        <motion.div
          className={cn(
            "relative bg-background/70 backdrop-blur-xl border border-primary/40 rounded-xl overflow-hidden",
            device.isMobile ? "max-w-full" : "min-w-56 max-w-72",
            device.isTV && "min-w-80 max-w-96"
          )}
          style={{
            boxShadow: device.isMobile ? 'none' : '0 0 30px rgba(6, 182, 212, 0.3)'
          }}
        >
          {/* Header */}
          <div className={cn(
            "flex items-center justify-between border-b border-cyan-500/20 bg-cyan-500/10",
            isCompact ? "px-2 py-1.5" : "px-4 py-2"
          )}>
            <div className={cn("flex items-center", gap)}>
              <Sparkles className={cn(iconSize, "text-cyan-400")} />
              <span className={cn("font-bold text-white uppercase tracking-widest", titleSize)}>
                {isCompact ? 'QUEST' : 'Quest Log'}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <motion.button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1 hover:bg-white/10 rounded"
                style={{ minWidth: config.minTouchTarget, minHeight: config.minTouchTarget }}
                whileTap={{ scale: 0.9 }}
              >
                <ChevronRight 
                  className={cn(
                    iconSize,
                    "text-white/60 transition-transform",
                    isExpanded ? "rotate-90" : ""
                  )} 
                />
              </motion.button>
              {device.isMobile && (
                <motion.button
                  onClick={() => setIsVisible(false)}
                  className="p-1 hover:bg-white/10 rounded"
                  style={{ minWidth: config.minTouchTarget, minHeight: config.minTouchTarget }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X className={cn(iconSize, "text-white/60")} />
                </motion.button>
              )}
            </div>
          </div>

          {/* Waypoint Compass */}
          {waypoint && waypointInfo && (
            <motion.div 
              className={cn(
                "flex items-center bg-fuchsia-500/10 border-b border-fuchsia-500/20",
                isCompact ? "px-2 py-1.5 gap-2" : "px-4 py-2 gap-3"
              )}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
            >
              <motion.div style={{ rotate: waypointInfo.bearing - camera.yaw }}>
                <Navigation className={cn(iconSize, "text-fuchsia-400")} />
              </motion.div>
              <div className="flex-1">
                <div className={cn("text-fuchsia-400/80 uppercase", textSize)}>Waypoint</div>
                <div className={cn("font-bold text-white", titleSize)}>
                  {waypointInfo.distance > 1000 
                    ? `${(waypointInfo.distance / 1000).toFixed(1)}km`
                    : `${waypointInfo.distance.toFixed(0)}m`
                  }
                </div>
              </div>
              <div
                className={cn(
                  "rounded-full border-2 border-fuchsia-400/50 flex items-center justify-center animate-gpu-border-color-pulse",
                  isCompact ? "w-6 h-6" : "w-8 h-8"
                )}
              >
                <Target className={iconSize} style={{ color: 'rgb(217,70,239)' }} />
              </div>
            </motion.div>
          )}

          {/* Quest Content */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                {/* Active Quest */}
                {activeQuest && (
                  <div className={cn("border-b border-white/5", padding)}>
                    <div className={cn("flex items-center mb-2", gap)}>
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        activeQuest.priority === 'main' ? 'bg-amber-400' :
                        activeQuest.priority === 'side' ? 'bg-cyan-400' : 'bg-white/40'
                      )} />
                      <span className={cn("font-semibold text-white", titleSize)}>
                        {activeQuest.title}
                      </span>
                    </div>
                    {!isCompact && (
                      <p className={cn("text-white/50 mb-3", textSize)}>
                        {activeQuest.description}
                      </p>
                    )}

                    {/* Objectives */}
                    <div className={cn("space-y-1.5", gap)}>
                      {activeQuest.objectives.slice(0, isCompact ? 2 : undefined).map((obj, idx) => (
                        <motion.div
                          key={obj.id}
                          className={cn("flex items-start", gap)}
                          initial={{ x: -20, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: idx * 0.1 }}
                        >
                          {obj.completed ? (
                            <CheckCircle2 className={cn(iconSize, "text-emerald-400 mt-0.5 flex-shrink-0")} />
                          ) : (
                            <Circle className={cn(iconSize, "text-white/30 mt-0.5 flex-shrink-0")} />
                          )}
                          <div className="flex-1 min-w-0">
                            <span className={cn(
                              "block truncate",
                              textSize,
                              obj.completed ? "text-white/40 line-through" : "text-white/80"
                            )}>
                              {obj.text}
                            </span>
                            {obj.progress && !obj.completed && (
                              <div className={cn("mt-1 flex items-center", gap)}>
                                <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                                  <motion.div
                                    className="h-full bg-gradient-to-r from-cyan-500 to-fuchsia-500"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(obj.progress.current / obj.progress.total) * 100}%` }}
                                  />
                                </div>
                                <span className={cn("text-white/40", textSize)}>
                                  {obj.progress.current}/{obj.progress.total}
                                </span>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Other Quests - hide on compact */}
                {!isCompact && (
                  <div className={padding}>
                    <div className={cn("text-white/30 uppercase tracking-wider mb-2", textSize)}>
                      Other Quests
                    </div>
                    {quests.filter(q => q.id !== activeQuest?.id).slice(0, 2).map(quest => (
                      <motion.button
                        key={quest.id}
                        className={cn(
                          "w-full flex items-center py-1.5 text-left hover:bg-white/5 rounded px-2 -mx-2",
                          gap
                        )}
                        style={{ minHeight: config.minTouchTarget }}
                        onClick={() => setActiveQuest(quest)}
                        whileHover={{ x: 4 }}
                      >
                        <div className={cn(
                          "w-1.5 h-1.5 rounded-full flex-shrink-0",
                          quest.priority === 'main' ? 'bg-amber-400/60' :
                          quest.priority === 'side' ? 'bg-cyan-400/60' : 'bg-white/20'
                        )} />
                        <span className={cn("text-white/50 truncate", textSize)}>{quest.title}</span>
                      </motion.button>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Footer */}
          <div className={cn(
            "flex items-center justify-between bg-black/30 border-t border-white/5",
            isCompact ? "px-2 py-1" : "px-4 py-1.5"
          )}>
            <div className={cn("flex items-center gap-1 text-white/30", textSize)}>
              <Clock className={isCompact ? "w-2.5 h-2.5" : "w-3 h-3"} />
              <span>00:12:34</span>
            </div>
            <div className="flex items-center gap-1">
              <div
                className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-gpu-pulse-opacity"
              />
              <span className={cn("text-white/30", textSize)}>Active</span>
            </div>
          </div>
        </motion.div>

        {/* Wrist attachment - hide on mobile */}
        {!device.isMobile && (
          <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-12 
                          bg-gradient-to-r from-cyan-500/20 to-transparent rounded-l-full" />
        )}
      </div>
    </motion.div>
  );
};

export default StoryModeHUD;
