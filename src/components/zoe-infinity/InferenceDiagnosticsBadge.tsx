// ═══════════════════════════════════════════════════════════════════════════════
// INFERENCE DIAGNOSTICS BADGE - Operation Silicon Proof
// Visual proof of Local NPU (Free) vs Cloud (Paid) switching
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cpu, Cloud, Zap, Battery, Wifi, WifiOff, Activity, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { InferenceOptimizer, type InferenceMetrics, type HardwareCapabilities } from '@/core/inference';

export interface InferenceDiagnosticsData {
  route: 'local' | 'hybrid' | 'cloud';
  latencyMs: number;
  costSaved?: number;
  hardwareUsed?: string[];
  reason?: string;
}

interface InferenceDiagnosticsBadgeProps {
  data: InferenceDiagnosticsData | null;
  isProcessing?: boolean;
  showExpanded?: boolean;
}

export function InferenceDiagnosticsBadge({ 
  data, 
  isProcessing = false,
  showExpanded: initialExpanded = false 
}: InferenceDiagnosticsBadgeProps) {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);
  const [metrics, setMetrics] = useState<InferenceMetrics | null>(null);
  const [capabilities, setCapabilities] = useState<HardwareCapabilities | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // Update metrics periodically
  useEffect(() => {
    const updateMetrics = () => {
      try {
        setMetrics(InferenceOptimizer.getMetrics());
      } catch (e) {
        // Optimizer not initialized yet
      }
    };
    
    updateMetrics();
    const interval = setInterval(updateMetrics, 3000);
    return () => clearInterval(interval);
  }, []);
  
  // Detect capabilities on mount
  useEffect(() => {
    const detectCaps = async () => {
      try {
        const caps = await InferenceOptimizer.detectHardware();
        setCapabilities(caps);
      } catch (e) {
        console.log('[DiagnosticsBadge] Capabilities detection pending');
      }
    };
    detectCaps();
  }, []);
  
  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  // Route colors and labels
  const getRouteConfig = (route: 'local' | 'hybrid' | 'cloud') => {
    switch (route) {
      case 'local':
        return {
          color: 'text-green-400',
          bgColor: 'bg-green-500/20',
          borderColor: 'border-green-500/40',
          glowColor: 'shadow-[0_0_12px_rgba(34,197,94,0.3)]',
          label: 'NPU (Free)',
          icon: Cpu,
          description: 'Local inference - $0 cost',
        };
      case 'hybrid':
        return {
          color: 'text-amber-400',
          bgColor: 'bg-amber-500/20',
          borderColor: 'border-amber-500/40',
          glowColor: 'shadow-[0_0_12px_rgba(245,158,11,0.3)]',
          label: 'HYBRID',
          icon: Zap,
          description: 'Local + Cloud boost',
        };
      case 'cloud':
        return {
          color: 'text-blue-400',
          bgColor: 'bg-blue-500/20',
          borderColor: 'border-blue-500/40',
          glowColor: 'shadow-[0_0_12px_rgba(59,130,246,0.3)]',
          label: 'CLOUD (Paid)',
          icon: Cloud,
          description: 'Full cloud inference',
        };
    }
  };
  
  const routeConfig = data ? getRouteConfig(data.route) : null;
  const RouteIcon = routeConfig?.icon || Cpu;
  
  // Calculate savings percentage
  const savingsPercent = metrics && metrics.totalInferences > 0
    ? Math.round((metrics.localInferences / metrics.totalInferences) * 100)
    : 0;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={cn(
        "fixed top-4 right-4 z-50",
        "font-mono text-xs",
        "backdrop-blur-md rounded-lg",
        "border transition-all duration-300",
        routeConfig 
          ? cn(routeConfig.bgColor, routeConfig.borderColor, routeConfig.glowColor)
          : "bg-gray-800/80 border-gray-600/40"
      )}
    >
      {/* Main Badge */}
      <div 
        className="flex items-center gap-2 px-3 py-2 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Status Dot */}
        <motion.div
          className={cn(
            "w-2.5 h-2.5 rounded-full",
            isProcessing 
              ? "bg-cyan-400" 
              : routeConfig?.color.replace('text-', 'bg-') || "bg-gray-400"
          )}
          animate={isProcessing ? {
            scale: [1, 1.3, 1],
            opacity: [1, 0.6, 1],
          } : {}}
          transition={{ duration: 0.8, repeat: isProcessing ? Infinity : 0 }}
        />
        
        {/* Route Label */}
        {data ? (
          <span className={cn("font-semibold", routeConfig?.color)}>
            ● {routeConfig?.label}
          </span>
        ) : (
          <span className="text-gray-400">
            {isProcessing ? '⚡ Processing...' : '○ Idle'}
          </span>
        )}
        
        {/* Latency */}
        {data && (
          <span className="text-gray-400 ml-1">
            {data.latencyMs}ms
          </span>
        )}
        
        {/* Expand Toggle */}
        <button className="text-gray-400 hover:text-white ml-1">
          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>
      
      {/* Expanded Panel */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-white/10"
          >
            <div className="px-3 py-2 space-y-2 text-[10px]">
              {/* Hardware Capabilities */}
              <div className="flex items-center gap-2">
                <span className="text-gray-500 w-14">HARDWARE:</span>
                <div className="flex gap-1">
                  {capabilities?.hasNPU && (
                    <span className="px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded">NPU</span>
                  )}
                  {capabilities?.hasWebGPU && (
                    <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded">WebGPU</span>
                  )}
                  {capabilities?.hasWasmSIMD && (
                    <span className="px-1.5 py-0.5 bg-orange-500/20 text-orange-400 rounded">SIMD</span>
                  )}
                  {!capabilities?.hasNPU && !capabilities?.hasWebGPU && (
                    <span className="px-1.5 py-0.5 bg-gray-500/20 text-gray-400 rounded">CPU</span>
                  )}
                </div>
              </div>
              
              {/* Connection Status */}
              <div className="flex items-center gap-2">
                <span className="text-gray-500 w-14">NETWORK:</span>
                {isOnline ? (
                  <span className="flex items-center gap-1 text-green-400">
                    <Wifi size={10} /> Online
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-red-400">
                    <WifiOff size={10} /> Offline
                  </span>
                )}
                {capabilities && (
                  <span className="text-gray-400 ml-1">
                    {capabilities.connectionType.toUpperCase()}
                  </span>
                )}
              </div>
              
              {/* Battery */}
              {capabilities && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 w-14">BATTERY:</span>
                  <span className={cn(
                    "flex items-center gap-1",
                    capabilities.batteryLevel < 0.2 ? "text-red-400" : 
                    capabilities.batteryLevel < 0.5 ? "text-amber-400" : "text-green-400"
                  )}>
                    <Battery size={10} />
                    {Math.round(capabilities.batteryLevel * 100)}%
                    {capabilities.isCharging && " ⚡"}
                  </span>
                </div>
              )}
              
              {/* GPU Tier */}
              {capabilities && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 w-14">GPU:</span>
                  <span className={cn(
                    capabilities.gpuTier === 'flagship' ? "text-purple-400" :
                    capabilities.gpuTier === 'high' ? "text-blue-400" :
                    capabilities.gpuTier === 'mid' ? "text-cyan-400" :
                    "text-gray-400"
                  )}>
                    {capabilities.gpuTier.toUpperCase()}
                  </span>
                </div>
              )}
              
              {/* Inference Stats */}
              {metrics && metrics.totalInferences > 0 && (
                <>
                  <div className="border-t border-white/10 pt-2 mt-2">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 w-14">STATS:</span>
                      <Activity size={10} className="text-cyan-400" />
                      <span className="text-cyan-300">
                        {metrics.totalInferences} inferences
                      </span>
                    </div>
                    
                    {/* Local vs Cloud Ratio Bar */}
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-gray-500 w-14">LOCAL:</span>
                      <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-green-500 to-green-400"
                          initial={{ width: 0 }}
                          animate={{ width: `${savingsPercent}%` }}
                          transition={{ duration: 0.5 }}
                        />
                      </div>
                      <span className="text-green-400 font-bold">
                        {savingsPercent}%
                      </span>
                    </div>
                    
                    {/* Cost Saved */}
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-gray-500 w-14">SAVED:</span>
                      <span className="text-green-400 font-bold">
                        ${metrics.costSaved.toFixed(4)}
                      </span>
                    </div>
                  </div>
                </>
              )}
              
              {/* Current Query Reason */}
              {data?.reason && (
                <div className="border-t border-white/10 pt-2 mt-2">
                  <span className="text-gray-500 block mb-1">REASON:</span>
                  <span className="text-gray-300 text-[9px] leading-tight block">
                    {data.reason}
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default InferenceDiagnosticsBadge;
