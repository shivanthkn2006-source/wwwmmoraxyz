// ═══════════════════════════════════════════════════════════════════════════════
// GENESIS OMNI-BOX - The Glass-Morphine Interface
// Ready Player One / Altered Carbon Inspired Command Center
// Draggable + Click-to-Extend Compact Design
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, 
  MicOff, 
  Send, 
  Sparkles, 
  Compass, 
  ShoppingBag,
  Loader2,
  Wand2,
  Volume2,
  GripVertical,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCorticalStack } from '@/contexts/CorticalStackContext';
import { useZoeVoiceCore } from '@/hooks/useZoeVoiceCore';
import { toast } from 'sonner';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

type OmniBoxMode = 'create' | 'travel' | 'market';

interface HolographicToast {
  id: string;
  message: string;
  type: 'zoe' | 'system' | 'reward';
  timestamp: Date;
}

// Demo commands for voice simulation
const DEMO_COMMANDS = [
  "Create Avatar with Cyberpunk style",
  "Build neon city in sector 7",
  "Take me to the Neon District",
  "Set weather to neon rain",
  "Run system diagnostics",
  "Show my memory palace"
];

// ═══════════════════════════════════════════════════════════════════════════════
// HOLOGRAPHIC TOAST COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

const HolographicToast: React.FC<{ toast: HolographicToast; onDismiss: () => void }> = ({ 
  toast: toastData, 
  onDismiss 
}) => {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const typeStyles = {
    zoe: 'from-purple-500/20 to-cyan-500/20 border-purple-500/40',
    system: 'from-blue-500/20 to-indigo-500/20 border-blue-500/40',
    reward: 'from-yellow-500/20 to-orange-500/20 border-yellow-500/40'
  };

  return (
    <motion.div
      initial={{ x: 100, opacity: 0, scale: 0.8 }}
      animate={{ x: 0, opacity: 1, scale: 1 }}
      exit={{ x: 100, opacity: 0, scale: 0.8 }}
      className={cn(
        "relative bg-gradient-to-r backdrop-blur-xl",
        "border rounded-lg px-3 py-2 max-w-xs",
        "shadow-2xl shadow-purple-500/20",
        typeStyles[toastData.type]
      )}
    >
      <div
        className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent animate-gpu-float-up"
        style={{ height: '50%' }}
      />
      
      <div className="relative z-10">
        <p className="font-mono text-xs text-white/90 leading-relaxed">
          {toastData.message}
        </p>
        <p className="text-[8px] text-white/40 mt-0.5 font-mono">
          {toastData.timestamp.toLocaleTimeString()}
        </p>
      </div>
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// NANO-SCAN VISUALIZATION (Avatar Creation Mode)
// ═══════════════════════════════════════════════════════════════════════════════

const NanoScanVisualizer: React.FC<{ isActive: boolean }> = ({ isActive }) => {
  if (!isActive) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="absolute -top-48 left-1/2 -translate-x-1/2 w-32 h-32"
    >
      <div className="relative w-full h-full">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="absolute inset-0 border border-cyan-500/30 rounded-full animate-spin"
            style={{ 
              width: `${100 - i * 20}%`, 
              height: `${100 - i * 20}%`,
              top: `${i * 10}%`,
              left: `${i * 10}%`,
              animationDuration: `${4 + i}s`,
              animationDirection: i % 2 === 0 ? 'normal' : 'reverse'
            }}
          />
        ))}
        
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-16 bg-gradient-to-b from-cyan-500/20 to-purple-500/20 rounded-full" />
        </div>
        
        <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-gpu-scan-line" />
      </div>
      
      <p className="text-center text-cyan-400 text-[8px] font-mono mt-1 animate-pulse">
        SCANNING...
      </p>
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export const GenesisOmniBox: React.FC<{ className?: string }> = ({ className }) => {
  const [inputValue, setInputValue] = useState('');
  const [activeMode, setActiveMode] = useState<OmniBoxMode>('create');
  const [isFocused, setIsFocused] = useState(false);
  const [isVoiceSimulating, setIsVoiceSimulating] = useState(false);
  const [holoToasts, setHoloToasts] = useState<HolographicToast[]>([]);
  const [showNanoScan, setShowNanoScan] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { 
    systemMode, 
    isProcessing, 
    processCommandWithZoeVoice,
    lastZoeResponse,
    checkEasterEgg
  } = useCorticalStack();
  
  const { 
    isListening, 
    startListening, 
    stopListening, 
    transcript 
  } = useZoeVoiceCore();

  // Update input when voice transcript changes
  useEffect(() => {
    if (transcript) {
      setInputValue(transcript);
    }
  }, [transcript]);

  // Add holographic toast
  const addHoloToast = useCallback((message: string, type: HolographicToast['type'] = 'zoe') => {
    const newToast: HolographicToast = {
      id: Date.now().toString(),
      message,
      type,
      timestamp: new Date()
    };
    setHoloToasts(prev => [...prev.slice(-4), newToast]);
  }, []);

  // Remove toast
  const removeToast = useCallback((id: string) => {
    setHoloToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Voice command simulation (demo mode)
  const simulateVoiceCommand = useCallback(() => {
    setIsVoiceSimulating(true);
    setInputValue('');
    
    setTimeout(() => {
      const randomCommand = DEMO_COMMANDS[Math.floor(Math.random() * DEMO_COMMANDS.length)];
      
      let charIndex = 0;
      const typeInterval = setInterval(() => {
        if (charIndex <= randomCommand.length) {
          setInputValue(randomCommand.slice(0, charIndex));
          charIndex++;
        } else {
          clearInterval(typeInterval);
          setIsVoiceSimulating(false);
        }
      }, 50);
    }, 1500);
  }, []);

  // Handle microphone click
  const handleMicClick = useCallback(() => {
    if (isListening) {
      stopListening();
    } else if (isVoiceSimulating) {
      setIsVoiceSimulating(false);
      setInputValue('');
    } else {
      try {
        startListening();
      } catch {
        simulateVoiceCommand();
      }
    }
  }, [isListening, isVoiceSimulating, startListening, stopListening, simulateVoiceCommand]);

  // Handle command submission
  const handleSubmit = useCallback(async () => {
    if (!inputValue.trim() || isProcessing) return;
    
    const command = inputValue.trim();
    setInputValue('');
    
    const easterEggResult = checkEasterEgg(command);
    if (easterEggResult.found) {
      addHoloToast(
        `🎮 SECRET FOUND: ${easterEggResult.objectName}! +${easterEggResult.reward} Zoe Coins!`,
        'reward'
      );
      toast.success(`Easter Egg Discovered!`, {
        description: `${easterEggResult.objectName} - ${easterEggResult.reward} coins earned!`
      });
      return;
    }
    
    if (command.toLowerCase().includes('avatar') || command.toLowerCase().includes('create')) {
      setShowNanoScan(true);
      setTimeout(() => setShowNanoScan(false), 4000);
    }
    
    try {
      const result = await processCommandWithZoeVoice(command);
      addHoloToast(result.zoeResponse, 'zoe');
    } catch (error) {
      addHoloToast('Neural pathway disruption detected. Rerouting...', 'system');
    }
  }, [inputValue, isProcessing, checkEasterEgg, processCommandWithZoeVoice, addHoloToast]);

  // Handle key press
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Mode tabs configuration
  const modes: { id: OmniBoxMode; label: string; icon: React.ReactNode }[] = [
    { id: 'create', label: 'Create', icon: <Wand2 className="w-3 h-3" /> },
    { id: 'travel', label: 'Travel', icon: <Compass className="w-3 h-3" /> },
    { id: 'market', label: 'Market', icon: <ShoppingBag className="w-3 h-3" /> }
  ];

  return (
    <motion.div 
      drag
      dragMomentum={false}
      dragElastic={0.1}
      whileDrag={{ scale: 1.02, cursor: 'grabbing' }}
      className={cn("fixed bottom-6 left-1/2 -translate-x-1/2 z-50 cursor-grab active:cursor-grabbing", className)}
    >
      {/* Holographic Toast Feed */}
      <div className="absolute bottom-full mb-2 right-0 flex flex-col gap-1.5">
        <AnimatePresence mode="popLayout">
          {holoToasts.map((t) => (
            <HolographicToast 
              key={t.id} 
              toast={t} 
              onDismiss={() => removeToast(t.id)} 
            />
          ))}
        </AnimatePresence>
      </div>
      
      {/* Nano Scan Visualizer */}
      <AnimatePresence>
        {showNanoScan && <NanoScanVisualizer isActive={showNanoScan} />}
      </AnimatePresence>

      {/* Collapsed compact view */}
      {!isExpanded ? (
        <motion.button
          onClick={() => setIsExpanded(true)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-2 px-3 py-2 bg-black/80 backdrop-blur-xl border border-purple-400/30 
                     rounded-full text-white hover:bg-black/90 hover:border-purple-400/50 transition-all shadow-lg"
        >
          <GripVertical className="w-3 h-3 text-white/40" />
          <Mic className="w-4 h-4 text-purple-400" />
          <span className="text-[10px] sm:text-xs font-mono text-white/80">Command...</span>
          <ChevronUp className="w-3 h-3 text-white/60" />
        </motion.button>
      ) : (
        /* Expanded OmniBox */
        <div className="w-[90vw] sm:w-[85vw] max-w-lg">
          {/* Mode Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-center gap-1 mb-1.5"
          >
            {modes.map((mode) => (
              <button
                key={mode.id}
                onClick={(e) => { e.stopPropagation(); setActiveMode(mode.id); }}
                className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-mono",
                  "transition-all duration-300",
                  "backdrop-blur-md border",
                  activeMode === mode.id
                    ? "bg-purple-500/30 border-purple-500/50 text-purple-200"
                    : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white/70"
                )}
              >
                {mode.icon}
                <span className="hidden sm:inline">{mode.label}</span>
              </button>
            ))}
          </motion.div>

          {/* Glass-Morphine Input Container */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ 
              opacity: 1, 
              y: 0, 
              scale: 1,
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={cn(
              "relative",
              "rounded-full overflow-hidden",
              "bg-[rgba(255,255,255,0.05)]",
              "backdrop-blur-[20px]",
              "before:absolute before:inset-0 before:rounded-full before:p-[1px]",
              "before:bg-gradient-to-r before:from-cyan-500 before:via-purple-500 before:to-pink-500",
              "before:-z-10",
              isFocused && "shadow-[0_0_20px_rgba(168,85,247,0.4)]"
            )}
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)'
            }}
          >
            {/* Inner border for glass effect */}
            <div className="absolute inset-[1px] rounded-full bg-gradient-to-r from-black/40 via-black/20 to-black/40 pointer-events-none" />
            
            <div className="relative flex items-center px-2 sm:px-3 py-2">
              {/* Drag Handle */}
              <GripVertical className="w-3 h-3 text-white/30 mr-1" />

              {/* Microphone Button */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={(e) => { e.stopPropagation(); handleMicClick(); }}
                className={cn(
                  "relative w-8 h-8 rounded-full flex items-center justify-center",
                  "transition-all duration-300",
                  (isListening || isVoiceSimulating)
                    ? "bg-gradient-to-r from-cyan-500 to-purple-500"
                    : "bg-white/10 hover:bg-white/20"
                )}
              >
                <AnimatePresence>
                  {(isListening || isVoiceSimulating) && (
                    <>
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          className={`absolute inset-0 rounded-full bg-cyan-500/40 ${
                            i === 0 ? 'animate-gpu-ring-expand-fade' :
                            i === 1 ? 'animate-gpu-ring-expand-fade [animation-delay:0.4s]' :
                            'animate-gpu-ring-expand-fade [animation-delay:0.8s]'
                          }`}
                        />
                      ))}
                    </>
                  )}
                </AnimatePresence>
                
                {(isListening || isVoiceSimulating) ? (
                  <MicOff className="w-4 h-4 text-white relative z-10" />
                ) : (
                  <Mic className="w-4 h-4 text-white/70 relative z-10" />
                )}
              </motion.button>

              {/* Input Field */}
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                onKeyDown={handleKeyDown}
                onClick={(e) => e.stopPropagation()}
                placeholder={
                  isListening 
                    ? "Listening..." 
                    : isVoiceSimulating 
                      ? "Processing..." 
                      : `${activeMode === 'create' ? 'Create...' : activeMode === 'travel' ? 'Go to...' : 'Browse...'}`
                }
                className={cn(
                  "flex-1 mx-2 bg-transparent border-none outline-none",
                  "text-white/90 placeholder:text-white/30",
                  "font-mono text-xs sm:text-sm",
                  "focus:ring-0"
                )}
              />

              {/* Processing Indicator */}
              <AnimatePresence>
                {isProcessing && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0 }}
                    className="mr-1"
                  >
                    <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit Button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={(e) => { e.stopPropagation(); handleSubmit(); }}
                disabled={!inputValue.trim() || isProcessing}
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center",
                  "transition-all duration-300",
                  inputValue.trim()
                    ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                    : "bg-white/10 text-white/30"
                )}
              >
                <Send className="w-4 h-4" />
              </motion.button>

              {/* Collapse Button */}
              <button
                onClick={(e) => { e.stopPropagation(); setIsExpanded(false); }}
                className="ml-1 p-1 hover:bg-white/20 rounded-full transition-colors"
              >
                <ChevronDown className="w-3 h-3 text-white/60" />
              </button>
            </div>
          </motion.div>

          {/* Status Indicator - compact */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-center mt-1.5"
          >
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/40 backdrop-blur-sm border border-white/10">
              <div className={cn(
                "w-1.5 h-1.5 rounded-full",
                systemMode === 'idle' && "bg-green-400",
                systemMode === 'listening' && "bg-cyan-400 animate-pulse",
                systemMode === 'processing' && "bg-yellow-400 animate-pulse",
                systemMode === 'responding' && "bg-purple-400 animate-pulse"
              )} />
              <span className="text-[8px] font-mono text-white/50 uppercase">{systemMode}</span>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};

export default GenesisOmniBox;