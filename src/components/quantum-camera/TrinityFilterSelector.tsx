// ═══════════════════════════════════════════════════════════════════════════════
// PROJECT OPTIC-X: Trinity Filter Selector UI
// Select between Chronos Echo, DHF Soul-Ray, and Quantum Flux filters
// Shows real-time ECN and security state for each filter
// ═══════════════════════════════════════════════════════════════════════════════

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Heart, Shield, X, Wifi, Brain, Lock } from 'lucide-react';
import { TrinityFilterType } from './TrinityFilterShaders';
import { TrinityFilterState } from '@/hooks/useTrinityFilters';
import { Button } from '@/components/ui/button';

interface TrinityFilterSelectorProps {
  activeFilter: TrinityFilterType;
  onSelectFilter: (filter: TrinityFilterType) => void;
  filterState: TrinityFilterState;
  onSimulateECN?: (scenario: 'stress' | 'flow' | 'neutral') => void;
}

const FILTER_INFO = {
  'chronos-echo': {
    name: 'CHRONOS ECHO',
    subtitle: 'Time Security',
    icon: Clock,
    color: 'from-cyan-500 to-blue-600',
    borderColor: 'border-cyan-500/50',
    description: 'Time trails with anti-deepfake verification',
  },
  'dhf-soul-ray': {
    name: 'DHF SOUL-RAY',
    subtitle: 'Bio-Feedback',
    icon: Heart,
    color: 'from-purple-500 to-pink-600',
    borderColor: 'border-purple-500/50',
    description: 'ECN-reactive bio-luminescent halo',
  },
  'quantum-flux': {
    name: 'QUANTUM FLUX',
    subtitle: 'Encryption Visualizer',
    icon: Shield,
    color: 'from-green-500 to-emerald-600',
    borderColor: 'border-green-500/50',
    description: 'Security encryption visualization',
  },
};

const TrinityFilterSelector: React.FC<TrinityFilterSelectorProps> = ({
  activeFilter,
  onSelectFilter,
  filterState,
  onSimulateECN,
}) => {
  const filters: TrinityFilterType[] = ['chronos-echo', 'dhf-soul-ray', 'quantum-flux'];

  return (
    <div className="space-y-3">
      {/* Filter Selection */}
      <div className="bg-black/70 backdrop-blur-md rounded-lg p-3 border border-white/10">
        <div className="text-xs font-mono text-gray-400 mb-2 flex items-center gap-2">
          <Shield className="w-3 h-3" />
          TRINITY FILTERS
        </div>
        
        <div className="space-y-2">
          {filters.map((filter) => {
            const info = FILTER_INFO[filter];
            const Icon = info.icon;
            const isActive = activeFilter === filter;
            
            return (
              <motion.button
                key={filter}
                onClick={() => onSelectFilter(isActive ? 'none' : filter)}
                className={`w-full flex items-center gap-3 p-2 rounded-lg border transition-all ${
                  isActive
                    ? `bg-gradient-to-r ${info.color} border-transparent`
                    : `bg-black/40 ${info.borderColor} hover:bg-black/60`
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                <div className="text-left flex-1">
                  <div className={`text-xs font-bold ${isActive ? 'text-white' : 'text-gray-300'}`}>
                    {info.name}
                  </div>
                  <div className={`text-[10px] ${isActive ? 'text-white/80' : 'text-gray-500'}`}>
                    {info.subtitle}
                  </div>
                </div>
                {isActive && (
                  <X className="w-4 h-4 text-white/60" />
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Active Filter Status */}
      <AnimatePresence>
        {activeFilter !== 'none' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-black/70 backdrop-blur-md rounded-lg p-3 border border-white/10"
          >
            {/* Chronos Echo Status */}
            {activeFilter === 'chronos-echo' && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-cyan-400">
                  <Wifi className="w-4 h-4" />
                  <span className="text-xs font-mono">LATENCY</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    filterState.latency.current < 50 
                      ? 'bg-green-400' 
                      : filterState.latency.current < 100 
                        ? 'bg-yellow-400' 
                        : 'bg-red-400'
                  }`} />
                  <span className="text-lg font-mono text-white">
                    {filterState.latency.current}ms
                  </span>
                  <span className="text-xs text-gray-500">
                    (avg: {filterState.latency.average}ms)
                  </span>
                </div>
                <div className="text-[10px] font-mono text-cyan-300 bg-cyan-500/10 px-2 py-1 rounded">
                  HASH: {filterState.rollingHash}
                </div>
                <div className="text-[10px] text-gray-500">
                  {filterState.latency.isStable 
                    ? '✓ Ghost trails active' 
                    : '⚠ High latency - trails dissolving'}
                </div>
              </div>
            )}

            {/* DHF Soul-Ray Status */}
            {activeFilter === 'dhf-soul-ray' && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-purple-400">
                  <Brain className="w-4 h-4" />
                  <span className="text-xs font-mono">ECN STATE</span>
                </div>
                
                {/* Stress/Flow Meters */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-red-400 w-12">STRESS</span>
                    <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-red-500 to-orange-500"
                        animate={{ width: `${filterState.ecn.stressLevel * 100}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                    <span className="text-[10px] text-gray-400 w-8">
                      {Math.round(filterState.ecn.stressLevel * 100)}%
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-cyan-400 w-12">FLOW</span>
                    <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
                        animate={{ width: `${filterState.ecn.flowLevel * 100}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                    <span className="text-[10px] text-gray-400 w-8">
                      {Math.round(filterState.ecn.flowLevel * 100)}%
                    </span>
                  </div>
                </div>
                
                <div className="text-[10px] text-gray-500 capitalize">
                  Current: {filterState.ecn.currentEmotion}
                </div>
                
                {/* ECN Simulation Buttons */}
                {onSimulateECN && (
                  <div className="flex gap-1 mt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-[10px] h-6 px-2 border-red-500/30 hover:bg-red-500/20"
                      onClick={() => onSimulateECN('stress')}
                    >
                      Stress
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-[10px] h-6 px-2 border-cyan-500/30 hover:bg-cyan-500/20"
                      onClick={() => onSimulateECN('flow')}
                    >
                      Flow
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-[10px] h-6 px-2 border-gray-500/30 hover:bg-gray-500/20"
                      onClick={() => onSimulateECN('neutral')}
                    >
                      Neutral
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Quantum Flux Status */}
            {activeFilter === 'quantum-flux' && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-green-400">
                  <Lock className="w-4 h-4" />
                  <span className="text-xs font-mono">ENCRYPTION</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    filterState.security.securityLevel > 0.8 
                      ? 'bg-green-400' 
                      : filterState.security.securityLevel > 0.5 
                        ? 'bg-yellow-400' 
                        : 'bg-red-400'
                  }`} />
                  <span className="text-lg font-mono text-white">
                    {Math.round(filterState.security.securityLevel * 100)}%
                  </span>
                  <span className="text-xs text-gray-500">
                    Security Level
                  </span>
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-gray-500">Decryption Match:</span>
                    <span className={filterState.security.decryptionMatch > 0.8 ? 'text-green-400' : 'text-red-400'}>
                      {Math.round(filterState.security.decryptionMatch * 100)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-gray-500">Authentication:</span>
                    <span className={filterState.security.isAuthenticated ? 'text-green-400' : 'text-red-400'}>
                      {filterState.security.isAuthenticated ? 'VERIFIED' : 'PENDING'}
                    </span>
                  </div>
                </div>
                
                <div className="text-[10px] text-gray-500">
                  Mode cycles: Wireframe → Solid → Light
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TrinityFilterSelector;
