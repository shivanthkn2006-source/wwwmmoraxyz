// ═══════════════════════════════════════════════════════════════════════════════
// QUANTUM BRIDGE STATUS - Visual indicator for Zoe Quantum-DHF Integration
// ═══════════════════════════════════════════════════════════════════════════════

import { memo } from 'react';
import { motion } from 'framer-motion';
import { Activity, Brain, Cpu, Network, Zap, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BridgeConnectionStatus, BridgeHealthMetrics } from '@/hooks/useZoeQuantumBridge';

interface QuantumBridgeStatusProps {
  connectionStatus: BridgeConnectionStatus;
  healthMetrics: BridgeHealthMetrics;
  isQuantumModeActive: boolean;
  onToggle?: () => void;
  compact?: boolean;
}

const statusConfig: Record<BridgeConnectionStatus, { 
  color: string; 
  bgColor: string; 
  icon: typeof Activity; 
  label: string 
}> = {
  disconnected: { color: 'text-slate-400', bgColor: 'bg-slate-500/20', icon: AlertCircle, label: 'Offline' },
  connecting: { color: 'text-amber-400', bgColor: 'bg-amber-500/20', icon: Loader2, label: 'Connecting' },
  connected: { color: 'text-emerald-400', bgColor: 'bg-emerald-500/20', icon: CheckCircle, label: 'Online' },
  syncing: { color: 'text-cyan-400', bgColor: 'bg-cyan-500/20', icon: Network, label: 'Syncing' },
  error: { color: 'text-red-400', bgColor: 'bg-red-500/20', icon: AlertCircle, label: 'Error' }
};

export const QuantumBridgeStatus = memo(({
  connectionStatus,
  healthMetrics,
  isQuantumModeActive,
  onToggle,
  compact = false
}: QuantumBridgeStatusProps) => {
  const config = statusConfig[connectionStatus];
  const StatusIcon = config.icon;

  if (compact) {
    return (
      <motion.button
        onClick={onToggle}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all",
          config.bgColor,
          "border-current/20 hover:scale-105"
        )}
        whileTap={{ scale: 0.95 }}
      >
        <StatusIcon className={cn("w-4 h-4", config.color, connectionStatus === 'connecting' && "animate-spin")} />
        <span className={cn("text-xs font-medium", config.color)}>
          {isQuantumModeActive ? 'Quantum' : 'Standard'}
        </span>
        <div className={cn(
          "w-2 h-2 rounded-full",
          healthMetrics.overallHealth >= 80 ? 'bg-emerald-400' :
          healthMetrics.overallHealth >= 50 ? 'bg-amber-400' : 'bg-red-400',
          "animate-pulse"
        )} />
      </motion.button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "p-4 rounded-xl border backdrop-blur-sm",
        config.bgColor,
        "border-current/10"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Zap className={cn("w-5 h-5", isQuantumModeActive ? "text-cyan-400" : "text-slate-400")} />
          <h3 className="text-sm font-semibold text-foreground">Quantum Bridge</h3>
        </div>
        <div className="flex items-center gap-2">
          <StatusIcon className={cn("w-4 h-4", config.color, connectionStatus === 'connecting' && "animate-spin")} />
          <span className={cn("text-xs", config.color)}>{config.label}</span>
        </div>
      </div>

      {/* Health Bars */}
      <div className="space-y-2">
        <HealthBar 
          label="Quantum Engine" 
          value={healthMetrics.quantumEngineHealth} 
          icon={Brain}
          color="cyan"
        />
        <HealthBar 
          label="DHF Core" 
          value={healthMetrics.dhfCoreHealth} 
          icon={Cpu}
          color="purple"
        />
        <HealthBar 
          label="Nervous System" 
          value={healthMetrics.nervousSystemHealth} 
          icon={Network}
          color="emerald"
        />
        <HealthBar 
          label="Sovereign Core" 
          value={healthMetrics.sovereignCoreHealth} 
          icon={Activity}
          color="amber"
        />
      </div>

      {/* Overall Health */}
      <div className="mt-4 pt-3 border-t border-white/10">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Overall Health</span>
          <span className={cn(
            "text-lg font-bold",
            healthMetrics.overallHealth >= 80 ? 'text-emerald-400' :
            healthMetrics.overallHealth >= 50 ? 'text-amber-400' : 'text-red-400'
          )}>
            {healthMetrics.overallHealth}%
          </span>
        </div>
      </div>

      {/* Toggle Button */}
      {onToggle && (
        <motion.button
          onClick={onToggle}
          className={cn(
            "w-full mt-4 py-2 rounded-lg text-sm font-medium transition-all",
            isQuantumModeActive 
              ? "bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30"
              : "bg-slate-500/20 text-slate-300 hover:bg-slate-500/30"
          )}
          whileTap={{ scale: 0.98 }}
        >
          {isQuantumModeActive ? 'Deactivate Quantum Mode' : 'Activate Quantum Mode'}
        </motion.button>
      )}
    </motion.div>
  );
});

QuantumBridgeStatus.displayName = 'QuantumBridgeStatus';

// Sub-component for health bars
const HealthBar = memo(({ 
  label, 
  value, 
  icon: Icon,
  color 
}: { 
  label: string; 
  value: number; 
  icon: typeof Activity;
  color: 'cyan' | 'purple' | 'emerald' | 'amber';
}) => {
  const colorClasses = {
    cyan: 'bg-cyan-400',
    purple: 'bg-purple-400',
    emerald: 'bg-emerald-400',
    amber: 'bg-amber-400'
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Icon className="w-3 h-3" />
          <span>{label}</span>
        </div>
        <span className="text-foreground/70">{value}%</span>
      </div>
      <div className="h-1 bg-white/5 rounded-full overflow-hidden">
        <motion.div
          className={cn("h-full rounded-full", colorClasses[color])}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
});

HealthBar.displayName = 'HealthBar';

export default QuantumBridgeStatus;
