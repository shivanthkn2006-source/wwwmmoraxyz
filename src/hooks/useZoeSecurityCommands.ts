/**
 * Zoe Security Commands Hook
 * 
 * Unified interface for triggering security scans via voice or text commands.
 * Integrates God Mode, Sentinel, and auto-fix capabilities.
 */

import { useCallback, useState } from 'react';
import { useZoeGodMode } from './useZoeGodMode';
import { useZoeSentinel } from './useZoeSentinel';
import { toast } from 'sonner';

export interface SecurityCommandResult {
  success: boolean;
  command: string;
  action: 'god_mode_scan' | 'sentinel_scan' | 'lockdown' | 'health_check' | 'auto_fix' | 'dashboard';
  data: any;
  narrative: string;
}

// Security command patterns for voice/text recognition
export const SECURITY_COMMAND_PATTERNS = {
  godModeScan: [
    'scan the platform',
    'run god mode',
    'deep scan',
    'platform scan',
    'scan everything',
    'run a scan',
    'check the platform',
    'platform health',
    'system scan',
    'full scan',
    'ultra scan',
    'god mode scan',
    'dhf scan',
    'run dhf',
    'security scan',
  ],
  sentinelScan: [
    'night watch',
    'run sentinel',
    'sentinel scan',
    'security check',
    'run night watch',
    'shadow ai check',
    'check for threats',
    'threat scan',
    'attack scan',
  ],
  healthCheck: [
    'health check',
    'quick check',
    'system health',
    'how healthy',
    'platform status',
    'system status',
    'check health',
    'is everything ok',
    'any issues',
    'are there problems',
  ],
  autoFix: [
    'fix issues',
    'auto fix',
    'fix everything',
    'repair',
    'fix problems',
    'fix bugs',
    'self repair',
    'heal the system',
    'fix the platform',
  ],
  lockdown: [
    'lockdown',
    'emergency lockdown',
    'lock everything',
    'freeze ports',
    'dhf lockdown',
    'security lockdown',
    'activate lockdown',
  ],
  dashboard: [
    'security dashboard',
    'show security',
    'security status',
    'sentinel status',
    'shield status',
    'show dashboard',
    'god mode',
    'war room',
    'open god mode',
    'show god mode',
    'quadrillion audit',
    'open war room',
  ],
};

