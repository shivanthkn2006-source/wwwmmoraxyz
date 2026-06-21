// ═══════════════════════════════════════════════════════════════════════════════
// USE SENTINEL GATEWAY HOOK
// React hook for integrating Protocol Sentinel into components
// IBM AI Firewall Integration for Zoe Infinity
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useMemo } from 'react';
import { 
  sentinelGateway, 
  type SentinelScanResult, 
  type SentinelThreat 
} from '@/core/security/ProtocolSentinelGateway';

export interface UseSentinelGatewayReturn {
  // Input filtering
  scanInput: (input: string) => SentinelScanResult;
  validateAndSanitize: (input: string) => { valid: boolean; sanitized: string; threats: SentinelThreat[] };
  
  // External content sanitization  
  sanitizeExternalContent: (
    content: string, 
    source: 'tubeSight' | 'webSearch' | 'firecrawl' | 'api' | 'unknown'
  ) => SentinelScanResult;
  
  // URL validation
  validateUrl: (url: string) => { safe: boolean; reason?: string };
  
  // State & statistics
  stats: {
    totalScans: number;
    threatsDetected: number;
    threatsBlocked: number;
    criticalThreats: number;
  };
  recentThreats: SentinelThreat[];
  lastScanResult: SentinelScanResult | null;
  
  // Actions
  refreshStats: () => void;
  clearThreats: () => void;
  
  // Quick checks
  isClean: (input: string) => boolean;
  hasCriticalThreat: (input: string) => boolean;
}

export function useSentinelGateway(): UseSentinelGatewayReturn {
  const [lastScanResult, setLastScanResult] = useState<SentinelScanResult | null>(null);
  const [stats, setStats] = useState(() => sentinelGateway.getStats());
  const [recentThreats, setRecentThreats] = useState<SentinelThreat[]>([]);

  // Refresh statistics
  const refreshStats = useCallback(() => {
    const currentStats = sentinelGateway.getStats();
    setStats(currentStats);
    setRecentThreats(sentinelGateway.getRecentThreats(10));
  }, []);

  // Scan user input for direct injection
  const scanInput = useCallback((input: string): SentinelScanResult => {
    const result = sentinelGateway.scanUserInput(input);
    setLastScanResult(result);
    
    // Auto-refresh stats after scan
    if (result.threats.length > 0) {
      refreshStats();
    }
    
    return result;
  }, [refreshStats]);

  // Validate and sanitize user input
  const validateAndSanitize = useCallback((input: string) => {
    const result = scanInput(input);
    
    // Block if any critical threats
    const hasCritical = result.threats.some(t => t.severity === 'critical');
    
    return {
      valid: result.clean || !hasCritical,
      sanitized: result.sanitizedContent,
      threats: result.threats
    };
  }, [scanInput]);

  // Sanitize external content (TubeSight, WebSearch, etc.)
  const sanitizeExternalContent = useCallback((
    content: string,
    source: 'tubeSight' | 'webSearch' | 'firecrawl' | 'api' | 'unknown'
  ): SentinelScanResult => {
    const result = sentinelGateway.sanitizeExternalContent(content, source);
    setLastScanResult(result);
    
    if (result.threats.length > 0) {
      refreshStats();
    }
    
    return result;
  }, [refreshStats]);

  // Validate URL
  const validateUrl = useCallback((url: string) => {
    return sentinelGateway.validateUrl(url);
  }, []);

  // Clear threats
  const clearThreats = useCallback(() => {
    sentinelGateway.clearThreatLog();
    setRecentThreats([]);
    refreshStats();
  }, [refreshStats]);

  // Quick checks
  const isClean = useCallback((input: string): boolean => {
    const result = sentinelGateway.scanUserInput(input);
    return result.clean;
  }, []);

  const hasCriticalThreat = useCallback((input: string): boolean => {
    const result = sentinelGateway.scanUserInput(input);
    return result.threats.some(t => t.severity === 'critical');
  }, []);

  // Memoized stats for display
  const displayStats = useMemo(() => ({
    totalScans: stats.totalScans,
    threatsDetected: stats.threatsDetected,
    threatsBlocked: stats.threatsBlocked,
    criticalThreats: stats.criticalThreats
  }), [stats]);

  return {
    // Input filtering
    scanInput,
    validateAndSanitize,
    
    // External content
    sanitizeExternalContent,
    
    // URL validation
    validateUrl,
    
    // State
    stats: displayStats,
    recentThreats,
    lastScanResult,
    
    // Actions
    refreshStats,
    clearThreats,
    
    // Quick checks
    isClean,
    hasCriticalThreat
  };
}

export default useSentinelGateway;
