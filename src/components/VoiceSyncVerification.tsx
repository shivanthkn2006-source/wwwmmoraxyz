/**
 * Voice Sync Verification Panel
 * Platform-wide voice command sync status and verification
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, 
  MicOff, 
  Check, 
  AlertTriangle, 
  RefreshCw, 
  Wifi,
  WifiOff,
  Volume2,
  Settings,
  ChevronDown,
  ChevronUp,
  Zap,
  History,
  Globe
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePlatformVoiceSync, VoiceSyncReport } from '@/hooks/usePlatformVoiceSync';
import { toast } from 'sonner';

interface VoiceSyncVerificationProps {
  minimal?: boolean;
  className?: string;
}

const VoiceSyncVerification: React.FC<VoiceSyncVerificationProps> = ({
  minimal = false,
  className,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [report, setReport] = useState<VoiceSyncReport | null>(null);
  const [stats, setStats] = useState<{ total: number; byCategory: Record<string, number>; successRate: number } | null>(null);

  const {
    syncState,
    isListening,
    isProcessing,
    syncStatus,
    wakeWordActive,
    lastCommand,
    commandsProcessed,
    runVerificationScan,
    getCommandStats,
    commandCategories,
    wakeWordVariants,
    voiceEnabledPages,
  } = usePlatformVoiceSync();

  // Load stats on mount
  useEffect(() => {
    getCommandStats().then(setStats);
  }, [getCommandStats]);

  const handleScan = async () => {
    setIsScanning(true);
    try {
      const result = await runVerificationScan();
      setReport(result);
    } finally {
      setIsScanning(false);
    }
  };

  const getSyncStatusColor = () => {
    switch (syncStatus) {
      case 'synced': return 'text-green-400';
      case 'syncing': return 'text-yellow-400';
      case 'offline': return 'text-orange-400';
      case 'error': return 'text-red-400';
      default: return 'text-white/40';
    }
  };

  const getSyncStatusIcon = () => {
    switch (syncStatus) {
      case 'synced': return <Wifi className="w-3 h-3" />;
      case 'syncing': return <RefreshCw className="w-3 h-3 animate-spin" />;
      case 'offline': return <WifiOff className="w-3 h-3" />;
      case 'error': return <AlertTriangle className="w-3 h-3" />;
      default: return null;
    }
  };

  // Minimal view - just status indicator
  if (minimal) {
    return (
      <motion.button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'flex items-center gap-1.5 px-2 py-1 bg-black/60 backdrop-blur-md rounded-full border border-white/10 hover:bg-black/80 transition-colors',
          className
        )}
      >
        {isListening ? (
          <Mic className={cn(
            'w-3 h-3',
            wakeWordActive ? 'text-green-400 animate-pulse' : 'text-cyan-400'
          )} />
        ) : (
          <MicOff className="w-3 h-3 text-white/40" />
        )}
        <span className={cn('text-[10px] font-mono', getSyncStatusColor())}>
          {syncStatus.toUpperCase()}
        </span>
        {getSyncStatusIcon()}
      </motion.button>
    );
  }

  return (
    <motion.div
      layout
      className={cn(
        'bg-black/85 backdrop-blur-xl rounded-xl border border-white/10 overflow-hidden',
        className
      )}
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 px-4 py-3 w-full hover:bg-white/5 transition-colors"
      >
        <div className="relative">
          {isListening ? (
            <Mic className={cn(
              'w-5 h-5',
              wakeWordActive ? 'text-green-400' : 'text-cyan-400'
            )} />
          ) : (
            <MicOff className="w-5 h-5 text-white/40" />
          )}
          {isProcessing && (
            <div className="absolute -inset-1 rounded-full border-2 border-cyan-400 animate-gpu-ring-pulse" />
          )}
        </div>
        
        <div className="flex-1 text-left">
          <div className="text-sm font-semibold text-white">Voice Sync</div>
          <div className="text-[10px] text-white/50">
            {commandsProcessed} commands • {voiceEnabledPages.length} pages
          </div>
        </div>

        <div className={cn('flex items-center gap-1', getSyncStatusColor())}>
          {getSyncStatusIcon()}
          <span className="text-xs font-mono">{syncStatus}</span>
        </div>

        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-white/40" />
        ) : (
          <ChevronDown className="w-4 h-4 text-white/40" />
        )}
      </button>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-white/10"
          >
            <div className="p-4 space-y-4">
              {/* Wake Word Status */}
              <div className="bg-white/5 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-white">Wake Word</span>
                  <span className={cn(
                    'text-[10px] font-mono px-2 py-0.5 rounded-full',
                    wakeWordActive 
                      ? 'bg-green-500/20 text-green-400' 
                      : 'bg-white/10 text-white/50'
                  )}>
                    {wakeWordActive ? 'ACTIVE' : 'LISTENING'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {wakeWordVariants.slice(0, 5).map(word => (
                    <span
                      key={word}
                      className="px-1.5 py-0.5 bg-white/10 rounded text-[9px] text-white/60"
                    >
                      "{word}"
                    </span>
                  ))}
                  <span className="text-[9px] text-white/40">
                    +{wakeWordVariants.length - 5} more
                  </span>
                </div>
              </div>

              {/* Last Command */}
              {lastCommand && (
                <div className="bg-white/5 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <History className="w-3 h-3 text-purple-400" />
                    <span className="text-xs font-medium text-white">Last Command</span>
                  </div>
                  <p className="text-[11px] text-white/70 font-mono truncate">
                    "{lastCommand}"
                  </p>
                </div>
              )}

              {/* Command Categories */}
              <div className="bg-white/5 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Volume2 className="w-3 h-3 text-cyan-400" />
                  <span className="text-xs font-medium text-white">Command Categories</span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {Object.entries(commandCategories).map(([category, commands]) => (
                    <div
                      key={category}
                      className="bg-white/5 rounded px-2 py-1 text-center"
                    >
                      <span className="text-[9px] text-white/70 capitalize">{category}</span>
                      <span className="text-[10px] text-cyan-400 block font-mono">
                        {commands.length}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Weekly Stats */}
              {stats && (
                <div className="bg-white/5 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-3 h-3 text-amber-400" />
                    <span className="text-xs font-medium text-white">This Week</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-lg font-bold text-white">{stats.total}</span>
                      <span className="text-[10px] text-white/50 ml-1">commands</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold text-green-400">
                        {Math.round(stats.successRate * 100)}%
                      </span>
                      <span className="text-[10px] text-white/50 ml-1">success</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Verification Report */}
              {report && (
                <div className={cn(
                  'rounded-lg p-3 border',
                  report.crossPageRoutingStatus === 'verified'
                    ? 'bg-green-500/10 border-green-500/30'
                    : report.crossPageRoutingStatus === 'partial'
                    ? 'bg-yellow-500/10 border-yellow-500/30'
                    : 'bg-red-500/10 border-red-500/30'
                )}>
                  <div className="flex items-center gap-2 mb-2">
                    {report.crossPageRoutingStatus === 'verified' ? (
                      <Check className="w-4 h-4 text-green-400" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-yellow-400" />
                    )}
                    <span className="text-xs font-semibold text-white">
                      Verification: {report.crossPageRoutingStatus.toUpperCase()}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div className="flex items-center gap-1">
                      <Globe className="w-3 h-3 text-cyan-400" />
                      <span className="text-white/60">{report.pagesVerified.length} pages</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Volume2 className="w-3 h-3 text-purple-400" />
                      <span className="text-white/60">{report.commandsCovered} commands</span>
                    </div>
                  </div>

                  {report.issues.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-white/10">
                      <span className="text-[9px] text-red-400 block mb-1">Issues:</span>
                      {report.issues.map((issue, i) => (
                        <p key={i} className="text-[9px] text-white/50">• {issue}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Scan Button */}
              <button
                onClick={handleScan}
                disabled={isScanning}
                className={cn(
                  'w-full py-2 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2',
                  isScanning
                    ? 'bg-white/10 text-white/50 cursor-not-allowed'
                    : 'bg-gradient-to-r from-purple-600 to-cyan-600 text-white hover:from-purple-500 hover:to-cyan-500'
                )}
              >
                <RefreshCw className={cn('w-4 h-4', isScanning && 'animate-spin')} />
                {isScanning ? 'Scanning...' : 'Run Verification Scan'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default VoiceSyncVerification;
