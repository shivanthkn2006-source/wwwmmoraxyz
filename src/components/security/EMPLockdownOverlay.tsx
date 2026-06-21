// ═══════════════════════════════════════════════════════════════════════════════
// EMP LOCKDOWN OVERLAY - Visual indicator when EMP Protocol is active
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, AlertTriangle, Lock, Clock } from 'lucide-react';
import { useGodModeSovereign } from './GodModeSovereignProvider';

interface EMPLockdownOverlayProps {
  enabled?: boolean;
}

export const EMPLockdownOverlay: React.FC<EMPLockdownOverlayProps> = ({ 
  enabled = true 
}) => {
  const { empState, isLockdownActive } = useGodModeSovereign();
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  // Calculate time remaining until auto-release
  useEffect(() => {
    if (!empState.autoReleaseAt) return;

    const updateTimer = () => {
      const now = Date.now();
      const releaseAt = new Date(empState.autoReleaseAt!).getTime();
      const diff = releaseAt - now;

      if (diff <= 0) {
        setTimeRemaining('Releasing...');
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeRemaining(`${minutes}m ${seconds}s`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [empState.autoReleaseAt]);

  if (!enabled || !isLockdownActive) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] pointer-events-none"
      >
        {/* Red warning border */}
        <div className="absolute inset-0 border-4 border-destructive animate-pulse" />
        
        {/* Top banner */}
        <motion.div
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          className="absolute top-0 left-0 right-0 bg-destructive/95 text-destructive-foreground py-3 px-4 pointer-events-auto"
        >
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center gap-3">
              <Shield className="w-6 h-6 animate-pulse" />
              <div>
                <h3 className="font-bold text-lg">⚡ EMP PROTOCOL ACTIVE</h3>
                <p className="text-sm opacity-90">
                  External connections blocked due to security threat
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Trigger reason */}
              <div className="flex items-center gap-2 bg-background/10 px-3 py-1 rounded">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {empState.triggeredBy?.replace(/_/g, ' ').toUpperCase()}
                </span>
              </div>
              
              {/* Auto-release timer */}
              {empState.autoReleaseAt && (
                <div className="flex items-center gap-2 bg-background/10 px-3 py-1 rounded">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm font-mono">{timeRemaining}</span>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Corner lock indicators */}
        <div className="absolute top-20 left-4 bg-destructive/20 backdrop-blur-sm rounded-lg p-3 pointer-events-auto">
          <div className="flex items-center gap-2 text-destructive">
            <Lock className="w-5 h-5" />
            <span className="text-sm font-medium">External APIs Blocked</span>
          </div>
        </div>

        <div className="absolute top-20 right-4 bg-destructive/20 backdrop-blur-sm rounded-lg p-3 pointer-events-auto">
          <div className="flex items-center gap-2 text-destructive">
            <Lock className="w-5 h-5" />
            <span className="text-sm font-medium">Data Export Blocked</span>
          </div>
        </div>

        {/* Affected services list (bottom) */}
        {empState.affectedServices.length > 0 && (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            className="absolute bottom-4 left-4 right-4 bg-background/95 backdrop-blur-sm border border-destructive/50 rounded-lg p-4 pointer-events-auto"
          >
            <div className="flex items-center gap-2 mb-2 text-destructive">
              <Shield className="w-4 h-4" />
              <span className="font-semibold text-sm">Protected Services</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {empState.affectedServices.map((service) => (
                <span
                  key={service}
                  className="bg-destructive/10 text-destructive text-xs px-2 py-1 rounded border border-destructive/30"
                >
                  {service.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default EMPLockdownOverlay;
