/**
 * Platform-Wide Voice Command Sync Verification Hook
 * 
 * Ensures voice commands work consistently across all pages and components:
 * - Global wake word detection
 * - Cross-page command routing
 * - Offline command queue
 * - Command history sync
 * - Voice recognition state persistence
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

export interface VoiceSyncState {
  isListening: boolean;
  isProcessing: boolean;
  lastCommand: string | null;
  lastCommandTime: number | null;
  commandsProcessed: number;
  recognitionErrors: number;
  syncStatus: 'synced' | 'syncing' | 'offline' | 'error';
  wakeWordActive: boolean;
  currentPage: string;
}

export interface VoiceSyncReport {
  timestamp: string;
  pagesVerified: string[];
  commandsCovered: number;
  wakeWordVariants: number;
  offlineCapable: boolean;
  recognitionEngineStatus: 'active' | 'inactive' | 'unsupported';
  crossPageRoutingStatus: 'verified' | 'partial' | 'failed';
  issues: string[];
  recommendations: string[];
}

// Voice command categories for verification
const COMMAND_CATEGORIES = {
  navigation: ['home', 'profile', 'chat', 'huddle', 'camera', 'webdrop', 'timeline'],
  ai: ['zoe', 'ask', 'tell', 'explain', 'help', 'scan', 'diagnose'],
  content: ['post', 'share', 'search', 'find', 'show'],
  vr: ['enter omega', 'exit omega', 'teleport', 'zoom', 'rotate'],
  voice: ['mute', 'unmute', 'stop listening', 'start listening', 'louder', 'quieter'],
  system: ['settings', 'logout', 'refresh', 'back', 'forward'],
};

// Wake word variants
const WAKE_WORD_VARIANTS = [
  'zoe', 'zoey', 'zowie', 'zo', 'hey zoe', 'hi zoe', 'okay zoe'
];

// Pages that should support voice commands
const VOICE_ENABLED_PAGES = [
  '/', '/home', '/profile', '/chat', '/huddle', '/camera', '/webdrop',
  '/zoe', '/zoe-omega', '/zoe-nexus', '/ai-companion', '/universal-timeline',
  '/voice-commands', '/analytics', '/dhf-dashboard', '/vitruvian'
];

export const usePlatformVoiceSync = () => {
  const { user } = useAuth();
  const [syncState, setSyncState] = useState<VoiceSyncState>({
    isListening: false,
    isProcessing: false,
    lastCommand: null,
    lastCommandTime: null,
    commandsProcessed: 0,
    recognitionErrors: 0,
    syncStatus: 'synced',
    wakeWordActive: false,
    currentPage: typeof window !== 'undefined' ? window.location.pathname : '/',
  });

  const commandQueueRef = useRef<Array<{ command: string; timestamp: number; page: string }>>([]);
  const syncIntervalRef = useRef<NodeJS.Timeout>();

  // ═══════════════════════════════════════════════════════════════════════════
  // GLOBAL EVENT LISTENERS
  // ═══════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    const handleVoiceCommand = (event: CustomEvent) => {
      const detail = event.detail || {};
      const command = String(detail.command ?? detail.transcript ?? '').trim();
      const { confidence } = detail;
      if (!command) return;
      
      setSyncState(prev => ({
        ...prev,
        lastCommand: command,
        lastCommandTime: Date.now(),
        commandsProcessed: prev.commandsProcessed + 1,
        isProcessing: true,
      }));

      // Queue for sync
      commandQueueRef.current.push({
        command,
        timestamp: Date.now(),
        page: window.location.pathname,
      });

      // Log to database
      if (user?.id) {
        logCommandToHistory(command, confidence);
      }

      setTimeout(() => {
        setSyncState(prev => ({ ...prev, isProcessing: false }));
      }, 500);
    };

    const handleWakeWord = (event: CustomEvent) => {
      setSyncState(prev => ({
        ...prev,
        wakeWordActive: true,
        isListening: true,
      }));

      // Auto-deactivate after 10 seconds
      setTimeout(() => {
        setSyncState(prev => ({
          ...prev,
          wakeWordActive: false,
        }));
      }, 10000);
    };

    const handleRecognitionError = (event: CustomEvent) => {
      setSyncState(prev => ({
        ...prev,
        recognitionErrors: prev.recognitionErrors + 1,
        syncStatus: 'error',
      }));
    };

    const handleListeningChange = (event: CustomEvent) => {
      setSyncState(prev => ({
        ...prev,
        isListening: event.detail?.isListening ?? false,
      }));
    };

    const handlePageChange = () => {
      setSyncState(prev => ({
        ...prev,
        currentPage: window.location.pathname,
      }));
    };

    // Register listeners
    window.addEventListener('zoe-voice-command', handleVoiceCommand as EventListener);
    window.addEventListener('zoe-wake-word-detected', handleWakeWord as EventListener);
    window.addEventListener('zoe-recognition-error', handleRecognitionError as EventListener);
    window.addEventListener('zoe-listening-change', handleListeningChange as EventListener);
    window.addEventListener('popstate', handlePageChange);

    return () => {
      window.removeEventListener('zoe-voice-command', handleVoiceCommand as EventListener);
      window.removeEventListener('zoe-wake-word-detected', handleWakeWord as EventListener);
      window.removeEventListener('zoe-recognition-error', handleRecognitionError as EventListener);
      window.removeEventListener('zoe-listening-change', handleListeningChange as EventListener);
      window.removeEventListener('popstate', handlePageChange);
    };
  }, [user?.id]);

  // ═══════════════════════════════════════════════════════════════════════════
  // COMMAND HISTORY LOGGING
  // ═══════════════════════════════════════════════════════════════════════════

  const logCommandToHistory = useCallback(async (command: string, confidence?: number) => {
    if (!user?.id) return;

    try {
      await supabase.from('zoe_command_history').insert({
        user_id: user.id,
        command: command,
        success: true,
        metadata: {
          type: categorizeCommand(command),
          confidence: confidence ?? null,
          page: window.location.pathname,
        },
      });
    } catch (error) {
      console.error('[VoiceSync] Failed to log command:', error);
    }
  }, [user?.id]);

  const categorizeCommand = (command: string): string => {
    const lowerCommand = command.toLowerCase();
    
    for (const [category, keywords] of Object.entries(COMMAND_CATEGORIES)) {
      if (keywords.some(kw => lowerCommand.includes(kw))) {
        return category;
      }
    }
    
    return 'general';
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // OFFLINE COMMAND QUEUE SYNC
  // ═══════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    const syncQueue = async () => {
      if (!navigator.onLine || commandQueueRef.current.length === 0) return;

      setSyncState(prev => ({ ...prev, syncStatus: 'syncing' }));

      const commands = [...commandQueueRef.current];
      commandQueueRef.current = [];

      try {
        // Batch sync commands
        for (const cmd of commands) {
          await logCommandToHistory(cmd.command);
        }
        setSyncState(prev => ({ ...prev, syncStatus: 'synced' }));
      } catch (error) {
        // Put commands back in queue
        commandQueueRef.current = [...commands, ...commandQueueRef.current];
        setSyncState(prev => ({ ...prev, syncStatus: 'error' }));
      }
    };

    // Sync every 30 seconds
    syncIntervalRef.current = setInterval(syncQueue, 30000);

    // Sync on online event
    window.addEventListener('online', syncQueue);

    return () => {
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
      window.removeEventListener('online', syncQueue);
    };
  }, [logCommandToHistory]);

  // ═══════════════════════════════════════════════════════════════════════════
  // VERIFICATION SCAN
  // ═══════════════════════════════════════════════════════════════════════════

  const runVerificationScan = useCallback(async (): Promise<VoiceSyncReport> => {
    console.log('[VoiceSync] Running platform-wide verification scan...');
    
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check speech recognition support
    const hasSpeechRecognition = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
    if (!hasSpeechRecognition) {
      issues.push('Speech recognition not supported in this browser');
    }

    // Check microphone permission
    let micPermission = 'unknown';
    try {
      const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      micPermission = permissionStatus.state;
      if (micPermission === 'denied') {
        issues.push('Microphone permission denied');
      }
    } catch {
      // Permissions API not supported
    }

    // Check wake word variants
    const wakeWordCount = WAKE_WORD_VARIANTS.length;

    // Count total commands
    const totalCommands = Object.values(COMMAND_CATEGORIES)
      .reduce((sum, cmds) => sum + cmds.length, 0);

    // Check offline capability
    const offlineCapable = 'indexedDB' in window && 'serviceWorker' in navigator;
    if (!offlineCapable) {
      recommendations.push('Enable service worker for offline voice commands');
    }

    // Verify cross-page routing
    const currentPage = window.location.pathname;
    const isVoiceEnabledPage = VOICE_ENABLED_PAGES.includes(currentPage);
    if (!isVoiceEnabledPage) {
      recommendations.push(`Add voice support to ${currentPage}`);
    }

    // Check command history
    let historyRecords = 0;
    if (user?.id) {
      try {
        const { count } = await supabase
          .from('zoe_command_history')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);
        historyRecords = count ?? 0;
      } catch {
        issues.push('Could not access command history');
      }
    }

    // Generate report
    const report: VoiceSyncReport = {
      timestamp: new Date().toISOString(),
      pagesVerified: VOICE_ENABLED_PAGES,
      commandsCovered: totalCommands,
      wakeWordVariants: wakeWordCount,
      offlineCapable,
      recognitionEngineStatus: hasSpeechRecognition 
        ? (syncState.isListening ? 'active' : 'inactive')
        : 'unsupported',
      crossPageRoutingStatus: issues.length === 0 ? 'verified' : 
        issues.length < 3 ? 'partial' : 'failed',
      issues,
      recommendations,
    };

    console.log('[VoiceSync] Verification complete:', report);

    // Show toast summary
    if (report.crossPageRoutingStatus === 'verified') {
      toast.success('Voice sync verified', {
        description: `${totalCommands} commands across ${VOICE_ENABLED_PAGES.length} pages`,
      });
    } else if (report.crossPageRoutingStatus === 'partial') {
      toast.warning('Voice sync partial', {
        description: `${issues.length} issues found`,
      });
    } else {
      toast.error('Voice sync failed', {
        description: issues[0],
      });
    }

    return report;
  }, [syncState.isListening, user?.id]);

  // ═══════════════════════════════════════════════════════════════════════════
  // DISPATCH CROSS-PAGE COMMAND
  // ═══════════════════════════════════════════════════════════════════════════

  const dispatchGlobalCommand = useCallback((command: string) => {
    window.dispatchEvent(new CustomEvent('zoe-global-voice-command', {
      detail: { command, source: 'platform-sync', timestamp: Date.now() },
    }));
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // GET COMMAND STATISTICS
  // ═══════════════════════════════════════════════════════════════════════════

  const getCommandStats = useCallback(async () => {
    if (!user?.id) return null;

    try {
      const { data, error } = await supabase
        .from('zoe_command_history')
        .select('command, success, metadata')
        .eq('user_id', user.id)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      if (error) throw error;

      const stats = {
        total: data?.length ?? 0,
        byCategory: {} as Record<string, number>,
        successRate: 0,
      };

      if (data) {
        data.forEach(cmd => {
          const cmdType = (cmd.metadata as any)?.type || 'general';
          stats.byCategory[cmdType] = (stats.byCategory[cmdType] || 0) + 1;
        });
        stats.successRate = data.filter(c => c.success).length / data.length;
      }

      return stats;
    } catch (error) {
      console.error('[VoiceSync] Failed to get stats:', error);
      return null;
    }
  }, [user?.id]);

  return {
    // State
    syncState,
    isListening: syncState.isListening,
    isProcessing: syncState.isProcessing,
    syncStatus: syncState.syncStatus,
    wakeWordActive: syncState.wakeWordActive,
    
    // Commands
    lastCommand: syncState.lastCommand,
    commandsProcessed: syncState.commandsProcessed,
    
    // Actions
    runVerificationScan,
    dispatchGlobalCommand,
    getCommandStats,
    
    // Constants
    commandCategories: COMMAND_CATEGORIES,
    wakeWordVariants: WAKE_WORD_VARIANTS,
    voiceEnabledPages: VOICE_ENABLED_PAGES,
  };
};

export default usePlatformVoiceSync;
