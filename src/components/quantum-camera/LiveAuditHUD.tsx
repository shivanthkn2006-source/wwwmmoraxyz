// ═══════════════════════════════════════════════════════════════════════════════
// PROJECT OPTIC-X: PHASE 4 - Live Audit HUD
// Real-time visualization of God Mode verification tests
// Soul-Ray | Quantum Flux | Chronos Echo status display
// ═══════════════════════════════════════════════════════════════════════════════

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, 
  Eye, 
  Clock, 
  Shield, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Play,
  Zap,
  Brain,
  Lock,
  Timer
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { LiveAuditState } from '@/hooks/useLiveAudit';

interface LiveAuditHUDProps {
  auditState: LiveAuditState;
  onRunAudit: () => void;
  onSimulate?: (scenario: 'stress' | 'flow' | 'unauthorized' | 'high-latency') => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

const StatusIcon: React.FC<{ status: string }> = ({ status }) => {
  switch (status) {
    case 'passed':
      return <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />;
    case 'failed':
      return <XCircle className="w-3.5 h-3.5 text-red-400" />;
    case 'warning':
      return <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" />;
    case 'running':
      return <Activity className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />;
    default:
      return <Timer className="w-3.5 h-3.5 text-gray-500" />;
  }
};

const getScoreColor = (score: number): string => {
  if (score >= 80) return 'text-green-400';
  if (score >= 50) return 'text-yellow-400';
  return 'text-red-400';
};

const getScoreBg = (score: number): string => {
  if (score >= 80) return 'bg-green-500/20 border-green-500/50';
  if (score >= 50) return 'bg-yellow-500/20 border-yellow-500/50';
  return 'bg-red-500/20 border-red-500/50';
};

const LiveAuditHUD: React.FC<LiveAuditHUDProps> = ({
  auditState,
  onRunAudit,
  onSimulate,
  isExpanded = false,
}) => {
  const { soulRay, quantumFlux, chronos, overallScore, isRunning, lastAuditTime } = auditState;

  return (
    <div className="space-y-2">
      {/* Header with Overall Score */}
      <div className={`bg-black/70 backdrop-blur-md rounded-lg p-3 border ${getScoreBg(overallScore)}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-mono text-gray-300">LIVE AUDIT</span>
          </div>
          
          <div className="flex items-center gap-2">
            <span className={`text-lg font-bold font-mono ${getScoreColor(overallScore)}`}>
              {overallScore}%
            </span>
            
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-[10px] text-amber-400 hover:text-amber-300"
              onClick={onRunAudit}
              disabled={isRunning}
            >
              {isRunning ? (
                <Activity className="w-3 h-3 animate-spin" />
              ) : (
                <>
                  <Play className="w-3 h-3 mr-1" />
                  RUN
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Score Bar */}
        <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
          <motion.div
            className={`h-full ${
              overallScore >= 80
                ? 'bg-gradient-to-r from-green-500 to-emerald-400'
                : overallScore >= 50
                ? 'bg-gradient-to-r from-yellow-500 to-amber-400'
                : 'bg-gradient-to-r from-red-500 to-orange-400'
            }`}
            initial={{ width: 0 }}
            animate={{ width: `${overallScore}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>

        {lastAuditTime && (
          <div className="text-[9px] text-gray-500 mt-1">
            Last audit: {new Date(lastAuditTime).toLocaleTimeString()}
          </div>
        )}
      </div>

      {/* Test Results */}
      <AnimatePresence>
        {(isExpanded || overallScore < 100) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            {/* Soul-Ray Test */}
            <div className="bg-black/70 backdrop-blur-md rounded-lg p-2.5 border border-rose-500/30">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <Brain className="w-3.5 h-3.5 text-rose-400" />
                  <span className="text-[10px] font-mono text-rose-300">SOUL-RAY (ECN)</span>
                </div>
                <StatusIcon status={soulRay.status} />
              </div>
              
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[9px]">
                <div className="flex justify-between">
                  <span className="text-gray-500">HALO</span>
                  <span className={soulRay.haloColor === 'red' ? 'text-red-400' : soulRay.haloColor === 'cyan' ? 'text-cyan-400' : 'text-purple-400'}>
                    {soulRay.haloColor.toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">PATTERN</span>
                  <span className={soulRay.haloPattern === 'jagged' ? 'text-red-400' : 'text-cyan-400'}>
                    {soulRay.haloPattern.toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">STRESS</span>
                  <span className={soulRay.stressDetected ? 'text-red-400' : 'text-green-400'}>
                    {Math.round(soulRay.ecnReading.stress * 100)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">FLOW</span>
                  <span className={soulRay.flowDetected ? 'text-cyan-400' : 'text-gray-400'}>
                    {Math.round(soulRay.ecnReading.flow * 100)}%
                  </span>
                </div>
              </div>

              {/* Simulation buttons */}
              {onSimulate && (
                <div className="flex gap-1 mt-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-5 px-1.5 text-[8px] text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    onClick={() => onSimulate('stress')}
                  >
                    STRESS
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-5 px-1.5 text-[8px] text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10"
                    onClick={() => onSimulate('flow')}
                  >
                    FLOW
                  </Button>
                </div>
              )}
            </div>

            {/* Quantum Flux Test */}
            <div className="bg-black/70 backdrop-blur-md rounded-lg p-2.5 border border-purple-500/30">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-purple-400" />
                  <span className="text-[10px] font-mono text-purple-300">QUANTUM FLUX</span>
                </div>
                <StatusIcon status={quantumFlux.status} />
              </div>
              
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[9px]">
                <div className="flex justify-between">
                  <span className="text-gray-500">AUTH</span>
                  <span className={quantumFlux.viewerAuthenticated ? 'text-green-400' : 'text-red-400'}>
                    {quantumFlux.viewerAuthenticated ? 'YES' : 'NO'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">ENCRYPT</span>
                  <span className={quantumFlux.encryptionActive ? 'text-green-400' : 'text-red-400'}>
                    {quantumFlux.encryptionActive ? 'ACTIVE' : 'OFF'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">DECRYPT</span>
                  <span className="text-purple-400">
                    {Math.round(quantumFlux.decryptionMatch * 100)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">STATIC</span>
                  <span className={quantumFlux.staticDisplayed ? 'text-yellow-400' : 'text-gray-400'}>
                    {quantumFlux.staticDisplayed ? 'SHOWN' : 'HIDDEN'}
                  </span>
                </div>
              </div>

              {onSimulate && (
                <div className="flex gap-1 mt-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-5 px-1.5 text-[8px] text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10"
                    onClick={() => onSimulate('unauthorized')}
                  >
                    UNAUTH
                  </Button>
                </div>
              )}
            </div>

            {/* Chronos Echo Test */}
            <div className="bg-black/70 backdrop-blur-md rounded-lg p-2.5 border border-cyan-500/30">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-[10px] font-mono text-cyan-300">CHRONOS ECHO</span>
                </div>
                <StatusIcon status={chronos.status} />
              </div>
              
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[9px]">
                <div className="flex justify-between">
                  <span className="text-gray-500">GHOSTS</span>
                  <span className={chronos.ghostsVisible ? 'text-cyan-400' : 'text-red-400'}>
                    {chronos.ghostsVisible ? `${chronos.ghostCount} VISIBLE` : 'DISSOLVING'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">LATENCY</span>
                  <span className={chronos.latency < 50 ? 'text-green-400' : chronos.latency < 100 ? 'text-yellow-400' : 'text-red-400'}>
                    {chronos.latency}ms
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">HASH</span>
                  <span className={chronos.rollingHashActive ? 'text-green-400' : 'text-red-400'}>
                    {chronos.rollingHashActive ? 'ROLLING' : 'STATIC'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">H/SEC</span>
                  <span className="text-cyan-400">
                    {chronos.hashChangesPerSecond}
                  </span>
                </div>
              </div>

              {/* Current Hash Display */}
              <div className="mt-1.5 bg-black/40 rounded px-1.5 py-0.5">
                <span className="text-[8px] font-mono text-cyan-400/70">
                  {chronos.currentHash}
                </span>
              </div>

              {onSimulate && (
                <div className="flex gap-1 mt-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-5 px-1.5 text-[8px] text-orange-400 hover:text-orange-300 hover:bg-orange-500/10"
                    onClick={() => onSimulate('high-latency')}
                  >
                    HIGH LAT
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LiveAuditHUD;
