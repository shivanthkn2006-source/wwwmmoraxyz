// ═══════════════════════════════════════════════════════════════════════════════
// ZOE UNIFIED SELF-HEALER PROVIDER
// Provides global self-healing context and automatic error recovery
// ═══════════════════════════════════════════════════════════════════════════════

import React, { createContext, useContext, useEffect } from 'react';
import { useZoeUnifiedSelfHealer } from '@/hooks/useZoeUnifiedSelfHealer';

interface SelfHealerContextType {
  isScanning: boolean;
  lastReport: any;
  runUnifiedScan: (options?: any) => Promise<any>;
  captureError: (error: Error | string) => void;
  getHealthScore: () => number;
  getHealthStatus: () => string;
}

const SelfHealerContext = createContext<SelfHealerContextType | null>(null);

export const useSelfHealerContext = () => {
  const context = useContext(SelfHealerContext);
  if (!context) {
    // Return safe defaults when not in provider
    return {
      isScanning: false,
      lastReport: null,
      runUnifiedScan: async () => null,
      captureError: () => {},
      getHealthScore: () => 100,
      getHealthStatus: () => 'unknown',
    };
  }
  return context;
};

interface ZoeUnifiedSelfHealerProviderProps {
  children: React.ReactNode;
}

export const ZoeUnifiedSelfHealerProvider: React.FC<ZoeUnifiedSelfHealerProviderProps> = ({
  children,
}) => {
  const selfHealer = useZoeUnifiedSelfHealer();

  // Log health status changes
  useEffect(() => {
    if (selfHealer.lastReport) {
      const { status, overall_score, issues_found, issues_fixed } = selfHealer.lastReport;
      if (status === 'critical') {
        console.warn('[ZoeSelfHealer] CRITICAL STATUS:', overall_score, '% - Issues:', issues_found);
      } else if (issues_fixed > 0) {
        console.log('[ZoeSelfHealer] Auto-fixed', issues_fixed, 'issues');
      }
    }
  }, [selfHealer.lastReport]);

  return (
    <SelfHealerContext.Provider value={selfHealer}>
      {children}
    </SelfHealerContext.Provider>
  );
};

export default ZoeUnifiedSelfHealerProvider;
