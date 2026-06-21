import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Rewind, Pause, Play, SkipBack, SkipForward, GripVertical, ChevronUp, ChevronDown } from 'lucide-react';

interface TimelineEvent {
  id: string;
  timestamp: number;
  type: 'user_spoke' | 'item_dropped' | 'emotion_shift' | 'vr_action' | 'system_event';
  label: string;
}

interface TimeManipulationBarProps {
  events?: TimelineEvent[];
  currentTime?: number;
  maxTime?: number;
  onTimeChange?: (time: number) => void;
  onPlayPause?: (isPlaying: boolean) => void;
  isPlaying?: boolean;
}

export const TimeManipulationBar: React.FC<TimeManipulationBarProps> = ({
  events = [],
  currentTime = 30,
  maxTime = 60,
  onTimeChange,
  onPlayPause,
  isPlaying = false,
}) => {
  const [scrubberPosition, setScrubberPosition] = useState((currentTime / maxTime) * 100);
  const [isDragging, setIsDragging] = useState(false);
  const [hitMarker, setHitMarker] = useState(false);
  const [glitchIntensity, setGlitchIntensity] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);

  // Demo events if none provided
  const demoEvents: TimelineEvent[] = events.length > 0 ? events : [
    { id: '1', timestamp: 10, type: 'user_spoke', label: 'Voice Command' },
    { id: '2', timestamp: 25, type: 'emotion_shift', label: 'Mood Change' },
    { id: '3', timestamp: 40, type: 'vr_action', label: 'Teleport' },
    { id: '4', timestamp: 55, type: 'system_event', label: 'System Sync' },
  ];

  const getEventColor = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'user_spoke': return 'bg-cyan-400';
      case 'item_dropped': return 'bg-amber-400';
      case 'emotion_shift': return 'bg-fuchsia-400';
      case 'vr_action': return 'bg-emerald-400';
      case 'system_event': return 'bg-purple-400';
      default: return 'bg-white';
    }
  };

  // Unified handler for mouse and touch
  const handleInteraction = useCallback((clientX: number) => {
    if (!timelineRef.current) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    
    setScrubberPosition(percentage);
    setGlitchIntensity(Math.random() * 5);
    
    const newTime = (percentage / 100) * maxTime;
    onTimeChange?.(newTime);

    // Check if hit a marker
    const tolerance = 5;
    const hitEvent = demoEvents.find(event => {
      const eventPos = (event.timestamp / maxTime) * 100;
      return Math.abs(eventPos - percentage) < tolerance;
    });

    if (hitEvent) {
      setHitMarker(true);
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
      setTimeout(() => setHitMarker(false), 300);
    }

    setTimeout(() => setGlitchIntensity(0), 200);
  }, [maxTime, onTimeChange, demoEvents]);

  const handleTimelineClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    handleInteraction(e.clientX);
  }, [handleInteraction]);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length > 0) {
      handleInteraction(e.touches[0].clientX);
    }
  }, [handleInteraction]);

  const handleDragStart = () => setIsDragging(true);
  const handleDragEnd = () => setIsDragging(false);

  useEffect(() => {
    if (isDragging) {
      setGlitchIntensity(2 + Math.random() * 3);
    } else {
      setGlitchIntensity(0);
    }
  }, [isDragging]);

  return (
    <motion.div
      drag
      dragMomentum={false}
      dragElastic={0.1}
      whileDrag={{ scale: 1.02, cursor: 'grabbing' }}
      className="fixed bottom-24 sm:bottom-28 left-1/2 -translate-x-1/2 z-40 cursor-grab active:cursor-grabbing"
      initial={{ y: 100, opacity: 0 }}
      animate={{ 
        y: 0, 
        opacity: 1,
        x: isDragging ? `calc(-50% + ${(Math.random() - 0.5) * glitchIntensity}px)` : '-50%',
      }}
      transition={{ duration: 0.5, type: 'spring' }}
      style={{
        filter: isDragging ? `blur(${glitchIntensity * 0.1}px)` : 'none',
      }}
    >
      {/* Collapsed compact view */}
      {!isExpanded ? (
        <motion.button
          onClick={() => setIsExpanded(true)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-2 px-3 py-2 bg-black/80 backdrop-blur-xl border border-cyan-400/30 
                     rounded-lg text-white hover:bg-black/90 hover:border-cyan-400/50 transition-all shadow-lg"
        >
          <GripVertical className="w-3 h-3 text-white/40" />
          <div className="flex items-center gap-1.5">
            {isPlaying ? <Pause className="w-4 h-4 text-cyan-400" /> : <Play className="w-4 h-4 text-cyan-400" />}
            <span className="text-[10px] sm:text-xs font-mono text-cyan-400">
              T-{Math.floor((scrubberPosition / 100) * maxTime)}s
            </span>
          </div>
          <ChevronUp className="w-3 h-3 text-white/60" />
        </motion.button>
      ) : (
        /* Expanded Timeline */
        <div className="w-[90vw] sm:w-[80vw] md:w-[70vw] lg:w-[60vw] max-w-xl">
          {/* Glitch overlay */}
          <AnimatePresence>
            {isDragging && (
              <motion.div
                className="absolute inset-0 pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.3 }}
                exit={{ opacity: 0 }}
                style={{
                  background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,255,0.03) 2px, rgba(0,255,255,0.03) 4px)',
                }}
              />
            )}
          </AnimatePresence>

          {/* Main container */}
          <motion.div
            className={`relative backdrop-blur-2xl bg-black/40 rounded-xl border ${
              hitMarker ? 'border-red-500 shadow-[0_0_30px_rgba(255,0,0,0.5)]' : 'border-cyan-500/30'
            } p-2 sm:p-3 transition-all duration-150`}
            animate={{
              boxShadow: hitMarker 
                ? '0 0 40px rgba(255,0,0,0.6), inset 0 0 20px rgba(255,0,0,0.2)' 
                : '0 0 30px rgba(0,255,255,0.2), inset 0 0 20px rgba(0,255,255,0.05)',
            }}
          >
            {/* Header with drag handle and collapse */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <GripVertical className="w-3.5 h-3.5 text-white/50" />
                <span className="text-[9px] sm:text-[10px] text-fuchsia-400/80 font-mono">CHRONO-ECHO</span>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setIsExpanded(false); }}
                className="p-1 hover:bg-white/20 rounded-md transition-colors"
              >
                <ChevronDown className="w-3.5 h-3.5 text-white/60 hover:text-white" />
              </button>
            </div>

            {/* Control buttons - compact */}
            <div className="flex items-center justify-center gap-2 sm:gap-3 mb-2">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className="p-1.5 rounded-full bg-gradient-to-r from-cyan-500/20 to-fuchsia-500/20 border border-cyan-400/30 text-cyan-400 hover:text-white transition-colors touch-manipulation"
                onClick={(e) => { e.stopPropagation(); setScrubberPosition(0); }}
              >
                <SkipBack className="w-3 h-3 sm:w-4 sm:h-4" />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className="p-1.5 rounded-full bg-gradient-to-r from-cyan-500/20 to-fuchsia-500/20 border border-cyan-400/30 text-cyan-400 hover:text-white transition-colors touch-manipulation"
                onClick={(e) => { e.stopPropagation(); setScrubberPosition(Math.max(0, scrubberPosition - 10)); }}
              >
                <Rewind className="w-3 h-3 sm:w-4 sm:h-4" />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.9 }}
                className="p-2 rounded-full bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-white shadow-lg shadow-cyan-500/30 touch-manipulation"
                onClick={(e) => { e.stopPropagation(); onPlayPause?.(!isPlaying); }}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className="p-1.5 rounded-full bg-gradient-to-r from-cyan-500/20 to-fuchsia-500/20 border border-cyan-400/30 text-cyan-400 hover:text-white transition-colors touch-manipulation"
                onClick={(e) => { e.stopPropagation(); setScrubberPosition(Math.min(100, scrubberPosition + 10)); }}
              >
                <SkipForward className="w-3 h-3 sm:w-4 sm:h-4" />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className="p-1.5 rounded-full bg-gradient-to-r from-cyan-500/20 to-fuchsia-500/20 border border-cyan-400/30 text-cyan-400 hover:text-white transition-colors touch-manipulation"
                onClick={(e) => { e.stopPropagation(); setScrubberPosition(100); }}
              >
                <SkipForward className="w-3 h-3 sm:w-4 sm:h-4" />
              </motion.button>
            </div>

            {/* Timeline bar - compact */}
            <div 
              ref={timelineRef}
              className="relative h-3 sm:h-4 cursor-pointer group touch-manipulation"
              onClick={handleTimelineClick}
              onTouchMove={handleTouchMove}
              onTouchStart={handleDragStart}
              onTouchEnd={handleDragEnd}
            >
              {/* Glow base */}
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/50 via-fuchsia-500/50 to-cyan-500/50 rounded-full blur-md opacity-50" />
              
              {/* Track */}
              <div className="relative h-full bg-gradient-to-r from-cyan-900/80 via-fuchsia-900/80 to-cyan-900/80 rounded-full overflow-hidden">
                {/* Progress */}
                <motion.div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-cyan-400 rounded-full"
                  style={{ width: `${scrubberPosition}%` }}
                  animate={{ width: `${scrubberPosition}%` }}
                />

                {/* Animated pulse line */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-gpu-bg-slide" />
              </div>

              {/* Ghost markers */}
              {demoEvents.map((event) => (
                <motion.div
                  key={event.id}
                  className={`absolute top-1/2 -translate-y-1/2 w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full ${getEventColor(event.type)} cursor-pointer`}
                  style={{ left: `${(event.timestamp / maxTime) * 100}%` }}
                  whileHover={{ scale: 1.5 }}
                  title={event.label}
                >
                  <div className="absolute inset-0 rounded-full animate-gpu-glow-cyan" />
                </motion.div>
              ))}

              {/* Diamond Scrubber */}
              <motion.div
                className="absolute top-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing"
                style={{ left: `${scrubberPosition}%` }}
                drag="x"
                dragConstraints={timelineRef}
                dragElastic={0}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                whileHover={{ scale: 1.2 }}
              >
                <div className="relative">
                  {/* Crystal scrubber */}
                  <div
                    className="w-4 h-4 sm:w-5 sm:h-5 bg-gradient-to-br from-cyan-300 via-white to-fuchsia-300 rotate-45 rounded-sm shadow-lg animate-gpu-glow-cyan"
                  />
                  
                  {/* Inner crystal glow */}
                  <div className="absolute inset-0.5 bg-white/80 rotate-45 rounded-sm animate-gpu-status-primary" />
                </div>
              </motion.div>
            </div>

            {/* Time display - compact */}
            <div className="flex justify-between mt-2 text-[9px] sm:text-[10px] font-mono">
              <span className="text-cyan-400">
                T-{Math.floor((scrubberPosition / 100) * maxTime)}s
              </span>
              <span className="text-cyan-400">
                T-{maxTime}s
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};

export default TimeManipulationBar;