// ═══════════════════════════════════════════════════════════════════════════════
// PROTOCOL ATLAS: FULL HUD SYSTEM (SMITH PERSONA - ATLAS MOVIE 2024)
// PROTOCOL GLASS VAULT: Progressive disclosure with Holo-Lock protection
// Purpose: Atlas movie Smith-style neural HUD interface with gated access
// Character: Smith - Protective, intelligent AI companion from Atlas (2024)
// Visual: Deep void blue, electric cyan, hexagonal grid, neural aesthetics
// Security: Competitors see the HUD structure but locked modules hide the logic
// ═══════════════════════════════════════════════════════════════════════════════

import React, { memo, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { useSmithVoice, SMITH_LINES } from './AtlasVoice';
import { HardLightContainer } from './HardLightContainer';
import { SynapticDownload } from './SynapticDownload';
import { HoloLock } from './HoloLock';
import { useAtlasAccess } from '@/hooks/useAtlasAccess';
import { 
  Crosshair, 
  Shield, 
  Zap, 
  Heart, 
  DollarSign,
  Brain,
  Orbit,
  Sparkles,
  X,
} from 'lucide-react';

interface AtlasHUDProps {
  isActive?: boolean;
  onClose?: () => void;
  showIntro?: boolean;
  className?: string;
}

// Menu items for the HUD - Updated to use SMITH_LINES
const HUD_MENU_ITEMS = [
  { 
    id: 'career', 
    label: 'CAREER', 
    icon: Crosshair, 
    path: '/kronos', 
    voiceLine: 'NAV_CAREER' as keyof typeof SMITH_LINES,
    color: 'text-red-400'
  },
  { 
    id: 'relationships', 
    label: 'RELATIONSHIPS', 
    icon: Heart, 
    path: '/anima', 
    voiceLine: 'NAV_RELATIONSHIP' as keyof typeof SMITH_LINES,
    color: 'text-pink-400'
  },
  { 
    id: 'health', 
    label: 'HEALTH', 
    icon: Shield, 
    path: '/vitruvian', 
    voiceLine: 'NAV_HEALTH' as keyof typeof SMITH_LINES,
    color: 'text-green-400'
  },
  { 
    id: 'wealth', 
    label: 'WEALTH', 
    icon: DollarSign, 
    path: '/career-divinity', 
    voiceLine: 'NAV_WEALTH' as keyof typeof SMITH_LINES,
    color: 'text-yellow-400'
  },
  { 
    id: 'dhf', 
    label: 'DHF CORE', 
    icon: Brain, 
    path: '/dhf-dashboard', 
    voiceLine: 'DHF_ACTIVATED' as keyof typeof SMITH_LINES,
    color: 'text-purple-400'
  },
  { 
    id: 'zoe', 
    label: 'SMITH AI', 
    icon: Sparkles, 
    path: '/zoe-ai', 
    voiceLine: 'AMBIENT_READY' as keyof typeof SMITH_LINES,
    color: 'text-atlas-cyan'
  },
];

// Status indicators
const StatusIndicator = memo(({ label, value, status }: { 
  label: string; 
  value: string; 
  status: 'online' | 'syncing' | 'offline' 
}) => {
  const statusColors = {
    online: 'bg-green-500',
    syncing: 'bg-yellow-500 animate-pulse',
    offline: 'bg-red-500',
  };
  
  return (
    <div className="flex items-center gap-2 text-xs font-share-tech">
      <div className={cn('w-1.5 h-1.5 rounded-full', statusColors[status])} />
      <span className="text-atlas-cyan/60">{label}:</span>
      <span className="text-atlas-cyan">{value}</span>
    </div>
  );
});
StatusIndicator.displayName = 'StatusIndicator';

// Central Orb component - Now clickable to close HUD
const CentralOrb = memo(({ isPulsing, onTap }: { isPulsing: boolean; onTap?: () => void }) => (
  <motion.div 
    className="relative w-20 h-20 sm:w-24 sm:h-24 cursor-pointer"
    animate={isPulsing ? { scale: [1, 1.1, 1] } : {}}
    transition={{ duration: 0.5, ease: 'easeOut' }}
    onClick={onTap}
    whileTap={{ scale: 0.95 }}
    role="button"
    aria-label="Close HUD"
  >
    {/* Outer ring */}
    <div className="absolute inset-0 rounded-full border-2 border-atlas-cyan/30 animate-spin-slow" />
    
    {/* Middle ring */}
    <div className="absolute inset-2 rounded-full border border-atlas-cyan/50" />
    
    {/* Inner core */}
    <div className="absolute inset-4 rounded-full bg-gradient-to-br from-atlas-cyan/40 to-atlas-cyan/10 backdrop-blur-sm">
      <div className="absolute inset-2 rounded-full bg-atlas-cyan/20 flex items-center justify-center">
        <Orbit className="w-5 h-5 sm:w-6 sm:h-6 text-atlas-cyan animate-pulse" />
      </div>
    </div>
    
    {/* Glow effect */}
    <div className="absolute inset-0 rounded-full shadow-atlas-glow-lg opacity-60" />
    
    {/* Tap hint on mobile */}
    <motion.div
      className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[8px] sm:text-[10px] text-atlas-cyan/40 font-share-tech whitespace-nowrap"
      initial={{ opacity: 0 }}
      animate={{ opacity: [0.3, 0.6, 0.3] }}
      transition={{ duration: 2, repeat: Infinity }}
    >
      TAP TO EXIT
    </motion.div>
  </motion.div>
));
CentralOrb.displayName = 'CentralOrb';

export const AtlasHUD: React.FC<AtlasHUDProps> = memo(({
  isActive = true,
  onClose,
  showIntro = true,
  className,
}) => {
  const navigate = useNavigate();
  const { speakIntro, speakLine, playActivationSound } = useSmithVoice();
  const atlasAccess = useAtlasAccess();
  const [orbPulsing, setOrbPulsing] = useState(false);
  const [introPlayed, setIntroPlayed] = useState(false);
  const [orbCenter, setOrbCenter] = useState({ x: 0, y: 0 });
  const [menuRadius, setMenuRadius] = useState(180);
  
  // Calculate orb center position + responsive menu radius
  useEffect(() => {
    const updateLayout = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const base = Math.min(vw, vh);
      const isMobile = vw < 640;
      
      setOrbCenter({
        x: vw / 2,
        y: vh / 2 - 50,
      });
      
      // Responsive radius: mobile scales from 88-120px based on screen, desktop = 180px
      // Extra small devices (<380px) get even smaller radius
      if (isMobile) {
        if (vw < 380) {
          setMenuRadius(Math.max(75, Math.floor(base * 0.22)));
        } else {
          setMenuRadius(Math.max(88, Math.min(120, Math.floor(base * 0.26))));
        }
      } else {
        setMenuRadius(180);
      }
    };
    
    updateLayout();
    window.addEventListener('resize', updateLayout);
    return () => window.removeEventListener('resize', updateLayout);
  }, []);
  
  // Play intro on mount
  useEffect(() => {
    if (showIntro && isActive && !introPlayed) {
      const timer = setTimeout(() => {
        speakIntro();
        setIntroPlayed(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [showIntro, isActive, introPlayed, speakIntro]);
  
  // Handle menu item click
  const handleMenuClick = useCallback((item: typeof HUD_MENU_ITEMS[0]) => {
    setOrbPulsing(true);
    
    // Speak the voice line
    speakLine(item.voiceLine);
    
    // Navigate after animation
    setTimeout(() => {
      navigate(item.path);
      setOrbPulsing(false);
    }, 600);
  }, [navigate, speakLine]);
  
  if (!isActive) return null;
  
  return (
    <AnimatePresence>
      <motion.div
        className={cn(
          'fixed inset-0 z-[9990]',
          'bg-atlas-void',
          className
        )}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Background: Deep Void + Hex Grid */}
        <div 
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(circle at 50% 50%, hsl(210 100% 8%) 0%, hsl(220 100% 2%) 100%)',
          }}
        />
        
        {/* Hex Grid Overlay */}
        <div className="absolute inset-0 opacity-[0.05]">
          <svg className="w-full h-full animate-hex-pan" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="atlas-hex" width="60" height="52" patternUnits="userSpaceOnUse">
                <path
                  d="M30 0L60 15L60 37L30 52L0 37L0 15Z"
                  fill="none"
                  stroke="rgba(0, 255, 255, 0.5)"
                  strokeWidth="0.5"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#atlas-hex)" />
          </svg>
        </div>
        
        {/* Scan lines effect */}
        <div className="absolute inset-0 pointer-events-none">
          <motion.div
            className="absolute w-full h-0.5 bg-gradient-to-r from-transparent via-atlas-cyan/30 to-transparent"
            animate={{ top: ['0%', '100%', '0%'] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
          />
        </div>
        
        {/* Top Status Bar - Mobile responsive + integrated Close */}
        <HardLightContainer 
          className="absolute top-4 left-1/2 -translate-x-1/2 w-auto max-w-[92vw]"
          variant="panel"
          showHexGrid={false}
          showMicroText={false}
          glowIntensity="low"
        >
          <div className="flex items-center gap-2 sm:gap-6 px-2 sm:px-4 py-2 text-[10px] sm:text-xs">
            <StatusIndicator label="NEURAL" value="LINKED" status="online" />
            <StatusIndicator label="DHF" value="SYNC" status="syncing" />
            <span className="hidden sm:inline">
              <StatusIndicator label="ATLAS" value="v2.1" status="online" />
            </span>
            
            {/* Spacer */}
            <div className="flex-1" />

            {/* Close inside bar so it never overlaps */}
            {onClose && (
              <button
                onClick={onClose}
                className="ml-1 inline-flex items-center gap-1 rounded border border-atlas-cyan/20 bg-atlas-void/40 px-2 py-1 text-atlas-cyan/70 hover:text-atlas-cyan hover:border-atlas-cyan/40 transition-colors"
                aria-label="Close HUD"
              >
                <X className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-xs font-share-tech tracking-wider">ESC</span>
              </button>
            )}
          </div>
        </HardLightContainer>
        
        {/* Central Orb - Now clickable */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <CentralOrb isPulsing={orbPulsing} onTap={onClose} />
        </div>
        
        {/* Menu Items - MOBILE RESPONSIVE hexagonal pattern */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative w-[320px] h-[320px] sm:w-[500px] sm:h-[500px]">
            {HUD_MENU_ITEMS.map((item, index) => {
              // Use reactive menuRadius from state (calculated in useEffect)
              const angle = (index / HUD_MENU_ITEMS.length) * Math.PI * 2 - Math.PI / 2;
              const x = Math.cos(angle) * menuRadius;
              const y = Math.sin(angle) * menuRadius;
              
              // Get lock status from atlasAccess
              // Special case: "zoe" (Smith AI) requires ALL 5 pillars unlocked
              let isLocked = false;
              let completionPercent = 100;
              
              if (item.id === 'zoe') {
                // Smith AI is locked until all 5 pillars are complete
                isLocked = !atlasAccess.canAccessSmithAI;
                completionPercent = atlasAccess.overallProgress;
              } else {
                const pillarStatus = atlasAccess[item.id as keyof typeof atlasAccess] as { isUnlocked?: boolean; completionPercent?: number } | undefined;
                isLocked = pillarStatus && typeof pillarStatus === 'object' && 'isUnlocked' in pillarStatus 
                  ? !pillarStatus.isUnlocked 
                  : false;
                completionPercent = pillarStatus && typeof pillarStatus === 'object' && 'completionPercent' in pillarStatus
                  ? pillarStatus.completionPercent || 0
                  : 100;
              }
              
              return (
                <motion.div
                  key={item.id}
                  className="absolute"
                  style={{
                    left: `calc(50% + ${x}px)`,
                    top: `calc(50% + ${y}px)`,
                    transform: 'translate(-50%, -50%)',
                  }}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 + index * 0.1, duration: 0.3 }}
                >
                  <HoloLock
                    pillarId={item.id}
                    isLocked={isLocked}
                    completionPercent={completionPercent}
                    onUnlockClick={() => navigate(atlasAccess.getUnlockPath(item.id))}
                  >
                    <SynapticDownload
                      label={item.label}
                      onClick={() => handleMenuClick(item)}
                      orbPosition={orbCenter}
                      className="min-w-[90px] sm:min-w-[120px]"
                    >
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <item.icon className={cn('w-3.5 h-3.5 sm:w-4 sm:h-4', item.color)} />
                        <span className="text-[11px] sm:text-sm">{item.label}</span>
                      </div>
                    </SynapticDownload>
                  </HoloLock>
                </motion.div>
              );
            })}
          </div>
        </div>
        
        {/* Corner Brackets */}
        <div className="absolute inset-4 pointer-events-none">
          <svg className="absolute top-0 left-0 w-12 h-12" viewBox="0 0 48 48">
            <path d="M0 48 L0 0 L48 0" stroke="rgba(0, 255, 255, 0.5)" strokeWidth="2" fill="none" />
          </svg>
          <svg className="absolute top-0 right-0 w-12 h-12" viewBox="0 0 48 48">
            <path d="M0 0 L48 0 L48 48" stroke="rgba(0, 255, 255, 0.5)" strokeWidth="2" fill="none" />
          </svg>
          <svg className="absolute bottom-0 left-0 w-12 h-12" viewBox="0 0 48 48">
            <path d="M0 0 L0 48 L48 48" stroke="rgba(0, 255, 255, 0.5)" strokeWidth="2" fill="none" />
          </svg>
          <svg className="absolute bottom-0 right-0 w-12 h-12" viewBox="0 0 48 48">
            <path d="M48 0 L48 48 L0 48" stroke="rgba(0, 255, 255, 0.5)" strokeWidth="2" fill="none" />
          </svg>
        </div>
        
        {/* Bottom signature - Mobile responsive */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center px-4 max-w-full pointer-events-none">
          <p className="text-[8px] sm:text-[10px] font-share-tech text-atlas-cyan/40 tracking-[0.15em] sm:tracking-[0.3em] uppercase">
            M'MORA ATLAS // DHF v2.1
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
});

AtlasHUD.displayName = 'AtlasHUD';

export default AtlasHUD;
