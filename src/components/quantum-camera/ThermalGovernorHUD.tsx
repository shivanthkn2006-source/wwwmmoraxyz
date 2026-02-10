// ═══════════════════════════════════════════════════════════════════════════════
// THERMAL GOVERNOR HUD - Visual feedback for thermal management
// Shows device status and active power mode
// ═══════════════════════════════════════════════════════════════════════════════

import React from 'react';
import { Thermometer, Battery, Cpu, Zap, AlertTriangle, Snowflake } from 'lucide-react';
import type { ThermalMetrics, FeatureFlags, ThermalState, PowerMode } from '@/hooks/useThermalGovernor';

interface ThermalGovernorHUDProps {
  metrics: ThermalMetrics;
  featureFlags: FeatureFlags;
  isActive: boolean;
  onForceCooldown: () => void;
}

const getThermalColor = (state: ThermalState): string => {
  switch (state) {
    case 'cool': return 'text-cyan-400';
    case 'warm': return 'text-amber-400';
    case 'hot': return 'text-orange-500';
    case 'critical': return 'text-red-500';
  }
};

const getThermalBg = (state: ThermalState): string => {
  switch (state) {
    case 'cool': return 'bg-cyan-500/20 border-cyan-500/30';
    case 'warm': return 'bg-amber-500/20 border-amber-500/30';
    case 'hot': return 'bg-orange-500/20 border-orange-500/30';
    case 'critical': return 'bg-red-500/20 border-red-500/30 animate-pulse';
  }
};

const getPowerModeLabel = (mode: PowerMode): string => {
  switch (mode) {
    case 'performance': return 'PERFORMANCE';
    case 'balanced': return 'BALANCED';
    case 'powersave': return 'POWERSAVE';
    case 'emergency': return 'EMERGENCY';
  }
};

const getPowerModeColor = (mode: PowerMode): string => {
  switch (mode) {
    case 'performance': return 'text-green-400';
    case 'balanced': return 'text-cyan-400';
    case 'powersave': return 'text-amber-400';
    case 'emergency': return 'text-red-500';
  }
};

const ThermalGovernorHUD: React.FC<ThermalGovernorHUDProps> = ({
  metrics,
  featureFlags,
  isActive,
  onForceCooldown,
}) => {
  if (!isActive) return null;

  const thermalIcon = metrics.thermalState === 'cool' ? (
    <Snowflake className={`w-4 h-4 ${getThermalColor(metrics.thermalState)}`} />
  ) : (
    <Thermometer className={`w-4 h-4 ${getThermalColor(metrics.thermalState)}`} />
  );

  return (
    <div className={`rounded-lg p-3 border backdrop-blur-md ${getThermalBg(metrics.thermalState)}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {thermalIcon}
          <span className={`text-xs font-mono ${getThermalColor(metrics.thermalState)}`}>
            THERMAL GOVERNOR
          </span>
        </div>
        <span className={`text-[10px] font-mono ${getPowerModeColor(metrics.powerMode)}`}>
          {getPowerModeLabel(metrics.powerMode)}
        </span>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-2 text-[10px]">
        {/* CPU Load */}
        <div className="flex items-center gap-1">
          <Cpu className="w-3 h-3 text-gray-400" />
          <div className="flex-1">
            <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all ${
                  metrics.cpuLoad > 0.8 ? 'bg-red-500' : 
                  metrics.cpuLoad > 0.5 ? 'bg-amber-500' : 'bg-cyan-500'
                }`}
                style={{ width: `${metrics.cpuLoad * 100}%` }}
              />
            </div>
          </div>
          <span className="text-gray-400 w-8 text-right">{Math.round(metrics.cpuLoad * 100)}%</span>
        </div>

        {/* Memory */}
        <div className="flex items-center gap-1">
          <Zap className="w-3 h-3 text-gray-400" />
          <div className="flex-1">
            <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all ${
                  metrics.memoryPressure > 0.8 ? 'bg-red-500' : 
                  metrics.memoryPressure > 0.5 ? 'bg-amber-500' : 'bg-purple-500'
                }`}
                style={{ width: `${metrics.memoryPressure * 100}%` }}
              />
            </div>
          </div>
          <span className="text-gray-400 w-8 text-right">{Math.round(metrics.memoryPressure * 100)}%</span>
        </div>

        {/* Battery */}
        <div className="flex items-center gap-1 col-span-2">
          <Battery className={`w-3 h-3 ${metrics.isCharging ? 'text-green-400' : 'text-gray-400'}`} />
          <div className="flex-1">
            <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all ${
                  metrics.batteryLevel < 0.15 ? 'bg-red-500' : 
                  metrics.batteryLevel < 0.3 ? 'bg-amber-500' : 'bg-green-500'
                }`}
                style={{ width: `${metrics.batteryLevel * 100}%` }}
              />
            </div>
          </div>
          <span className="text-gray-400 w-8 text-right">
            {Math.round(metrics.batteryLevel * 100)}%
            {metrics.isCharging && '⚡'}
          </span>
        </div>
      </div>

      {/* Feature Status */}
      <div className="mt-2 pt-2 border-t border-white/10">
        <div className="flex flex-wrap gap-1">
          <FeatureBadge label="WebGL" enabled={featureFlags.enableWebGL} />
          <FeatureBadge label="Trinity" enabled={featureFlags.enableTrinityFilters} />
          <FeatureBadge label="Shield" enabled={featureFlags.enableSatelliteShield} />
          <FeatureBadge label="Audio" enabled={featureFlags.enableAudioAnalysis} />
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-[9px] text-gray-500">
            Shader: {featureFlags.maxShaderComplexity} | {featureFlags.targetFPS}fps
          </span>
          {(metrics.thermalState === 'hot' || metrics.thermalState === 'critical') && (
            <button
              onClick={onForceCooldown}
              className="text-[9px] text-red-400 hover:text-red-300 flex items-center gap-1"
            >
              <AlertTriangle className="w-3 h-3" />
              COOLDOWN
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const FeatureBadge: React.FC<{ label: string; enabled: boolean }> = ({ label, enabled }) => (
  <span className={`text-[8px] px-1.5 py-0.5 rounded ${
    enabled ? 'bg-green-500/20 text-green-400' : 'bg-gray-700/50 text-gray-500'
  }`}>
    {label}
  </span>
);

export default ThermalGovernorHUD;
