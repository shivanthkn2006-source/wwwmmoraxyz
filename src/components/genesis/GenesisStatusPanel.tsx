/**
 * GENESIS STATUS PANEL
 * Visual display of Genesis Engine status and active tasks
 */

import React from 'react';
import { useGenesis } from './GenesisEngineProvider';
import { Activity, Cpu, Shield, Zap, CheckCircle, AlertTriangle, XCircle, Wifi, WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface GenesisStatusPanelProps {
  compact?: boolean;
  showTasks?: boolean;
}

export const GenesisStatusPanel: React.FC<GenesisStatusPanelProps> = ({
  compact = false,
  showTasks = true,
}) => {
  const {
    isOnline,
    isScanning,
    diagnostics,
    activeTasks,
    agentMode,
    systemHealth,
    runDiagnostic,
    runUltraDeepScan,
  } = useGenesis();

  const getHealthColor = () => {
    if (systemHealth === null) return 'text-muted-foreground';
    if (systemHealth >= 80) return 'text-green-400';
    if (systemHealth >= 50) return 'text-amber-400';
    return 'text-red-400';
  };

  const getAgentModeIcon = () => {
    switch (agentMode) {
      case 'planning': return <Cpu className="w-4 h-4 text-blue-400 animate-pulse" />;
      case 'executing': return <Zap className="w-4 h-4 text-green-400 animate-pulse" />;
      case 'critiquing': return <Shield className="w-4 h-4 text-amber-400 animate-pulse" />;
      default: return <Activity className="w-4 h-4 text-muted-foreground" />;
    }
  };

  if (compact) {
    return (
      <motion.div 
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-background/50 backdrop-blur-xl border border-border/50"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        {isOnline ? (
          <Wifi className="w-3 h-3 text-green-400" />
        ) : (
          <WifiOff className="w-3 h-3 text-amber-400" />
        )}
        
        {getAgentModeIcon()}
        
        {systemHealth !== null && (
          <span className={`text-xs font-mono ${getHealthColor()}`}>
            {systemHealth}%
          </span>
        )}
        
        {isScanning && (
          <div className="w-2 h-2 rounded-full bg-omega-cyan animate-ping" />
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      className="p-4 rounded-xl bg-background/80 backdrop-blur-xl border border-border/50 space-y-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-omega-purple/20">
            <Cpu className="w-5 h-5 text-omega-purple" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Genesis Engine</h3>
            <p className="text-xs text-muted-foreground">Level 4 Autonomous Agent</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {isOnline ? (
            <Wifi className="w-4 h-4 text-green-400" />
          ) : (
            <WifiOff className="w-4 h-4 text-amber-400" />
          )}
          
          {systemHealth !== null && (
            <span className={`text-sm font-mono font-bold ${getHealthColor()}`}>
              {systemHealth}%
            </span>
          )}
        </div>
      </div>

      {/* Agent Mode */}
      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
        {getAgentModeIcon()}
        <div className="flex-1">
          <p className="text-xs text-muted-foreground">Agent Mode</p>
          <p className="text-sm font-medium text-foreground capitalize">{agentMode}</p>
        </div>
        {isScanning && (
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-omega-cyan animate-ping" />
            <span className="text-xs text-omega-cyan">Scanning</span>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => runDiagnostic()}
          disabled={isScanning}
          className="flex-1 px-3 py-2 rounded-lg bg-omega-cyan/20 hover:bg-omega-cyan/30 
                   text-omega-cyan text-sm font-medium transition-colors disabled:opacity-50"
        >
          Quick Scan
        </button>
        <button
          onClick={() => runUltraDeepScan()}
          disabled={isScanning}
          className="flex-1 px-3 py-2 rounded-lg bg-omega-purple/20 hover:bg-omega-purple/30 
                   text-omega-purple text-sm font-medium transition-colors disabled:opacity-50"
        >
          Deep Scan
        </button>
      </div>

      {/* Diagnostics */}
      {diagnostics.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Diagnostics ({diagnostics.length})
          </p>
          <div className="max-h-32 overflow-y-auto space-y-1">
            {diagnostics.map((diag, i) => (
              <div 
                key={i} 
                className="flex items-center gap-2 px-2 py-1 rounded bg-muted/30 text-xs"
              >
                {diag.status === 'healthy' ? (
                  <CheckCircle className="w-3 h-3 text-green-400 flex-shrink-0" />
                ) : diag.status === 'warning' ? (
                  <AlertTriangle className="w-3 h-3 text-amber-400 flex-shrink-0" />
                ) : diag.status === 'critical' ? (
                  <XCircle className="w-3 h-3 text-red-400 flex-shrink-0" />
                ) : (
                  <CheckCircle className="w-3 h-3 text-omega-cyan flex-shrink-0" />
                )}
                <span className="text-foreground/80 truncate">{diag.component}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Tasks */}
      {showTasks && activeTasks.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Active Tasks ({activeTasks.filter(t => t.status === 'running').length})
          </p>
          <AnimatePresence>
            {activeTasks.slice(-3).map((task) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="flex items-center gap-2 px-2 py-1 rounded bg-muted/30 text-xs"
              >
                {task.status === 'running' ? (
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                ) : task.status === 'complete' ? (
                  <CheckCircle className="w-3 h-3 text-green-400" />
                ) : (
                  <XCircle className="w-3 h-3 text-red-400" />
                )}
                <span className="text-foreground/80 truncate flex-1">{task.description}</span>
                {task.duration && (
                  <span className="text-muted-foreground">{task.duration}ms</span>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
};

export default GenesisStatusPanel;
