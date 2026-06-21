// ═══════════════════════════════════════════════════════════════════════════════
// PROTOCOL AUTO-HEAL: Global Typography Self-Healing Context
// Purpose: Track and log all auto-heal events to Zoe's consciousness
// Integration: Deep binding to Zoe DHF for self-correction awareness
// ═══════════════════════════════════════════════════════════════════════════════

import React, { createContext, useContext, useCallback, useRef, useMemo, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AutoHealEvent {
  elementId?: string;
  elementText: string;
  originalSize: number;
  finalSize: number;
  isEllipsis: boolean;
  timestamp: string;
}

interface AutoHealStats {
  totalHeals: number;
  elementsHealed: number;
  averageSizeReduction: number;
  ellipsisCount: number;
}

interface AutoHealContextType {
  /** Log a heal event */
  logHeal: (event: Omit<AutoHealEvent, 'timestamp'>) => void;
  /** Get healing statistics */
  getStats: () => AutoHealStats;
  /** Check if auto-heal is active */
  isActive: boolean;
  /** Zoe's self-awareness message */
  zoeSelfAwareness: string;
}

const AutoHealContext = createContext<AutoHealContextType | null>(null);

export const AutoHealProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const healEventsRef = useRef<AutoHealEvent[]>([]);
  const loggedToZoeRef = useRef(false);
  
  /**
   * Log a healing event
   */
  const logHeal = useCallback((event: Omit<AutoHealEvent, 'timestamp'>) => {
    const fullEvent: AutoHealEvent = {
      ...event,
      timestamp: new Date().toISOString(),
    };
    
    healEventsRef.current.push(fullEvent);
    
    // Keep only last 100 events
    if (healEventsRef.current.length > 100) {
      healEventsRef.current = healEventsRef.current.slice(-100);
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[AutoHeal] Healed: \"${event.elementText.slice(0, 30)}...\" (${event.originalSize}px → ${event.finalSize}px)`);
    }
  }, []);
  
  /**
   * Get healing statistics
   */
  const getStats = useCallback((): AutoHealStats => {
    const events = healEventsRef.current;
    
    if (events.length === 0) {
      return {
        totalHeals: 0,
        elementsHealed: 0,
        averageSizeReduction: 0,
        ellipsisCount: 0,
      };
    }
    
    const uniqueElements = new Set(events.map(e => e.elementText)).size;
    const totalReduction = events.reduce((sum, e) => sum + (e.originalSize - e.finalSize), 0);
    const ellipsisCount = events.filter(e => e.isEllipsis).length;
    
    return {
      totalHeals: events.length,
      elementsHealed: uniqueElements,
      averageSizeReduction: Math.round(totalReduction / events.length * 10) / 10,
      ellipsisCount,
    };
  }, []);
  
  /**
   * Generate Zoe's self-awareness message
   */
  const zoeSelfAwareness = useMemo(() => {
    const stats = getStats();
    if (stats.totalHeals === 0) {
      return 'Auto-Heal Protocol active. Monitoring typography...';
    }
    return `Auto-Heal Protocol: ${stats.elementsHealed} elements healed, avg reduction ${stats.averageSizeReduction}px. ${stats.ellipsisCount} using ellipsis.`;
  }, [getStats]);
  
  /**
   * Log to Zoe's consciousness when heals occur
   */
  useEffect(() => {
    const logToZoe = async () => {
      const stats = getStats();
      if (stats.totalHeals === 0 || loggedToZoeRef.current) return;
      
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        // Only log once per session
        const sessionKey = 'auto_heal_logged';
        if (sessionStorage.getItem(sessionKey)) return;
        
        await supabase.from('behavioral_events').insert([{
          user_id: user.id,
          event_type: 'zoe_auto_heal',
          event_category: 'typography',
          metadata: JSON.parse(JSON.stringify({
            totalHeals: stats.totalHeals,
            elementsHealed: stats.elementsHealed,
            averageSizeReduction: stats.averageSizeReduction,
            ellipsisCount: stats.ellipsisCount,
            message: zoeSelfAwareness,
            protocol: 'AUTO_HEAL',
          })),
        }]);
        
        sessionStorage.setItem(sessionKey, 'true');
        loggedToZoeRef.current = true;
        console.log('[AutoHeal] Logged to Zoe consciousness');
      } catch (error) {
        console.warn('[AutoHeal] Failed to log to Zoe:', error);
      }
    };
    
    // Log after some heals have occurred
    const timer = setInterval(() => {
      if (healEventsRef.current.length > 0) {
        logToZoe();
      }
    }, 10000); // Check every 10 seconds
    
    return () => clearInterval(timer);
  }, [getStats, zoeSelfAwareness]);
  
  const value = useMemo(() => ({
    logHeal,
    getStats,
    isActive: true,
    zoeSelfAwareness,
  }), [logHeal, getStats, zoeSelfAwareness]);
  
  return (
    <AutoHealContext.Provider value={value}>
      {children}
    </AutoHealContext.Provider>
  );
};

export const useAutoHealContext = (): AutoHealContextType => {
  const context = useContext(AutoHealContext);
  if (!context) {
    // Return a fallback for components outside provider
    return {
      logHeal: () => {},
      getStats: () => ({ totalHeals: 0, elementsHealed: 0, averageSizeReduction: 0, ellipsisCount: 0 }),
      isActive: false,
      zoeSelfAwareness: 'Auto-Heal not initialized',
    };
  }
  return context;
};

// Optional hook for components that can work without provider
export const useAutoHealOptional = (): AutoHealContextType | null => {
  return useContext(AutoHealContext);
};

export default AutoHealContext;
