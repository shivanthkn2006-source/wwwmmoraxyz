/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ZOE INFINITY MAIL - GATEKEEPER ORB
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * The "Breathing Light" that represents Zoe's Gatekeeper watching over your inbox.
 * Shows real-time scanning status and processing activity.
 */

import { memo } from 'react';
import { motion } from 'framer-motion';
import { Shield, ShieldCheck, Eye, Sparkles } from 'lucide-react';

interface GatekeeperOrbProps {
  isActive: boolean;
  isProcessing: boolean;
  processingCount?: number;
  spamBlockedToday?: number;
  onClick?: () => void;
}

export const GatekeeperOrb = memo(function GatekeeperOrb({
  isActive,
  isProcessing,
  processingCount = 0,
  spamBlockedToday = 0,
  onClick,
}: GatekeeperOrbProps) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="relative flex flex-col items-center gap-2 p-4 rounded-2xl
                 bg-black/40 border border-white/5 hover:border-white/10
                 transition-colors cursor-pointer group"
    >
      {/* The Orb */}
      <div className="relative w-16 h-16">
        {/* Outer glow ring */}
        <motion.div
          className="absolute inset-0 rounded-full"
          animate={isProcessing ? {
            boxShadow: [
              '0 0 20px 5px rgba(34, 211, 238, 0.3)',
              '0 0 40px 10px rgba(34, 211, 238, 0.5)',
              '0 0 20px 5px rgba(34, 211, 238, 0.3)',
            ],
          } : {
            boxShadow: isActive
              ? '0 0 20px 5px rgba(52, 211, 153, 0.3)'
              : '0 0 10px 2px rgba(255, 255, 255, 0.1)',
          }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        />
        
        {/* Inner breathing light */}
        <motion.div
          className="absolute inset-2 rounded-full"
          style={{
            background: isProcessing
              ? 'radial-gradient(circle, rgba(34, 211, 238, 0.6) 0%, rgba(34, 211, 238, 0.1) 70%, transparent 100%)'
              : isActive
                ? 'radial-gradient(circle, rgba(52, 211, 153, 0.5) 0%, rgba(52, 211, 153, 0.1) 70%, transparent 100%)'
                : 'radial-gradient(circle, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.05) 70%, transparent 100%)',
          }}
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.8, 1, 0.8],
          }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        />
        
        {/* Center icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          {isProcessing ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            >
              <Eye className="w-6 h-6 text-cyan-400" />
            </motion.div>
          ) : isActive ? (
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
          ) : (
            <Shield className="w-6 h-6 text-white/40" />
          )}
        </div>
        
        {/* Processing particles */}
        {isProcessing && (
          <div className="absolute inset-0">
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 rounded-full bg-cyan-400"
                style={{
                  top: '50%',
                  left: '50%',
                }}
                animate={{
                  x: [0, Math.cos(i * 60 * Math.PI / 180) * 30],
                  y: [0, Math.sin(i * 60 * Math.PI / 180) * 30],
                  opacity: [1, 0],
                  scale: [1, 0.5],
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  delay: i * 0.15,
                  ease: 'easeOut',
                }}
              />
            ))}
          </div>
        )}
      </div>
      
      {/* Status text */}
      <div className="text-center">
        <p className={`text-xs font-medium ${
          isProcessing 
            ? 'text-cyan-400' 
            : isActive 
              ? 'text-emerald-400' 
              : 'text-white/40'
        }`}>
          {isProcessing 
            ? `Scanning ${processingCount}...` 
            : isActive 
              ? 'Gatekeeper Active' 
              : 'Gatekeeper Idle'
          }
        </p>
        
        {spamBlockedToday > 0 && (
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-[10px] text-white/30 mt-0.5 flex items-center justify-center gap-1"
          >
            <Sparkles className="w-2.5 h-2.5" />
            <span>{spamBlockedToday} spam blocked today</span>
          </motion.p>
        )}
      </div>
    </motion.button>
  );
});

export default GatekeeperOrb;