export function useZoeSecurityCommands() {
  const godMode = useZoeGodMode();
  const sentinel = useZoeSentinel();
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<SecurityCommandResult | null>(null);

  /**
   * Detect if a command matches security patterns
   */
  const detectSecurityCommand = useCallback((command: string): {
    matched: boolean;
    action: keyof typeof SECURITY_COMMAND_PATTERNS | null;
    confidence: number;
  } => {
    const normalizedCommand = command.toLowerCase().trim();
    
    for (const [action, patterns] of Object.entries(SECURITY_COMMAND_PATTERNS)) {
      for (const pattern of patterns) {
        if (normalizedCommand.includes(pattern)) {
          return {
            matched: true,
            action: action as keyof typeof SECURITY_COMMAND_PATTERNS,
            confidence: pattern.length / normalizedCommand.length
          };
        }
      }
    }
    
    return { matched: false, action: null, confidence: 0 };
  }, []);

  /**
   * Execute a security command
   */
  const executeSecurityCommand = useCallback(async (
    action: keyof typeof SECURITY_COMMAND_PATTERNS,
    options?: { autoFix?: boolean; reason?: string }
  ): Promise<SecurityCommandResult> => {
    setIsProcessing(true);
    
    try {
      let result: SecurityCommandResult;
      
      switch (action) {
        case 'godModeScan': {
          toast.info('🔍 Initiating God Mode platform scan...');
          const report = await godMode.runPlatformScan({ autoFix: options?.autoFix ?? true });
          
          result = {
            success: !!report,
            command: 'god_mode_scan',
            action: 'god_mode_scan',
            data: report,
            narrative: report?.zoeNarrative || 'Platform scan completed. I found no critical issues.'
          };
          break;
        }
        
        case 'sentinelScan': {
          toast.info('🛡️ Running Sentinel Night Watch scan...');
          const report = await sentinel.runNightWatch();
          
          result = {
            success: !!report,
            command: 'sentinel_scan',
            action: 'sentinel_scan',
            data: report,
            narrative: report 
              ? `Night Watch complete. System integrity at ${report.systemIntegrityScore}%. ${report.attacksBlocked} attacks blocked, ${report.autoPatchesApplied} auto-patches applied.`
              : 'Sentinel scan encountered an issue.'
          };
          break;
        }
        
        case 'healthCheck': {
          const health = await godMode.quickHealthCheck();
          
          result = {
            success: true,
            command: 'health_check',
            action: 'health_check',
            data: health,
            narrative: health.healthy 
              ? `Platform is healthy at ${health.score}% integrity. All systems operational.`
              : `Platform health at ${health.score}%. Issues detected: ${health.issues.join(', ')}`
          };
          break;
        }
        
        case 'autoFix': {
          toast.info('🔧 Running auto-fix on all detected issues...');
          const fixCount = await godMode.autoFixAll();
          
          result = {
            success: true,
            command: 'auto_fix',
            action: 'auto_fix',
            data: { fixesApplied: fixCount },
            narrative: fixCount > 0 
              ? `I've automatically fixed ${fixCount} issues across the platform.`
              : 'No issues found that needed fixing. Platform is healthy!'
          };
          break;
        }
        
        case 'lockdown': {
          toast.warning('🔒 Initiating DHF Lockdown...', { duration: 5000 });
          const lockdown = await sentinel.initiateLockdown(
            options?.reason || 'Manual security lockdown via voice command',
            'full'
          );
          
          result = {
            success: !!lockdown,
            command: 'lockdown',
            action: 'lockdown',
            data: lockdown,
            narrative: lockdown 
              ? 'DHF LOCKDOWN ACTIVATED. All external ports frozen. Auto-release in 1 hour.'
              : 'Failed to initiate lockdown. Please try again.'
          };
          break;
        }
        
        case 'dashboard': {
          // Navigate to God Mode War Room
          window.dispatchEvent(new CustomEvent('zoe-navigate', { 
            detail: { path: '/god-mode' } 
          }));
          await sentinel.fetchDashboard();
          
          result = {
            success: true,
            command: 'dashboard',
            action: 'dashboard',
            data: sentinel.dashboard,
            narrative: 'Opening God Mode War Room. The Quadrillion Audit Dashboard is ready.'
          };
          break;
        }
        
        default:
          result = {
            success: false,
            command: action,
            action: 'health_check',
            data: null,
            narrative: 'Unknown security command.'
          };
      }
      
      setLastResult(result);
      return result;
      
    } catch (error) {
      const errorResult: SecurityCommandResult = {
        success: false,
        command: action,
        action: 'health_check',
        data: { error: error instanceof Error ? error.message : 'Unknown error' },
        narrative: `Security command failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
      
      setLastResult(errorResult);
      return errorResult;
      
    } finally {
      setIsProcessing(false);
    }
  }, [godMode, sentinel]);

  /**
   * Process a natural language command and execute if security-related
   */
  const processCommand = useCallback(async (command: string): Promise<SecurityCommandResult | null> => {
    const detection = detectSecurityCommand(command);
    
    if (!detection.matched || !detection.action) {
      return null; // Not a security command
    }
    
    return executeSecurityCommand(detection.action);
  }, [detectSecurityCommand, executeSecurityCommand]);

  /**
   * Get Zoe's security-aware narrative
   */
  const getSecurityNarrative = useCallback((): string => {
    if (isProcessing) {
      return "I'm running a security scan right now. Give me just a moment...";
    }
    
    if (lastResult) {
      return lastResult.narrative;
    }
    
    const dashboard = sentinel.dashboard;
    if (dashboard) {
      if (dashboard.shieldStatus === 'LOCKDOWN') {
        return "The platform is currently in LOCKDOWN mode. All external connections are frozen.";
      }
      if (dashboard.systemIntegrity < 80) {
        return `I'm detecting some issues. System integrity is at ${dashboard.systemIntegrity}%. Would you like me to run a deep scan?`;
      }
      return `All systems operational. Shield status: ${dashboard.shieldStatus}. System integrity: ${dashboard.systemIntegrity}%.`;
    }
    
    return "I have God Mode security capabilities. Ask me to scan the platform, run Night Watch, or check system health.";
  }, [isProcessing, lastResult, sentinel.dashboard]);

  return {
    // State
    isProcessing,
    lastResult,
    
    // Core functions
    detectSecurityCommand,
    executeSecurityCommand,
    processCommand,
    getSecurityNarrative,
    
    // Pass-through from God Mode
    isScanning: godMode.isScanning || sentinel.isScanning,
    overallHealth: godMode.overallHealth,
    scanHistory: godMode.scanHistory,
    
    // Pass-through from Sentinel
    shieldStatus: sentinel.shieldStatus,
    systemIntegrity: sentinel.systemIntegrity,
    isLockdownActive: sentinel.isLockdownActive,
    dashboard: sentinel.dashboard,
    
    // Command patterns for external use
    SECURITY_COMMAND_PATTERNS
  };
}
