// ═══════════════════════════════════════════════════════════════════════════════
// GENESIS CINEMATIC INTRO - Ready Player One Style First-Time Experience
// "The year is 2120. Reality is broken. Welcome to the Omega Stacks."
// Pure CSS Animations + Framer Motion for instant, skip-able experience
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SkipForward, Volume2, VolumeX, Sparkles, User, Shield, Cpu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface GenesisCinematicIntroProps {
  onComplete: (selectedAvatar?: string) => void;
  onSkip: () => void;
}

type CinematicScene = 'intro' | 'reality' | 'city' | 'avatars' | 'warp';

interface Avatar {
  id: string;
  name: string;
  title: string;
  description: string;
  icon: typeof User;
  color: string;
  glowColor: string;
}

const AVATARS: Avatar[] = [
  {
    id: 'gunther',
    name: 'GUNTHER',
    title: 'The Architect',
    description: 'Builder of worlds, master of logic',
    icon: Cpu,
    color: 'from-blue-500 to-cyan-400',
    glowColor: 'rgba(0, 255, 255, 0.5)',
  },
  {
    id: 'sentinel',
    name: 'SENTINEL',
    title: 'The Guardian',
    description: 'Protector of memories, shield of trust',
    icon: Shield,
    color: 'from-purple-500 to-violet-400',
    glowColor: 'rgba(139, 92, 246, 0.5)',
  },
  {
    id: 'pixie',
    name: 'PIXIE',
    title: 'The Dreamer',
    description: 'Weaver of creativity, spark of wonder',
    icon: Sparkles,
    color: 'from-pink-500 to-rose-400',
    glowColor: 'rgba(236, 72, 153, 0.5)',
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// SCENE COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

// Scene 1: Black screen with fading text
const IntroScene: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, 4000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-center bg-background"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 1.5 }}
        className="text-center px-8"
      >
        <p className="text-2xl md:text-4xl font-orbitron text-foreground/90 tracking-[0.3em] mb-4 animate-gpu-status-primary">
          THE YEAR IS 2120
        </p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2, duration: 1 }}
          className="text-lg md:text-2xl text-red-500/80 font-mono tracking-widest"
        >
          REALITY IS BROKEN
        </motion.p>
      </motion.div>
      
      {/* Subtle scan lines */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(0,255,255,0.03)_2px,rgba(0,255,255,0.03)_4px)]" />
      </div>
    </motion.div>
  );
};

