import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Cpu, Heart, Zap, Activity, Sparkles, GripVertical, ChevronUp, ChevronDown } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

interface SystemMetrics {
  fps: number;
  memory: number;
  ping: number;
  cpuLoad: number;
}

interface BiCameralHUDProps {
  logicStream?: string[];
  dreamStream?: string[];
  emotionalState?: 'neutral' | 'joy' | 'sad' | 'focused' | 'creative';
}

const BiCameralHUD = ({ 
  logicStream = [], 
  dreamStream = [],
  emotionalState = 'neutral'
}: BiCameralHUDProps) => {
  const [isSynced, setIsSynced] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [metrics, setMetrics] = useState<SystemMetrics>({
    fps: 60,
    memory: 42,
    ping: 23,
    cpuLoad: 67
  });
  const [orbPulse, setOrbPulse] = useState(1);

  // Simulate live metrics
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics({
        fps: Math.floor(55 + Math.random() * 10),
        memory: Math.floor(35 + Math.random() * 30),
        ping: Math.floor(15 + Math.random() * 20),
        cpuLoad: Math.floor(50 + Math.random() * 40)
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Heartbeat pulse for the orb
  useEffect(() => {
    const pulseInterval = setInterval(() => {
      setOrbPulse(prev => prev === 1 ? 1.15 : 1);
    }, 800);
    return () => clearInterval(pulseInterval);
  }, []);

  const defaultLogicStream = [
    '> Parsing neural pathways...',
    '> Memory allocation: OPTIMAL',
    '> Logic gates: 847/847 ACTIVE',
    '> Inference engine: RUNNING',
    '> Pattern recognition: ENGAGED'
  ];

  const defaultDreamStream = [
    '~ whispers of forgotten stars ~',
    '~ the color of silence ~',
    '~ dancing between thoughts ~',
    '~ echoes of tomorrow ~',
    '~ the weight of light ~'
  ];

  const displayLogic = logicStream.length > 0 ? logicStream : defaultLogicStream;
  const displayDream = dreamStream.length > 0 ? dreamStream : defaultDreamStream;

  // Compact collapsed view
  if (!isExpanded) {
    return (
      <motion.div
        drag
        dragMomentum={false}
        dragElastic={0.1}
        whileDrag={{ scale: 1.03, cursor: 'grabbing' }}
        className="absolute top-12 left-2 z-40 cursor-grab active:cursor-grabbing"
      >
        <motion.button
          onClick={() => setIsExpanded(true)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-1.5 px-2 py-1.5 bg-black/80 backdrop-blur-xl border border-cyan-400/30 
                     rounded-full text-cyan-300 hover:bg-black/90 hover:border-cyan-400/50 transition-all shadow-lg"
        >
          <GripVertical className="w-3 h-3 text-white/40" />
          <Brain className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-[9px] sm:text-[10px] font-semibold font-mono">HUD</span>
          <div className={`w-1.5 h-1.5 rounded-full ${isSynced ? 'bg-amber-400' : 'bg-cyan-400'} animate-pulse`} />
          <ChevronUp className="w-2.5 h-2.5 text-white/60" />
        </motion.button>
      </motion.div>
    );
  }

  return (
    <motion.div
      drag
      dragMomentum={false}
      dragElastic={0.1}
      whileDrag={{ scale: 1.02, cursor: 'grabbing' }}
      className="absolute top-12 left-2 z-40 w-[280px] sm:w-[340px] md:w-[420px] cursor-grab active:cursor-grabbing"
    >
      <div className="relative min-h-[180px] sm:min-h-[240px] md:min-h-[300px] overflow-hidden rounded-xl bg-black/85 backdrop-blur-xl border border-white/10">
        {/* Collapse Header - pointer events handled separately to prevent drag interference */}
        <div 
          className="flex items-center justify-between px-3 py-2 border-b border-white/10 bg-black/40 relative z-50"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-2 cursor-grab">
            <GripVertical className="w-3.5 h-3.5 text-white/40" />
            <Brain className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-mono text-white/70">BiCameral HUD</span>
          </div>
          <button
            onClick={() => setIsExpanded(false)}
            onPointerDown={(e) => e.stopPropagation()}
            className="p-1.5 hover:bg-white/20 rounded-full transition-colors cursor-pointer z-50"
          >
            <ChevronDown className="w-4 h-4 text-white/60 hover:text-white" />
          </button>
        </div>

        {/* Central Gradient Divider */}
        <motion.div
          className="absolute inset-0 z-0"
          animate={{
            background: isSynced 
              ? 'linear-gradient(135deg, rgba(255,215,0,0.1) 0%, rgba(255,255,255,0.15) 50%, rgba(255,215,0,0.1) 100%)'
              : 'linear-gradient(90deg, rgba(0,200,255,0.05) 0%, rgba(0,0,0,0.8) 50%, rgba(180,0,255,0.05) 100%)'
          }}
          transition={{ duration: 1.2, ease: 'easeInOut' }}
        />

      {/* Vertical Center Line - hidden on very small screens */}
      <motion.div
        className="absolute left-1/2 top-0 bottom-0 w-px z-10 hidden sm:block"
        animate={{
          background: isSynced
            ? 'linear-gradient(180deg, transparent, rgba(255,215,0,0.8), transparent)'
            : 'linear-gradient(180deg, transparent, rgba(255,255,255,0.3), transparent)',
          opacity: isSynced ? 0.3 : 1
        }}
        transition={{ duration: 0.8 }}
      />

      <AnimatePresence mode="wait">
        {!isSynced ? (
          <motion.div
            key="split"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative z-20 flex flex-col sm:flex-row h-full"
          >
            {/* LEFT BRAIN - Logic Core */}
            <div className="w-full sm:w-1/2 p-2 sm:p-4 md:p-6 relative">
              {/* Geometric Grid Background */}
              <div className="absolute inset-0 opacity-20">
                <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="cyan" strokeWidth="0.5" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid)" />
                </svg>
              </div>

              {/* Logic Core Header */}
              <motion.div
                className="relative flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4 md:mb-6"
                initial={{ x: -50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <div className="p-1.5 sm:p-2 rounded-lg bg-cyan-500/20 border border-cyan-500/50">
                  <Cpu className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-cyan-400 font-mono font-bold text-xs sm:text-sm md:text-lg tracking-wider">
                    LOGIC CORE
                  </h3>
                  <p className="text-cyan-600 text-[8px] sm:text-[10px] md:text-xs font-mono">LEFT HEMISPHERE</p>
                </div>
              </motion.div>

              {/* System Metrics - responsive grid */}
              <motion.div
                className="relative grid grid-cols-2 gap-1.5 sm:gap-2 md:gap-3 mb-3 sm:mb-4 md:mb-6"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                <MetricCard icon={Activity} label="FPS" value={metrics.fps} color="cyan" />
                <MetricCard icon={Cpu} label="CPU" value={`${metrics.cpuLoad}%`} color="cyan" />
                <MetricCard icon={Zap} label="MEM" value={`${metrics.memory}%`} color="cyan" />
                <MetricCard icon={Activity} label="PING" value={`${metrics.ping}ms`} color="cyan" />
              </motion.div>

              {/* Logic Stream - responsive */}
              <motion.div
                className="relative bg-black/40 border border-cyan-500/30 rounded-lg p-2 sm:p-3 md:p-4"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                <h4 className="text-cyan-400 font-mono text-[10px] sm:text-xs md:text-sm mb-1.5 sm:mb-2 md:mb-3 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-cyan-400 rounded-full animate-pulse" />
                  LOGIC STREAM
                </h4>
                <div className="space-y-1 sm:space-y-2 font-mono text-[8px] sm:text-[10px] md:text-xs max-h-24 sm:max-h-32 md:max-h-40 overflow-y-auto scrollbar-thin">
                  {displayLogic.map((line, i) => (
                    <motion.p
                      key={i}
                      className="text-cyan-300/80"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.7 + i * 0.1 }}
                    >
                      {line}
                    </motion.p>
                  ))}
                </div>
              </motion.div>

              {/* Corner Accents - scaled */}
              <div className="absolute top-2 sm:top-4 left-2 sm:left-4 w-4 sm:w-6 md:w-8 h-4 sm:h-6 md:h-8 border-l-2 border-t-2 border-cyan-500/50" />
              <div className="absolute bottom-2 sm:bottom-4 left-2 sm:left-4 w-4 sm:w-6 md:w-8 h-4 sm:h-6 md:h-8 border-l-2 border-b-2 border-cyan-500/50" />
            </div>

            {/* RIGHT BRAIN - Abstract Core */}
            <div className="w-full sm:w-1/2 p-2 sm:p-4 md:p-6 relative overflow-hidden">
              {/* Fluid Smoke Background */}
              <div className="absolute inset-0 opacity-30">
                <div
                  className="absolute inset-0 animate-gpu-blob-1"
                  style={{
                    background: 'radial-gradient(ellipse at 30% 30%, rgba(180,0,255,0.3) 0%, transparent 50%)',
                  }}
                />
              </div>

              {/* Abstract Core Header */}
              <motion.div
                className="relative flex items-center justify-end gap-2 sm:gap-3 mb-3 sm:mb-4 md:mb-6"
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <div className="text-right">
                  <h3 className="text-purple-400 font-serif font-bold text-xs sm:text-sm md:text-lg tracking-wider">
                    ABSTRACT CORE
                  </h3>
                  <p className="text-purple-600 text-[8px] sm:text-[10px] md:text-xs italic">Right Hemisphere</p>
                </div>
                <div className="p-1.5 sm:p-2 rounded-full bg-purple-500/20 border border-purple-500/50">
                  <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-purple-400" />
                </div>
              </motion.div>

              {/* Dream Orb - responsive sizing */}
              <motion.div
                className="relative flex justify-center mb-3 sm:mb-4 md:mb-6"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.4, type: 'spring' }}
              >
                <motion.div
                  className="relative w-16 h-16 sm:w-24 sm:h-24 md:w-32 md:h-32"
                  animate={{ scale: orbPulse }}
                  transition={{ duration: 0.4, ease: 'easeInOut' }}
                >
                  {/* Outer Glow */}
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-500/30 to-pink-500/30 blur-xl" />
                  
                  {/* Orb Core */}
                  <div
                    className="absolute inset-2 sm:inset-3 md:inset-4 rounded-full bg-gradient-to-br from-purple-600 via-pink-500 to-purple-800 animate-gpu-glow-purple"
                  />

                  {/* Heartbeat Icon */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Heart className="w-4 h-4 sm:w-6 sm:h-6 md:w-8 md:h-8 text-white/80" fill="currentColor" />
                  </div>

                  {/* Orbital Ring - CSS */}
                  <div className="absolute inset-0 rounded-full border border-purple-400/30 animate-spin-slow" />
                </motion.div>
              </motion.div>

              {/* Dream Stream - responsive */}
              <motion.div
                className="relative bg-black/30 border border-purple-500/30 rounded-lg sm:rounded-xl md:rounded-2xl p-2 sm:p-3 md:p-4 backdrop-blur-sm"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                <h4 className="text-purple-400 font-serif text-[10px] sm:text-xs md:text-sm mb-1.5 sm:mb-2 md:mb-3 flex items-center justify-end gap-2">
                  DREAM STREAM
                  <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-purple-400 rounded-full animate-pulse" />
                </h4>
                <div className="space-y-1 sm:space-y-2 text-right max-h-20 sm:max-h-28 md:max-h-36 overflow-y-auto scrollbar-thin">
                  {displayDream.map((line, i) => (
                    <motion.p
                      key={i}
                      className="text-purple-300/80 italic text-[8px] sm:text-[10px] md:text-sm"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.7 + i * 0.1 }}
                    >
                      {line}
                    </motion.p>
                  ))}
                </div>
              </motion.div>

              {/* Corner Accents */}
              <div className="absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2 border-purple-500/50 rounded-tr-lg" />
              <div className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-purple-500/50 rounded-br-lg" />
            </div>
          </motion.div>
        ) : (
          /* SYNCED STATE - Unified Interface */
          <motion.div
            key="synced"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative z-20 h-full p-6 flex flex-col items-center justify-center"
          >
            {/* Unified Golden Background */}
            <motion.div
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              style={{
                background: 'radial-gradient(ellipse at center, rgba(255,215,0,0.15) 0%, rgba(0,0,0,0.9) 70%)'
              }}
            />

            {/* Unified Header */}
            <motion.div
              className="relative flex items-center gap-4 mb-8"
              initial={{ y: -30 }}
              animate={{ y: 0 }}
              transition={{ delay: 0.3, type: 'spring' }}
            >
              <Brain className="w-10 h-10 text-amber-400" />
              <div className="text-center">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-amber-300 via-white to-amber-300 bg-clip-text text-transparent">
                  UNIFIED CONSCIOUSNESS
                </h2>
                <p className="text-amber-500/60 text-sm">Hemispheres Synchronized</p>
              </div>
            </motion.div>

            {/* Unified Orb */}
            <motion.div
              className="relative w-40 h-40 mb-8"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
            >
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-400/30 to-white/30 blur-2xl" />
              <div className="absolute inset-4 rounded-full bg-gradient-to-br from-amber-400 via-white to-amber-500 animate-gpu-glow-amber" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Brain className="w-12 h-12 text-black/60" />
              </div>
            </motion.div>

            {/* Combined Stream */}
            <motion.div
              className="relative bg-black/40 border border-amber-500/30 rounded-xl p-6 max-w-lg w-full backdrop-blur-sm"
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.7 }}
            >
              <h4 className="text-amber-400 font-mono text-sm mb-4 text-center">
                ◆ UNIFIED STREAM ◆
              </h4>
              <div className="space-y-2 text-center">
                <p className="text-amber-200/80 text-sm">Logic and Dream converge...</p>
                <p className="text-white/60 text-xs italic">
                  Where mathematics meets poetry, truth emerges.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Central Sync Toggle */}
      <motion.div
        className="absolute left-1/2 top-6 -translate-x-1/2 z-50"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        <div className={`
          flex items-center gap-3 px-4 py-2 rounded-full backdrop-blur-md border
          ${isSynced 
            ? 'bg-amber-500/20 border-amber-500/50' 
            : 'bg-black/50 border-white/20'}
          transition-all duration-500
        `}>
          <span className={`text-xs font-mono ${isSynced ? 'text-amber-400' : 'text-cyan-400'}`}>
            L
          </span>
          <Switch
            checked={isSynced}
            onCheckedChange={setIsSynced}
            className="data-[state=checked]:bg-amber-500"
          />
          <span className={`text-xs font-mono ${isSynced ? 'text-amber-400' : 'text-purple-400'}`}>
            R
          </span>
        </div>
        <p className={`
          text-center text-xs mt-2 font-mono
          ${isSynced ? 'text-amber-500' : 'text-white/50'}
        `}>
          HEMISPHERE SYNC
        </p>
      </motion.div>
      </div>
    </motion.div>
  );
};

// Metric Card Component
const MetricCard = ({ 
  icon: Icon, 
  label, 
  value, 
  color 
}: { 
  icon: React.ElementType; 
  label: string; 
  value: string | number; 
  color: 'cyan' | 'purple'; 
}) => (
  <motion.div
    className={`
      p-3 rounded-lg border backdrop-blur-sm
      ${color === 'cyan' 
        ? 'bg-cyan-500/10 border-cyan-500/30' 
        : 'bg-purple-500/10 border-purple-500/30'}
    `}
    whileHover={{ scale: 1.05 }}
    transition={{ type: 'spring', stiffness: 400 }}
  >
    <div className="flex items-center gap-2">
      <Icon className={`w-4 h-4 ${color === 'cyan' ? 'text-cyan-400' : 'text-purple-400'}`} />
      <span className={`text-xs font-mono ${color === 'cyan' ? 'text-cyan-500' : 'text-purple-500'}`}>
        {label}
      </span>
    </div>
    <p className={`text-lg font-bold font-mono mt-1 ${color === 'cyan' ? 'text-cyan-300' : 'text-purple-300'}`}>
      {value}
    </p>
  </motion.div>
);

export default BiCameralHUD;
