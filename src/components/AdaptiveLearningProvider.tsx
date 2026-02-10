// ═══════════════════════════════════════════════════════════════════════════════
// ADAPTIVE LEARNING PROVIDER
// Global context for zero-friction adaptive learning system
// With integrated DHF Data Health Scanner for real-time data flow monitoring
// ═══════════════════════════════════════════════════════════════════════════════

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAdaptiveLearning } from '@/hooks/useAdaptiveLearning';
import { useDHFDataHealthScanner } from '@/hooks/useDHFDataHealthScanner';
import { useContinuousDHFStream } from '@/hooks/useContinuousDHFStream';
import { useAuth } from '@/lib/auth';
import { ContextRefreshAlert } from './ContextRefreshAlert';
import { toast } from 'sonner';

interface DHFHealthStatus {
  isHealthy: boolean;
  lastScanAt: Date | null;
  recentEventsCount: number;
  dataFlowRate: number;
  adaptiveLearningActive: boolean;
}

interface AdaptiveLearningContextType {
  syncStatus: {
    event_count: number;
    sync_percentage: number;
    finetuning_ready: boolean;
    last_sync_at: string | null;
  };
  dhfHealth: DHFHealthStatus;
  isDataFlowing: boolean;
  trackAIInteraction: (
    type: 'chat' | 'voice' | 'generation' | 'analysis',
    context: string,
    metadata?: Record<string, any>
  ) => void;
  trackSocialActivity: (
    type: 'post' | 'comment' | 'like' | 'share' | 'notification',
    context: string,
    metadata?: Record<string, any>
  ) => void;
  trackNavigation: (feature: string, metadata?: Record<string, any>) => void;
  trackContentCreation: (
    type: 'text' | 'image' | 'video' | 'audio',
    context: string,
    metadata?: Record<string, any>
  ) => void;
  trackPlatformEvent: (eventType: string, category: string, context: string, metadata?: Record<string, any>) => void;
  recordSentimentTapback: (
    sentiment: 'helpful' | 'confused' | 'perfect',
    responseId: string,
    responseSnippet: string,
    featureContext?: string
  ) => void;
  recordVetoFeedback: (
    interventionId: string,
    helpedOrHindered: 'helped' | 'hindered' | 'neutral',
    timingRating: number,
    contextSnippet?: string
  ) => void;
  requiresContextRefresh: boolean;
  dismissContextAlert: () => void;
  forceDataSync: () => Promise<boolean>;
  runHealthScan: () => Promise<any>;
}

const AdaptiveLearningContext = createContext<AdaptiveLearningContextType | null>(null);

export const useAdaptiveLearningContext = () => {
  const context = useContext(AdaptiveLearningContext);
  if (!context) {
    throw new Error('useAdaptiveLearningContext must be used within AdaptiveLearningProvider');
  }
  return context;
};

interface AdaptiveLearningProviderProps {
  children: React.ReactNode;
}

export const AdaptiveLearningProvider: React.FC<AdaptiveLearningProviderProps> = ({
  children,
}) => {
  const { user } = useAuth();
  const {
    syncStatus,
    activityFreshness,
    trackAIInteraction,
    trackSocialActivity,
    trackNavigation,
    trackContentCreation,
    recordSentimentTapback,
    recordVetoFeedback,
  } = useAdaptiveLearning();

  // DHF Health Scanner integration
  const {
    healthStatus: dhfHealth,
    forceDataSync,
    runHealthScan,
  } = useDHFDataHealthScanner();

  // Continuous DHF Stream integration for real-time data flow
  const dhfStream = useContinuousDHFStream({ enableECNProcessing: true });

  const [showContextAlert, setShowContextAlert] = useState(false);
  const [alertDismissed, setAlertDismissed] = useState(false);
  const [isDataFlowing, setIsDataFlowing] = useState(false);

  // Track any platform event for Zoe's adaptive learning
  const trackPlatformEvent = useCallback((
    eventType: string,
    category: string,
    context: string,
    metadata?: Record<string, any>
  ) => {
    if (!user) return;

    // Queue event to DHF stream
    dhfStream.queueEvent({
      event_type: eventType,
      event_category: category,
      context_snippet: context.substring(0, 50),
      metadata: {
        ...metadata,
        source: 'platform_event',
        timestamp: new Date().toISOString(),
      },
    });
  }, [user, dhfStream]);

  // Monitor data flow status
  useEffect(() => {
    const flowing = dhfHealth.isHealthy && 
                    dhfHealth.dataFlowRate > 0 && 
                    dhfStream.isStreaming;
    setIsDataFlowing(flowing);
  }, [dhfHealth.isHealthy, dhfHealth.dataFlowRate, dhfStream.isStreaming]);

  // Auto-fix data flow if stopped for too long
  useEffect(() => {
    if (!user || isDataFlowing) return;

    // If data stopped flowing for more than 2 minutes, force sync
    const checkTimeout = setTimeout(async () => {
      if (!isDataFlowing && dhfHealth.recentEventsCount === 0) {
        console.log('[AdaptiveLearning] Data flow stopped, forcing sync...');
        const synced = await forceDataSync();
        if (synced) {
          toast.success('Data sync restored', { duration: 2000 });
        }
      }
    }, 120000); // 2 minutes

    return () => clearTimeout(checkTimeout);
  }, [user, isDataFlowing, dhfHealth.recentEventsCount, forceDataSync]);

  // Check if context refresh is needed
  useEffect(() => {
    if (activityFreshness?.requires_context_refresh && !alertDismissed) {
      // Delay showing alert to not interrupt user flow
      const timer = setTimeout(() => {
        setShowContextAlert(true);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [activityFreshness, alertDismissed]);

  // Run initial health scan on mount
  useEffect(() => {
    if (user) {
      // Delayed initial scan to let other systems initialize
      const initTimer = setTimeout(() => {
        runHealthScan();
      }, 3000);
      return () => clearTimeout(initTimer);
    }
  }, [user, runHealthScan]);

  const dismissContextAlert = () => {
    setShowContextAlert(false);
    setAlertDismissed(true);
    // Reset after 24 hours
    setTimeout(() => setAlertDismissed(false), 24 * 60 * 60 * 1000);
  };

  const contextValue: AdaptiveLearningContextType = {
    syncStatus,
    dhfHealth: {
      isHealthy: dhfHealth.isHealthy,
      lastScanAt: dhfHealth.lastScanAt,
      recentEventsCount: dhfHealth.recentEventsCount,
      dataFlowRate: dhfHealth.dataFlowRate,
      adaptiveLearningActive: dhfHealth.adaptiveLearningActive,
    },
    isDataFlowing,
    trackAIInteraction,
    trackSocialActivity,
    trackNavigation,
    trackContentCreation,
    trackPlatformEvent,
    recordSentimentTapback,
    recordVetoFeedback,
    requiresContextRefresh: activityFreshness?.requires_context_refresh || false,
    dismissContextAlert,
    forceDataSync,
    runHealthScan,
  };

  return (
    <AdaptiveLearningContext.Provider value={contextValue}>
      {children}
      
      {/* Context Refresh Alert */}
      {showContextAlert && activityFreshness && user && (
        <div className="fixed bottom-20 left-4 right-4 z-50 max-w-md mx-auto">
          <ContextRefreshAlert
            recentPosts={activityFreshness.recent_posts}
            recentEvents={activityFreshness.recent_events}
            daysChecked={7}
            onDismiss={dismissContextAlert}
          />
        </div>
      )}
    </AdaptiveLearningContext.Provider>
  );
};

export default AdaptiveLearningProvider;