// Scene 2: Neon grid city zoom
const CityScene: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, 4500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div 
      className="absolute inset-0 overflow-hidden bg-black"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Grid floor effect */}
      <motion.div
        className="absolute inset-0"
        initial={{ scale: 3, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 3, ease: "easeOut" }}
        style={{
          background: `
            linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.8) 100%),
            linear-gradient(90deg, rgba(0,255,255,0.1) 1px, transparent 1px),
            linear-gradient(180deg, rgba(0,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '100% 100%, 50px 50px, 50px 50px',
          transform: 'perspective(500px) rotateX(60deg)',
          transformOrigin: 'center top',
        }}
      />

      {/* Neon city silhouette */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-1/3"
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 1, duration: 1.5 }}
      >
        {/* Buildings SVG */}
        <svg className="w-full h-full" viewBox="0 0 1200 300" preserveAspectRatio="xMidYMax slice">
          <defs>
            <linearGradient id="buildingGlow" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#00ffff" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.3" />
            </linearGradient>
          </defs>
          {/* Building silhouettes */}
          <rect x="50" y="100" width="60" height="200" fill="url(#buildingGlow)" opacity="0.6" />
          <rect x="130" y="50" width="80" height="250" fill="url(#buildingGlow)" opacity="0.7" />
          <rect x="230" y="80" width="50" height="220" fill="url(#buildingGlow)" opacity="0.5" />
          <rect x="300" y="30" width="100" height="270" fill="url(#buildingGlow)" opacity="0.8" />
          <rect x="420" y="70" width="70" height="230" fill="url(#buildingGlow)" opacity="0.6" />
          <rect x="510" y="20" width="120" height="280" fill="url(#buildingGlow)" opacity="0.9" />
          <rect x="650" y="60" width="80" height="240" fill="url(#buildingGlow)" opacity="0.7" />
          <rect x="750" y="40" width="90" height="260" fill="url(#buildingGlow)" opacity="0.8" />
          <rect x="860" y="90" width="60" height="210" fill="url(#buildingGlow)" opacity="0.5" />
          <rect x="940" y="50" width="100" height="250" fill="url(#buildingGlow)" opacity="0.7" />
          <rect x="1060" y="70" width="80" height="230" fill="url(#buildingGlow)" opacity="0.6" />
        </svg>
      </motion.div>

      {/* Title text */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 2, duration: 1 }}
      >
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-orbitron text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 tracking-[0.2em] animate-pulse">
            WELCOME TO
          </h1>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2.5, duration: 0.8 }}
            className="text-5xl md:text-7xl font-orbitron text-foreground mt-4 tracking-[0.1em]"
            style={{
              textShadow: '0 0 20px rgba(0,255,255,0.8), 0 0 40px rgba(139,92,246,0.6)',
            }}
          >
            THE OMEGA STACKS
          </motion.h2>
        </div>
      </motion.div>

      {/* Floating particles */}
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={i}
            className={`absolute w-1 h-1 bg-cyan-400 rounded-full ${
              i < 6 ? 'animate-gpu-float-particle-1' :
              i < 12 ? 'animate-gpu-float-particle-2' :
              i < 18 ? 'animate-gpu-float-particle-3' :
              i < 24 ? 'animate-gpu-float-particle-4' : 'animate-gpu-float-particle-5'
            }`}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
          />
        ))}
      </div>
    </motion.div>
  );
};

// Scene 3: Avatar selection
const AvatarScene: React.FC<{ 
  onSelect: (avatar: string) => void;
  selectedAvatar: string | null;
}> = ({ onSelect, selectedAvatar }) => {
  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center bg-background px-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Background grid */}
      <div className="absolute inset-0 opacity-10 oni-hex-mesh" />
      
      {/* Title */}
      <motion.div
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mb-12 text-center"
      >
        <h2 className="text-2xl md:text-4xl font-orbitron text-foreground tracking-[0.2em] mb-2">
          CHOOSE YOUR VESSEL
        </h2>
        <p className="text-sm md:text-base text-cyan-400/70 font-mono">
          Select your neural interface avatar
        </p>
      </motion.div>

      {/* Avatar Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full">
        {AVATARS.map((avatar, index) => {
          const Icon = avatar.icon;
          const isSelected = selectedAvatar === avatar.id;
          
          return (
            <motion.div
              key={avatar.id}
              initial={{ y: 50, opacity: 0, rotateY: -30 }}
              animate={{ 
                y: 0, 
                opacity: 1, 
                rotateY: 0,
                scale: isSelected ? 1.05 : 1,
              }}
              transition={{ delay: 0.5 + index * 0.2, duration: 0.5 }}
              whileHover={{ scale: 1.05, y: -5 }}
              onClick={() => onSelect(avatar.id)}
              className={cn(
                "relative p-6 rounded-2xl cursor-pointer transition-all duration-300",
                "bg-gradient-to-br from-card/80 to-background/80",
                "border-2 backdrop-blur-sm",
                isSelected 
                  ? "border-primary shadow-[0_0_30px_hsl(var(--primary)/0.3)]" 
                  : "border-foreground/10 hover:border-foreground/30"
              )}
            >
              {/* Glow effect */}
              {isSelected && (
                <motion.div
                  layoutId="avatar-glow"
                  className="absolute inset-0 rounded-2xl"
                  style={{
                    background: `radial-gradient(ellipse at center, ${avatar.glowColor} 0%, transparent 70%)`,
                    opacity: 0.3,
                  }}
                />
              )}

              {/* Icon - Conditional CSS animation */}
              <div
                className={cn(
                  "w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center",
                  `bg-gradient-to-br ${avatar.color}`,
                  isSelected && "animate-gpu-spin-2s"
                )}
                style={{
                  boxShadow: isSelected ? `0 0 30px ${avatar.glowColor}` : 'none',
                }}
              >
                <Icon className="w-10 h-10 text-foreground" />
              </div>

              {/* Info */}
              <div className="text-center">
                <h3 className="text-xl font-orbitron text-foreground mb-1">{avatar.name}</h3>
                <p className="text-sm text-primary font-mono mb-2">{avatar.title}</p>
                <p className="text-xs text-foreground/60">{avatar.description}</p>
              </div>

              {/* Selection indicator */}
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-2 -right-2 w-8 h-8 bg-primary rounded-full flex items-center justify-center"
                >
                  <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Continue Button */}
      <AnimatePresence>
        {selectedAvatar && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="mt-10"
          >
            <p className="text-center text-cyan-400/70 text-sm mb-4 font-mono">
              Press ENTER or click below to initialize
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// Scene 4: Warp speed transition
const WarpScene: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, 2000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div 
      className="absolute inset-0 overflow-hidden bg-black"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Warp lines */}
      <div className="absolute inset-0 flex items-center justify-center">
        {Array.from({ length: 50 }).map((_, i) => {
          const angle = (i / 50) * Math.PI * 2;
          const delay = Math.random() * 0.5;
          
          return (
            <motion.div
              key={i}
              className="absolute w-1 bg-gradient-to-r from-cyan-400 to-transparent"
              style={{
                height: 2,
                transformOrigin: 'left center',
                transform: `rotate(${angle}rad)`,
              }}
              initial={{ scaleX: 0, x: 0 }}
              animate={{ 
                scaleX: [0, 100, 200],
                opacity: [1, 0.8, 0],
              }}
              transition={{
                duration: 1.5,
                delay,
                ease: "easeIn",
              }}
            />
          );
        })}
      </div>

      {/* Center flash */}
      <motion.div
        className="absolute inset-0 bg-white"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0] }}
        transition={{ duration: 0.5, delay: 1.5 }}
      />

      {/* Text */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ delay: 1, duration: 0.5 }}
      >
        <p className="text-4xl font-orbitron text-cyan-400 tracking-[0.5em]">
          INITIALIZING...
        </p>
      </motion.div>
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

const GenesisCinematicIntro: React.FC<GenesisCinematicIntroProps> = ({
  onComplete,
  onSkip,
}) => {
  const [currentScene, setCurrentScene] = useState<CinematicScene>('intro');
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(true);

  // Scene progression
  const handleSceneComplete = useCallback((nextScene: CinematicScene) => {
    setCurrentScene(nextScene);
  }, []);

  // Avatar selection
  const handleAvatarSelect = (avatarId: string) => {
    setSelectedAvatar(avatarId);
  };

  // Proceed from avatar selection
  const handleProceed = useCallback(() => {
    if (selectedAvatar) {
      setCurrentScene('warp');
    }
  }, [selectedAvatar]);

  // Handle keyboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && currentScene === 'avatars' && selectedAvatar) {
        handleProceed();
      }
      if (e.key === 'Escape') {
        onSkip();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentScene, selectedAvatar, handleProceed, onSkip]);

  // Complete after warp
  useEffect(() => {
    if (currentScene === 'warp') {
      const timer = setTimeout(() => {
        onComplete(selectedAvatar || undefined);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [currentScene, selectedAvatar, onComplete]);

  return (
    <motion.div 
      className="fixed inset-0 z-[9999] bg-black"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Skip Button */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="absolute top-4 right-4 z-50 flex items-center gap-2"
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsMuted(!isMuted)}
          className="text-foreground/50 hover:text-foreground hover:bg-foreground/10"
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onSkip}
          className="text-foreground/50 hover:text-foreground hover:bg-foreground/10"
        >
          <SkipForward className="w-4 h-4 mr-2" />
          Skip
        </Button>
      </motion.div>

      {/* Scenes */}
      <AnimatePresence mode="wait">
        {currentScene === 'intro' && (
          <IntroScene 
            key="intro"
            onComplete={() => handleSceneComplete('city')} 
          />
        )}
        
        {currentScene === 'city' && (
          <CityScene 
            key="city"
            onComplete={() => handleSceneComplete('avatars')} 
          />
        )}
        
        {currentScene === 'avatars' && (
          <AvatarScene 
            key="avatars"
            onSelect={handleAvatarSelect}
            selectedAvatar={selectedAvatar}
          />
        )}
        
        {currentScene === 'warp' && (
          <WarpScene 
            key="warp"
            onComplete={() => onComplete(selectedAvatar || undefined)} 
          />
        )}
      </AnimatePresence>

      {/* Proceed button for avatar scene */}
      <AnimatePresence>
        {currentScene === 'avatars' && selectedAvatar && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50"
          >
            <Button
              onClick={handleProceed}
              className={cn(
                "px-8 py-3 text-lg font-orbitron tracking-wider",
                "bg-gradient-to-r from-cyan-500 to-purple-600",
                "hover:from-cyan-400 hover:to-purple-500",
                "border border-cyan-400/50",
                "shadow-[0_0_20px_rgba(0,255,255,0.3)]",
                "transition-all duration-300"
              )}
            >
              ENTER THE OMEGA
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress dots */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
        {(['intro', 'city', 'avatars', 'warp'] as CinematicScene[]).map((scene, index) => (
          <motion.div
            key={scene}
            className={cn(
              "w-2 h-2 rounded-full transition-colors duration-300",
              currentScene === scene ? "bg-cyan-400" : "bg-white/20"
            )}
            animate={{
              scale: currentScene === scene ? [1, 1.3, 1] : 1,
            }}
            transition={{
              duration: 1,
              repeat: currentScene === scene ? Infinity : 0,
            }}
          />
        ))}
      </div>
    </motion.div>
  );
};

export default GenesisCinematicIntro;
