import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CloudRain, Sun, Eye, Zap, Heart, Flame, Moon, Sparkles, GripVertical, ChevronUp, ChevronDown } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

interface MoodState {
  joy: number;
  melancholy: number;
  rage: number;
  serenity: number;
  fear: number;
}

interface WorldStateControllerProps {
  moodState?: MoodState;
  onMoodChange?: (mood: MoodState) => void;
  onAutoOverrideChange?: (enabled: boolean) => void;
  autoOverride?: boolean;
}

const MOOD_PRESETS = {
  'Neon Noir': { joy: 20, melancholy: 85, rage: 30, serenity: 40, fear: 50 },
  'Solar Punk': { joy: 90, melancholy: 10, rage: 20, serenity: 70, fear: 10 },
  'Abyss Mode': { joy: 10, melancholy: 60, rage: 40, serenity: 15, fear: 95 },
  'Zen Garden': { joy: 60, melancholy: 20, rage: 5, serenity: 95, fear: 10 },
  'Fury Storm': { joy: 30, melancholy: 40, rage: 95, serenity: 10, fear: 60 },
};

export const WorldStateController: React.FC<WorldStateControllerProps> = ({
  moodState = { joy: 50, melancholy: 30, rage: 20, serenity: 60, fear: 25 },
  onMoodChange,
  onAutoOverrideChange,
  autoOverride = false,
}) => {
  const [mood, setMood] = useState<MoodState>(moodState);
  const [zoeOverride, setZoeOverride] = useState(autoOverride);
  const [activeEnvironment, setActiveEnvironment] = useState<string>('Balanced');
  const [isExpanded, setIsExpanded] = useState(false);

  // Determine dominant mood and environment
  useEffect(() => {
    const moodValues = [
      { name: 'joy', value: mood.joy },
      { name: 'melancholy', value: mood.melancholy },
      { name: 'rage', value: mood.rage },
      { name: 'serenity', value: mood.serenity },
      { name: 'fear', value: mood.fear },
    ];
    
    const dominant = moodValues.reduce((a, b) => a.value > b.value ? a : b);
    
    switch (dominant.name) {
      case 'melancholy':
        setActiveEnvironment('Neon Noir Mode');
        break;
      case 'joy':
        setActiveEnvironment('Solar Punk Mode');
        break;
      case 'fear':
        setActiveEnvironment('Abyss Mode');
        break;
      case 'serenity':
        setActiveEnvironment('Zen Garden Mode');
        break;
      case 'rage':
        setActiveEnvironment('Fury Storm Mode');
        break;
      default:
        setActiveEnvironment('Balanced Mode');
    }
  }, [mood]);

  const getEnvironmentIcon = () => {
    switch (activeEnvironment) {
      case 'Neon Noir Mode':
        return <CloudRain className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />;
      case 'Solar Punk Mode':
        return <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" />;
      case 'Abyss Mode':
        return <Eye className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />;
      case 'Zen Garden Mode':
        return <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />;
      case 'Fury Storm Mode':
        return <Flame className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" />;
      default:
        return <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-fuchsia-400" />;
    }
  };

  const getEnvironmentGradient = () => {
    switch (activeEnvironment) {
      case 'Neon Noir Mode':
        return 'from-blue-900/50 via-purple-900/50 to-slate-900/50';
      case 'Solar Punk Mode':
        return 'from-yellow-500/30 via-orange-400/30 to-emerald-400/30';
      case 'Abyss Mode':
        return 'from-red-900/50 via-black/50 to-purple-900/50';
      case 'Zen Garden Mode':
        return 'from-emerald-800/40 via-blue-800/40 to-cyan-800/40';
      case 'Fury Storm Mode':
        return 'from-orange-600/40 via-red-600/40 to-yellow-600/40';
      default:
        return 'from-fuchsia-800/30 via-purple-800/30 to-cyan-800/30';
    }
  };

  // Radar chart calculation
  const calculateRadarPoints = () => {
    const center = 60;
    const radius = 50;
    const angles = [
      -90, // Joy (top)
      -18, // Melancholy (top-right)
      54,  // Rage (bottom-right)
      126, // Serenity (bottom-left)
      198, // Fear (top-left)
    ];
    
    const values = [mood.joy, mood.melancholy, mood.rage, mood.serenity, mood.fear];
    
    return values.map((value, index) => {
      const angle = (angles[index] * Math.PI) / 180;
      const r = (value / 100) * radius;
      return {
        x: center + r * Math.cos(angle),
        y: center + r * Math.sin(angle),
      };
    });
  };

  const radarPoints = calculateRadarPoints();
  const polygonPoints = radarPoints.map(p => `${p.x},${p.y}`).join(' ');

  const handleMoodSliderChange = (key: keyof MoodState, value: number) => {
    const newMood = { ...mood, [key]: value };
    setMood(newMood);
    onMoodChange?.(newMood);
  };

  const handleOverrideToggle = (checked: boolean) => {
    setZoeOverride(checked);
    onAutoOverrideChange?.(checked);
  };

  return (
    <motion.div
      drag
      dragMomentum={false}
      dragElastic={0.1}
      whileDrag={{ scale: 1.02, cursor: 'grabbing' }}
      className="fixed top-16 sm:top-20 right-2 sm:right-3 z-40 cursor-grab active:cursor-grabbing"
      initial={{ x: 100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.6, type: 'spring' }}
    >
      {/* Compact collapsed view */}
      {!isExpanded ? (
        <motion.button
          onClick={() => setIsExpanded(true)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-2 px-3 py-2 bg-black/80 backdrop-blur-xl border border-fuchsia-400/30 
                     rounded-lg text-white hover:bg-black/90 hover:border-fuchsia-400/50 transition-all shadow-lg"
        >
          <GripVertical className="w-3 h-3 text-white/40" />
          {getEnvironmentIcon()}
          <span className="text-[10px] sm:text-xs font-semibold">Dreamscape</span>
          <ChevronDown className="w-3 h-3 text-white/60" />
        </motion.button>
      ) : (
        /* Expanded Glassmorphism container */
        <div className="relative backdrop-blur-3xl bg-white/5 rounded-2xl border border-white/10 overflow-hidden shadow-2xl
                        w-52 sm:w-60 md:w-72 max-h-[70vh] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
          {/* Aurora background effect - CSS animation */}
          <div
            className={`absolute inset-0 bg-gradient-to-br ${getEnvironmentGradient()} opacity-60 animate-gpu-pulse-opacity-slow`}
          />
          
          {/* Ethereal glow */}
          <div className="absolute -top-10 -right-10 w-20 h-20 bg-fuchsia-500/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-10 -left-10 w-20 h-20 bg-cyan-500/20 rounded-full blur-3xl" />

          <div className="relative p-3 sm:p-4">
            {/* Header with Drag Handle */}
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <div className="flex items-center gap-1.5">
                <GripVertical className="w-3.5 h-3.5 text-white/50" />
                <h3 className="text-[10px] sm:text-xs font-semibold text-white/90 tracking-wide">
                  DREAMSCAPE CONTROL
                </h3>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setIsExpanded(false); }}
                className="p-1 hover:bg-white/20 rounded-md transition-colors"
              >
                <ChevronUp className="w-3.5 h-3.5 text-white/60 hover:text-white" />
              </button>
            </div>

            {/* Mood Radar - compact */}
            <div className="relative flex justify-center mb-2 sm:mb-3">
              <svg 
                viewBox="0 0 120 120" 
                className="w-20 h-20 sm:w-24 sm:h-24 drop-shadow-lg"
              >
                {/* Pentagon grid lines */}
                {[20, 40, 60, 80, 100].map((level, i) => {
                  const r = (level / 100) * 50;
                  const points = [-90, -18, 54, 126, 198].map(angle => {
                    const rad = (angle * Math.PI) / 180;
                    return `${60 + r * Math.cos(rad)},${60 + r * Math.sin(rad)}`;
                  }).join(' ');
                  return (
                    <polygon
                      key={i}
                      points={points}
                      fill="none"
                      stroke="rgba(255,255,255,0.1)"
                      strokeWidth="0.5"
                    />
                  );
                })}
                
                {/* Axis lines */}
                {[-90, -18, 54, 126, 198].map((angle, i) => {
                  const rad = (angle * Math.PI) / 180;
                  return (
                    <line
                      key={i}
                      x1="60"
                      y1="60"
                      x2={60 + 50 * Math.cos(rad)}
                      y2={60 + 50 * Math.sin(rad)}
                      stroke="rgba(255,255,255,0.15)"
                      strokeWidth="0.5"
                    />
                  );
                })}
                
                {/* Mood polygon with glow */}
                <defs>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                  <linearGradient id="moodGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="rgba(0,255,255,0.8)" />
                    <stop offset="50%" stopColor="rgba(255,0,255,0.6)" />
                    <stop offset="100%" stopColor="rgba(255,255,0,0.8)" />
                  </linearGradient>
                </defs>
                
                <polygon
                  points={polygonPoints}
                  fill="url(#moodGradient)"
                  stroke="url(#moodGradient)"
                  strokeWidth="2"
                  filter="url(#glow)"
                  className="animate-gpu-fill-opacity-pulse"
                />
                
                {/* Data points */}
                {radarPoints.map((point, i) => (
                  <circle
                    key={i}
                    cx={point.x}
                    cy={point.y}
                    r="3"
                    fill="white"
                    filter="url(#glow)"
                    className="animate-gpu-ring-scale-pulse"
                  />
                ))}
              </svg>

              {/* Labels - compact positioning */}
              <span className="absolute -top-1 left-1/2 -translate-x-1/2 text-[7px] sm:text-[8px] text-yellow-400 font-medium">JOY</span>
              <span className="absolute top-6 right-0 text-[7px] sm:text-[8px] text-blue-400 font-medium">MEL</span>
              <span className="absolute bottom-6 right-2 text-[7px] sm:text-[8px] text-red-400 font-medium">RAGE</span>
              <span className="absolute bottom-6 left-2 text-[7px] sm:text-[8px] text-emerald-400 font-medium">SER</span>
              <span className="absolute top-6 left-0 text-[7px] sm:text-[8px] text-purple-400 font-medium">FEAR</span>
            </div>

            {/* Mood sliders - compact */}
            <div className="space-y-1 mb-2 sm:mb-3">
              {Object.entries(mood).map(([key, value]) => (
                <div key={key} className="flex items-center gap-1.5">
                  <span className="text-[7px] sm:text-[8px] text-white/60 w-10 capitalize">{key}</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={value}
                    onChange={(e) => handleMoodSliderChange(key as keyof MoodState, parseInt(e.target.value))}
                    className="flex-1 h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer touch-manipulation
                      [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 
                      [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gradient-to-r 
                      [&::-webkit-slider-thumb]:from-cyan-400 [&::-webkit-slider-thumb]:to-fuchsia-400"
                    disabled={zoeOverride}
                  />
                  <span className="text-[7px] sm:text-[8px] text-white/80 w-6 text-right">{value}%</span>
                </div>
              ))}
            </div>

            {/* Zoe Override Toggle - compact */}
            <div className="flex items-center justify-between p-2 bg-white/5 rounded-lg border border-white/10 mb-2 touch-manipulation">
              <div className="flex items-center gap-1.5">
                <div className={zoeOverride ? 'animate-gpu-spin-2s' : ''}>
                  <Heart className={`w-3 h-3 ${zoeOverride ? 'text-fuchsia-400' : 'text-white/40'}`} />
                </div>
                <span className="text-[9px] sm:text-[10px] text-white/80">Zoe Override</span>
              </div>
              <Switch
                checked={zoeOverride}
                onCheckedChange={handleOverrideToggle}
                className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-cyan-500 data-[state=checked]:to-fuchsia-500 scale-75"
              />
            </div>

            {/* Environment Preview - compact - CSS animation */}
            <div
              className={`relative p-2 rounded-lg bg-gradient-to-br ${getEnvironmentGradient()} border border-white/10 overflow-hidden animate-gpu-border-pulse`}
            >
              <div className="relative flex items-center gap-2">
                <div className="animate-gpu-pulse-scale-sm">
                  {getEnvironmentIcon()}
                </div>
                <div>
                  <p className="text-[10px] sm:text-xs font-semibold text-white">{activeEnvironment}</p>
                  <p className="text-[8px] text-white/60">Active</p>
                </div>
              </div>
            </div>

            {/* Quick presets - compact */}
            <div className="flex gap-1 mt-2">
              {Object.entries(MOOD_PRESETS).slice(0, 3).map(([name, preset]) => (
                <motion.button
                  key={name}
                  className="flex-1 py-1 text-[7px] sm:text-[8px] text-white/60 bg-white/5 rounded-md border border-white/10 hover:bg-white/10 hover:text-white/90 transition-all"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setMood(preset);
                    onMoodChange?.(preset);
                  }}
                  disabled={zoeOverride}
                >
                  {name}
                </motion.button>
              ))}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default WorldStateController;