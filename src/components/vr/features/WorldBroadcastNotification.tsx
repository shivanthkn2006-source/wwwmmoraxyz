// ═══════════════════════════════════════════════════════════════════════════════
// WORLD BROADCAST NOTIFICATION - Full-screen announcements for VR world
// Displays admin broadcasts with cinematic styling
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Radio, X } from 'lucide-react';

interface BroadcastMessage {
  id: string;
  message: string;
  from: string;
  timestamp: Date;
}

interface WorldBroadcastNotificationProps {
  onClose?: () => void;
}

export const WorldBroadcastNotification: React.FC<WorldBroadcastNotificationProps> = ({
  onClose,
}) => {
  const [broadcasts, setBroadcasts] = useState<BroadcastMessage[]>([]);
  const [currentBroadcast, setCurrentBroadcast] = useState<BroadcastMessage | null>(null);

  // Listen for world broadcast events
  useEffect(() => {
    const handleWorldEvent = (e: CustomEvent) => {
      const { event, data, from } = e.detail;
      
      if (event === 'broadcast') {
        const broadcast: BroadcastMessage = {
          id: crypto.randomUUID(),
          message: data.message,
          from: from || 'Admin',
          timestamp: new Date(),
        };
        
        setBroadcasts(prev => [...prev, broadcast]);
        setCurrentBroadcast(broadcast);
        
        // Auto-dismiss after 8 seconds
        setTimeout(() => {
          setCurrentBroadcast(prev => prev?.id === broadcast.id ? null : prev);
        }, 8000);
      }
      
      if (event === 'world_reset') {
        const resetNotification: BroadcastMessage = {
          id: crypto.randomUUID(),
          message: '⚠️ WORLD STATE RESET ⚠️',
          from: 'System',
          timestamp: new Date(),
        };
        setCurrentBroadcast(resetNotification);
        setTimeout(() => setCurrentBroadcast(null), 5000);
      }
      
      if (event === 'summon') {
        const summonNotification: BroadcastMessage = {
          id: crypto.randomUUID(),
          message: '🌀 Admin is summoning you! Teleporting...',
          from: 'System',
          timestamp: new Date(),
        };
        setCurrentBroadcast(summonNotification);
        setTimeout(() => setCurrentBroadcast(null), 4000);
      }
    };

    window.addEventListener('multiplayer-world-event', handleWorldEvent as EventListener);
    
    return () => {
      window.removeEventListener('multiplayer-world-event', handleWorldEvent as EventListener);
    };
  }, []);

  const dismissBroadcast = useCallback(() => {
    setCurrentBroadcast(null);
    onClose?.();
  }, [onClose]);

  return (
    <AnimatePresence>
      {currentBroadcast && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] w-[90%] max-w-lg"
        >
          <div 
            className="relative bg-gradient-to-r from-cyan-900/90 via-purple-900/90 to-cyan-900/90 backdrop-blur-xl rounded-lg border border-cyan-500/50 shadow-2xl shadow-cyan-500/30 overflow-hidden"
            style={{
              fontFamily: "'Orbitron', 'Space Grotesk', sans-serif",
            }}
          >
            {/* Animated border glow - GPU Accelerated */}
            <div className="absolute inset-0 rounded-lg animate-gpu-glow-cyan" />
            
            {/* Top accent line - GPU Accelerated */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-gpu-pulse-opacity" />

            <div className="relative p-4">
              {/* Header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="animate-gpu-scale-bounce-fast">
                    <Radio className="w-4 h-4 text-cyan-400" />
                  </div>
                  <span className="text-cyan-300 text-xs font-bold tracking-widest uppercase">
                    World Broadcast
                  </span>
                </div>
                
                <button
                  onClick={dismissBroadcast}
                  className="p-1 rounded-full hover:bg-white/10 transition-colors text-white/50 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Message */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-white text-base font-medium leading-relaxed"
              >
                {currentBroadcast.message}
              </motion.p>

              {/* Footer */}
              <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/10">
                <span className="text-white/40 text-[10px] font-mono">
                  From: {currentBroadcast.from}
                </span>
                <span className="text-white/30 text-[10px] font-mono">
                  {currentBroadcast.timestamp.toLocaleTimeString()}
                </span>
              </div>
            </div>

            {/* Bottom progress bar for auto-dismiss */}
            <motion.div
              className="absolute bottom-0 left-0 h-0.5 bg-cyan-400"
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: 8, ease: 'linear' }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default WorldBroadcastNotification;
