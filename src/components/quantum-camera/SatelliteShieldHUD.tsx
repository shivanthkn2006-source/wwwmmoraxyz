// ═══════════════════════════════════════════════════════════════════════════════
// PROJECT OPTIC-X: Satellite Shield HUD
// Visual overlay for optical encryption status and Protocol EMP alerts
// ═══════════════════════════════════════════════════════════════════════════════

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ShieldAlert, ShieldCheck, Satellite, Zap, Lock, Unlock, Radio } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { SatelliteShieldState } from '@/hooks/useSatelliteShield';

interface SatelliteShieldHUDProps {
  state: SatelliteShieldState;
  onActivate: () => void;
  onDeactivate: () => void;
  onResetEMP: () => void;
}

const SatelliteShieldHUD: React.FC<SatelliteShieldHUDProps> = ({
  state,
  onActivate,
  onDeactivate,
  onResetEMP,
}) => {
  const getEncryptionColor = () => {
    if (state.protocolEMPTriggered) return 'text-red-500';
    if (state.encryptionStrength >= 75) return 'text-green-400';
    if (state.encryptionStrength >= 50) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getLatencyStatus = () => {
    if (state.satelliteLatency < 100) return { color: 'text-green-400', label: 'OPTIMAL' };
    if (state.satelliteLatency < 500) return { color: 'text-yellow-400', label: 'STABLE' };
    if (state.satelliteLatency < 2000) return { color: 'text-orange-400', label: 'DEGRADED' };
    return { color: 'text-red-400', label: 'CRITICAL' };
  };

  const latencyStatus = getLatencyStatus();

  return (
    <div className="space-y-3">
      {/* Main Shield Status */}
      <div className="bg-black/70 backdrop-blur-md rounded-lg p-3 border border-emerald-500/30">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {state.protocolEMPTriggered ? (
              <ShieldAlert className="w-4 h-4 text-red-500 animate-pulse" />
            ) : state.isActive ? (
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            ) : (
              <Shield className="w-4 h-4 text-gray-500" />
            )}
            <span className="text-xs font-mono text-gray-300">SATELLITE SHIELD</span>
          </div>
          
          <Button
            size="sm"
            variant="ghost"
            className={`h-6 px-2 text-[10px] ${
              state.isActive
                ? 'text-emerald-400 hover:text-emerald-300'
                : 'text-gray-500 hover:text-gray-400'
            }`}
            onClick={state.isActive ? onDeactivate : onActivate}
          >
            {state.isActive ? (
              <>
                <Lock className="w-3 h-3 mr-1" />
                ACTIVE
              </>
            ) : (
              <>
                <Unlock className="w-3 h-3 mr-1" />
                INACTIVE
              </>
            )}
          </Button>
        </div>

        {/* Encryption Strength Meter */}
        {state.isActive && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-gray-500">ENCRYPTION</span>
              <span className={getEncryptionColor()}>
                {state.encryptionStrength}%
              </span>
            </div>
            <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
              <motion.div
                className={`h-full ${
                  state.protocolEMPTriggered
                    ? 'bg-red-500'
                    : state.encryptionStrength >= 75
                    ? 'bg-gradient-to-r from-emerald-500 to-green-400'
                    : state.encryptionStrength >= 50
                    ? 'bg-gradient-to-r from-yellow-500 to-amber-400'
                    : 'bg-gradient-to-r from-red-500 to-orange-400'
                }`}
                initial={{ width: 0 }}
                animate={{ width: `${state.encryptionStrength}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>

            {/* Steganography Status */}
            <div className="flex items-center gap-2 text-[10px]">
              <Radio className={`w-3 h-3 ${state.steganographyActive ? 'text-cyan-400 animate-pulse' : 'text-gray-600'}`} />
              <span className={state.steganographyActive ? 'text-cyan-400' : 'text-gray-600'}>
                STEGANOGRAPHY: {state.steganographyActive ? 'EMBEDDING' : 'OFFLINE'}
              </span>
            </div>

            {/* Signature Hash */}
            {state.lastSignature && (
              <div className="bg-black/40 rounded px-2 py-1">
                <div className="text-[8px] text-gray-500 mb-0.5">ZOE SIGNATURE</div>
                <div className="text-[10px] font-mono text-emerald-400">
                  {state.lastSignature.hash}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Satellite Telemetry */}
      {state.isActive && (
        <div className="bg-black/70 backdrop-blur-md rounded-lg p-3 border border-cyan-500/30">
          <div className="flex items-center gap-2 mb-2">
            <Satellite className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-mono text-gray-300">SATELLITE LINK</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div>
              <span className="text-gray-500">LATENCY</span>
              <div className={`font-mono ${latencyStatus.color}`}>
                {state.satelliteLatency}ms
              </div>
            </div>
            <div>
              <span className="text-gray-500">STATUS</span>
              <div className={`font-mono ${latencyStatus.color}`}>
                {latencyStatus.label}
              </div>
            </div>
            <div>
              <span className="text-gray-500">CHALLENGES</span>
              <div className="font-mono text-purple-400">
                {state.challengePixelsAcknowledged}/{state.challengePixelsSent}
              </div>
            </div>
            <div>
              <span className="text-gray-500">FAILURES</span>
              <div className={`font-mono ${state.consecutiveFailures > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
                {state.consecutiveFailures}/3
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Protocol EMP Alert */}
      <AnimatePresence>
        {state.protocolEMPTriggered && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-red-900/80 backdrop-blur-md rounded-lg p-3 border border-red-500/50"
          >
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-5 h-5 text-red-400 animate-pulse" />
              <span className="text-sm font-bold text-red-300">PROTOCOL EMP ACTIVE</span>
            </div>
            
            <p className="text-xs text-red-200 mb-3">
              {state.empReason || 'Security breach detected. Video feed corrupted.'}
            </p>
            
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="destructive"
                className="text-xs h-7"
                onClick={onResetEMP}
              >
                MANUAL OVERRIDE
              </Button>
              <span className="text-[10px] text-red-400/70 flex items-center">
                Auto-recovery in 5s...
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SatelliteShieldHUD;
