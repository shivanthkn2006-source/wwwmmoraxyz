/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ZOE INFINITY MAIL - IRONCLAD SHIELD UI
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * The Visual Security Layer:
 * - Pulsing Green Shield = Nexus Active
 * - Locking animation when sending encrypted data
 * - Real-time encryption status display
 */

import { memo, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, 
  ShieldCheck, 
  Lock, 
  Unlock,
  Wifi,
  WifiOff,
  Eye,
  EyeOff,
  Zap,
  Server,
} from 'lucide-react';
import { IroncladStatus } from '../types';

interface IroncladShieldProps {
  status: IroncladStatus;
  isTransmitting?: boolean;
  onToggle?: () => void;
  showDetails?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const IroncladShield = memo(function IroncladShield({
  status,
  isTransmitting = false,
  onToggle,
  showDetails = false,
  size = 'md',
}: IroncladShieldProps) {
  const [isLocking, setIsLocking] = useState(false);
  const [showStats, setShowStats] = useState(false);
  
  // Animate locking when transmitting
  useEffect(() => {
    if (isTransmitting) {
      setIsLocking(true);
      const timer = setTimeout(() => setIsLocking(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [isTransmitting]);
  
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };
  
  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };
  
  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };
  
  const getStatusColor = () => {
    if (!status.enabled) return 'text-white/30';
    if (!status.tunnelActive) return 'text-amber-400';
    return 'text-emerald-400';
  };
  
  const getGlowColor = () => {
    if (!status.enabled) return 'rgba(255, 255, 255, 0.1)';
    if (!status.tunnelActive) return 'rgba(251, 191, 36, 0.3)';
    if (isTransmitting) return 'rgba(34, 211, 238, 0.5)';
    return 'rgba(52, 211, 153, 0.3)';
  };

  return (
    <div className="relative">
      {/* Main Shield Button */}
      <motion.button
        onClick={() => {
          if (onToggle) onToggle();
          setShowStats(!showStats);
        }}
        className={`
          relative ${sizeClasses[size]} rounded-2xl
          flex items-center justify-center
          transition-all duration-300
          ${status.enabled 
            ? 'bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border-emerald-500/30' 
            : 'bg-white/5 border-white/10'
          }
          border hover:scale-105 active:scale-95
        `}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {/* Outer glow ring */}
        <motion.div
          className="absolute inset-0 rounded-2xl"
          animate={{
            boxShadow: status.enabled && status.tunnelActive
              ? [
                  `0 0 10px 2px ${getGlowColor()}`,
                  `0 0 20px 4px ${getGlowColor()}`,
                  `0 0 10px 2px ${getGlowColor()}`,
                ]
              : `0 0 5px 1px ${getGlowColor()}`,
          }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
        
        {/* Locking animation overlay */}
        <AnimatePresence>
          {isLocking && (
            <motion.div
              initial={{ scale: 1.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center
                         bg-cyan-500/20 rounded-2xl"
            >
              <motion.div
                animate={{ rotate: [0, 180, 360] }}
                transition={{ duration: 0.5 }}
              >
                <Lock className={`${iconSizes[size]} text-cyan-400`} />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Shield icon */}
        <div className={`relative ${getStatusColor()}`}>
          {status.enabled && status.tunnelActive ? (
            <motion.div
              animate={isTransmitting ? { scale: [1, 1.2, 1] } : {}}
              transition={{ duration: 0.3 }}
            >
              <ShieldCheck className={iconSizes[size]} />
            </motion.div>
          ) : status.enabled ? (
            <Shield className={iconSizes[size]} />
          ) : (
            <Unlock className={iconSizes[size]} />
          )}
        </div>
        
        {/* Status indicator dot */}
        <motion.div
          className={`
            absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full
            border-2 border-black
            ${status.enabled && status.tunnelActive 
              ? 'bg-emerald-400' 
              : status.enabled 
                ? 'bg-amber-400'
                : 'bg-white/30'
            }
          `}
          animate={status.enabled && status.tunnelActive ? {
            scale: [1, 1.2, 1],
          } : {}}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </motion.button>
      
      {/* Details Popup */}
      <AnimatePresence>
        {(showDetails || showStats) && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute top-full left-1/2 -translate-x-1/2 mt-3
                       w-64 p-4 rounded-2xl z-50
                       bg-black/90 border border-white/10
                       backdrop-blur-xl shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  status.enabled && status.tunnelActive 
                    ? 'bg-emerald-400' 
                    : status.enabled 
                      ? 'bg-amber-400'
                      : 'bg-white/30'
                }`} />
                <span className="text-sm font-medium text-white">
                  {status.enabled && status.tunnelActive 
                    ? 'Ironclad Active' 
                    : status.enabled 
                      ? 'Tunnel Connecting...'
                      : 'Ironclad Disabled'
                  }
                </span>
              </div>
              <button
                onClick={() => setShowStats(false)}
                className="p-1 rounded text-white/40 hover:text-white/70 transition-colors"
              >
                <EyeOff className="w-4 h-4" />
              </button>
            </div>
            
            {/* Stats Grid */}
            <div className="space-y-3">
              {/* Encryption Level */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-white/5">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs text-white/60">Encryption</span>
                </div>
                <span className="text-xs text-cyan-300 font-mono uppercase">
                  {status.encryptionLevel || 'AES-256'}
                </span>
              </div>
              
              {/* Exit Node */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-white/5">
                <div className="flex items-center gap-2">
                  <Server className="w-4 h-4 text-violet-400" />
                  <span className="text-xs text-white/60">Exit Node</span>
                </div>
                <span className="text-xs text-violet-300 font-mono">
                  {status.exitNode || 'Auto'}
                </span>
              </div>
              
              {/* IP Status */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-white/5">
                <div className="flex items-center gap-2">
                  {status.ipMasked ? (
                    <EyeOff className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Eye className="w-4 h-4 text-amber-400" />
                  )}
                  <span className="text-xs text-white/60">IP Address</span>
                </div>
                <span className={`text-xs font-mono ${
                  status.ipMasked ? 'text-emerald-300' : 'text-amber-300'
                }`}>
                  {status.ipMasked ? 'MASKED' : 'VISIBLE'}
                </span>
              </div>
              
              {/* Data Encrypted */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-white/5">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-400" />
                  <span className="text-xs text-white/60">Data Secured</span>
                </div>
                <span className="text-xs text-yellow-300 font-mono">
                  {formatBytes(status.bytesEncrypted)}
                </span>
              </div>
              
              {/* Connection Status */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-white/5">
                <div className="flex items-center gap-2">
                  {status.tunnelActive ? (
                    <Wifi className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <WifiOff className="w-4 h-4 text-red-400" />
                  )}
                  <span className="text-xs text-white/60">Tunnel</span>
                </div>
                <span className={`text-xs font-mono ${
                  status.tunnelActive ? 'text-emerald-300' : 'text-red-300'
                }`}>
                  {status.tunnelActive ? 'CONNECTED' : 'OFFLINE'}
                </span>
              </div>
            </div>
            
            {/* Last Handshake */}
            {status.lastHandshake && (
              <p className="text-[10px] text-white/30 text-center mt-3">
                Last handshake: {new Date(status.lastHandshake).toLocaleTimeString()}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

export default IroncladShield;
