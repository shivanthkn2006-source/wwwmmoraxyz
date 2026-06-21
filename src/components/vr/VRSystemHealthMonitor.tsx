// ═══════════════════════════════════════════════════════════════════════════════
// VR SYSTEM HEALTH MONITOR - Visual dashboard for the VR-DHF Nervous System
// Real-time status display, diagnostics, and self-healing controls
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, 
  Brain, 
  Heart, 
  Zap, 
  Shield, 
  RefreshCw, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Cpu,
  Database,
  Radio,
  Eye,
  Gamepad2,
  Cloud,
  Layers,
  Wrench,
  ChevronDown,
  ChevronUp,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { NervousSystemNode, SystemHealth, SyncStatus } from '@/hooks/useVRDHFNervousSystem';

interface VRSystemHealthMonitorProps {
  isVisible: boolean;
  onClose: () => void;
  nodes: Map<string, NervousSystemNode>;
  overallHealth: SystemHealth;
  syncStatus: SyncStatus;
  dhfSyncProgress: number;
  errorCount: number;
  onForceSync: () => void;
  onHealNode: (nodeId: string) => void;
  diagnosticReport?: any;
}

// Get icon for node type
const getNodeIcon = (type: NervousSystemNode['type']) => {
  switch (type) {
    case 'core': return Cpu;
    case 'memory': return Database;
    case 'sensor': return Radio;
    case 'motor': return Gamepad2;
    case 'cognitive': return Brain;
    default: return Layers;
  }
};

// Get color for health status
const getHealthColor = (health: SystemHealth): string => {
  switch (health) {
    case 'optimal': return 'text-emerald-400';
    case 'degraded': return 'text-yellow-400';
    case 'critical': return 'text-red-400';
    case 'offline': return 'text-gray-500';
  }
};

const getHealthBg = (health: SystemHealth): string => {
  switch (health) {
    case 'optimal': return 'bg-emerald-500/20 border-emerald-500/30';
    case 'degraded': return 'bg-yellow-500/20 border-yellow-500/30';
    case 'critical': return 'bg-red-500/20 border-red-500/30';
    case 'offline': return 'bg-gray-500/20 border-gray-500/30';
  }
};

// Node status badge
const NodeStatusBadge: React.FC<{ status: NervousSystemNode['status'] }> = ({ status }) => {
  const config = {
    active: { icon: CheckCircle, color: 'text-emerald-400', label: 'Active' },
    inactive: { icon: XCircle, color: 'text-gray-500', label: 'Inactive' },
    error: { icon: AlertTriangle, color: 'text-red-400', label: 'Error' },
    healing: { icon: RefreshCw, color: 'text-cyan-400 animate-spin', label: 'Healing' },
  };
  
  const { icon: Icon, color, label } = config[status];
  
  return (
    <div className={cn("flex items-center gap-1 text-[10px]", color)}>
      <Icon className="w-3 h-3" />
      <span>{label}</span>
    </div>
  );
};

// Single node card
const NodeCard: React.FC<{
  node: NervousSystemNode;
  onHeal: () => void;
}> = ({ node, onHeal }) => {
  const Icon = getNodeIcon(node.type);
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "p-2 rounded-lg border backdrop-blur-sm transition-all",
        node.status === 'error' 
          ? "bg-red-900/30 border-red-500/40" 
          : node.status === 'healing'
          ? "bg-cyan-900/30 border-cyan-500/40"
          : "bg-black/40 border-white/10 hover:border-white/20"
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className={cn(
            "w-4 h-4",
            node.status === 'error' ? 'text-red-400' : 'text-purple-400'
          )} />
          <span className="text-white text-xs font-medium truncate max-w-[100px]">
            {node.name}
          </span>
        </div>
        <NodeStatusBadge status={node.status} />
      </div>
      
      {/* Health bar */}
      <div className="relative h-1.5 bg-black/40 rounded-full overflow-hidden mb-2">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${node.health}%` }}
          transition={{ duration: 0.5 }}
          className={cn(
            "absolute inset-y-0 left-0 rounded-full",
            node.health > 70 ? 'bg-emerald-500' :
            node.health > 40 ? 'bg-yellow-500' : 'bg-red-500'
          )}
        />
      </div>
      
      <div className="flex items-center justify-between">
        <span className="text-white/50 text-[10px]">
          Health: {node.health}%
        </span>
        
        {(node.status === 'error' || node.health < 50) && (
          <button
            onClick={onHeal}
            className="flex items-center gap-1 px-2 py-0.5 bg-cyan-600/30 hover:bg-cyan-600/50 rounded text-cyan-300 text-[10px] transition-colors"
          >
            <Wrench className="w-3 h-3" />
            Heal
          </button>
        )}
      </div>
      
      {node.lastError && (
        <div className="mt-1 text-red-300/70 text-[9px] truncate">
          ⚠ {node.lastError}
        </div>
      )}
    </motion.div>
  );
};

// Main component
export const VRSystemHealthMonitor: React.FC<VRSystemHealthMonitorProps> = ({
  isVisible,
  onClose,
  nodes,
  overallHealth,
  syncStatus,
  dhfSyncProgress,
  errorCount,
  onForceSync,
  onHealNode,
  diagnosticReport,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  
  const nodeArray = Array.from(nodes.values());
  const activeNodes = nodeArray.filter(n => n.status === 'active').length;
  const avgHealth = Math.round(nodeArray.reduce((sum, n) => sum + n.health, 0) / nodeArray.length);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="fixed top-16 left-4 z-[80] w-80 max-h-[70vh] overflow-hidden"
      >
        <div className="bg-black/80 backdrop-blur-xl rounded-xl border border-purple-500/30 shadow-2xl">
          {/* Header */}
          <div className={cn(
            "p-3 rounded-t-xl border-b",
            getHealthBg(overallHealth)
          )}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Heart className={cn("w-5 h-5", getHealthColor(overallHealth))} />
                <div>
                  <h3 className="text-white font-semibold text-sm">VR-DHF Nervous System</h3>
                  <p className={cn("text-[10px] capitalize", getHealthColor(overallHealth))}>
                    Status: {overallHealth}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-4 h-4 text-white/60" />
              </button>
            </div>
          </div>

          {/* Quick stats */}
          <div className="p-3 border-b border-white/10">
            <div className="grid grid-cols-4 gap-2 text-center">
              <div>
                <div className="text-white font-bold text-lg">{activeNodes}</div>
                <div className="text-white/50 text-[9px]">Active</div>
              </div>
              <div>
                <div className="text-white font-bold text-lg">{nodeArray.length}</div>
                <div className="text-white/50 text-[9px]">Total</div>
              </div>
              <div>
                <div className={cn(
                  "font-bold text-lg",
                  avgHealth > 70 ? 'text-emerald-400' : avgHealth > 40 ? 'text-yellow-400' : 'text-red-400'
                )}>
                  {avgHealth}%
                </div>
                <div className="text-white/50 text-[9px]">Health</div>
              </div>
              <div>
                <div className={cn(
                  "font-bold text-lg",
                  errorCount > 0 ? 'text-red-400' : 'text-emerald-400'
                )}>
                  {errorCount}
                </div>
                <div className="text-white/50 text-[9px]">Errors</div>
              </div>
            </div>
          </div>

          {/* Sync status */}
          <div className="p-3 border-b border-white/10">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Cloud className={cn(
                  "w-4 h-4",
                  syncStatus === 'synced' ? 'text-emerald-400' :
                  syncStatus === 'syncing' ? 'text-cyan-400 animate-pulse' :
                  syncStatus === 'error' ? 'text-red-400' : 'text-yellow-400'
                )} />
                <span className="text-white text-xs">DHF Sync</span>
              </div>
              <button
                onClick={onForceSync}
                disabled={syncStatus === 'syncing'}
                className="flex items-center gap-1 px-2 py-1 bg-purple-600/30 hover:bg-purple-600/50 disabled:opacity-50 rounded text-purple-300 text-[10px] transition-colors"
              >
                <RefreshCw className={cn("w-3 h-3", syncStatus === 'syncing' && 'animate-spin')} />
                Sync
              </button>
            </div>
            
            {syncStatus === 'syncing' && (
              <div className="relative h-1 bg-black/40 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${dhfSyncProgress}%` }}
                  className="absolute inset-y-0 left-0 bg-cyan-500 rounded-full"
                />
              </div>
            )}
          </div>

          {/* Expand toggle */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full p-2 flex items-center justify-center gap-2 text-white/60 hover:text-white hover:bg-white/5 transition-colors text-xs"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-4 h-4" />
                Hide Nodes
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                Show All Nodes ({nodeArray.length})
              </>
            )}
          </button>

          {/* Node grid */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="p-3 max-h-[300px] overflow-y-auto space-y-2">
                  {nodeArray.map(node => (
                    <NodeCard
                      key={node.id}
                      node={node}
                      onHeal={() => onHealNode(node.id)}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Diagnostics toggle */}
          <button
            onClick={() => setShowDiagnostics(!showDiagnostics)}
            className="w-full p-2 flex items-center justify-center gap-2 text-purple-400 hover:text-purple-300 hover:bg-purple-900/20 transition-colors text-xs border-t border-white/10"
          >
            <Activity className="w-4 h-4" />
            {showDiagnostics ? 'Hide Diagnostics' : 'Show Diagnostics'}
          </button>

          {/* Diagnostics panel */}
          <AnimatePresence>
            {showDiagnostics && diagnosticReport && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="p-3 bg-purple-900/20 border-t border-purple-500/30">
                  <pre className="text-[9px] text-purple-300/80 font-mono overflow-x-auto">
                    {JSON.stringify(diagnosticReport, null, 2)}
                  </pre>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default VRSystemHealthMonitor;
