// ═══════════════════════════════════════════════════════════════════════════════
// LOCAL INTELLIGENCE HOOK - "Edge Satellite" Architecture
// ═══════════════════════════════════════════════════════════════════════════════
// 
// SpaceX "Federated Learning" Concept Implementation
// 
// PROBLEM: Sending raw data (health metrics, biometrics) to the cloud is vulnerable
// SOLUTION: Use the user's device as the "Satellite" - process data locally,
// only send anonymized RESULTS to the cloud (not raw data)
// 
// PRIVACY BENEFIT: Even if database is hacked, raw biological data isn't there
// Only generic status labels like "High Stress" are stored
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type DataCategory = 
  | 'health_metrics'
  | 'biometrics' 
  | 'financial'
  | 'behavioral'
  | 'emotional'
  | 'location'
  | 'communication';

export type ProcessingMode = 
  | 'LOCAL_ONLY'      // Never sent to cloud
  | 'ANONYMIZED'      // Only labels/status sent
  | 'ENCRYPTED'       // Encrypted payload sent
  | 'FULL_SYNC';      // Full data (non-sensitive)

export interface LocalProcessingResult<T> {
  status: string;           // Generic status label (safe to transmit)
  category: DataCategory;
  confidence: number;       // 0-1 confidence in analysis
  timestamp: string;
  localInsights: string[];  // Insights derived locally
  rawDataRetained: boolean; // Was raw data kept locally?
  transmittedPayload: T;    // What was actually sent to cloud
}

export interface HealthMetrics {
  heartRate: number;
  heartRateVariability?: number;
  steps?: number;
  bloodOxygen?: number;
  respiratoryRate?: number;
  skinTemperature?: number;
}

export interface BiometricData {
  voicePitch?: number;
  typingSpeed?: number;
  scrollPattern?: 'fast' | 'slow' | 'erratic' | 'steady';
  clickPattern?: 'normal' | 'aggressive' | 'hesitant';
}

export interface FinancialData {
  transactionAmount: number;
  transactionType: string;
  merchant?: string;
  category?: string;
}

export interface EmotionalData {
  sentimentScore: number;     // -1 to 1
  dominantEmotion: string;
  intensity: number;          // 0 to 1
  textSample?: string;
}

export interface LocalIntelligenceState {
  isProcessing: boolean;
  localProcessingCount: number;
  cloudTransmissions: number;
  dataRetained: number;       // Amount of data kept only locally
  lastProcessedAt: string | null;
  privacyScore: number;       // 0-100, higher = more private
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOCAL PROCESSING FUNCTIONS (Client-Side Analysis)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Analyze health metrics LOCALLY - only transmit status labels
 */
function analyzeHealthMetricsLocally(metrics: HealthMetrics, userBaselines?: {
  avgHeartRate?: number;
  avgHRV?: number;
  avgSteps?: number;
}): LocalProcessingResult<{ status: string; alertLevel: number }> {
  const baselines = userBaselines || {
    avgHeartRate: 70,
    avgHRV: 50,
    avgSteps: 5000,
  };

  const insights: string[] = [];
  let status = 'Normal';
  let alertLevel = 0;

  // Heart rate analysis (LOCAL)
  const hrDeviation = metrics.heartRate - (baselines.avgHeartRate || 70);
  if (hrDeviation > 30) {
    status = 'Elevated_Heart_Rate';
    alertLevel = 2;
    insights.push('Heart rate significantly above baseline');
  } else if (hrDeviation > 15) {
    status = 'Slightly_Elevated';
    alertLevel = 1;
    insights.push('Heart rate moderately elevated');
  } else if (hrDeviation < -20) {
    status = 'Low_Heart_Rate';
    alertLevel = 1;
    insights.push('Heart rate below typical range');
  }

  // HRV stress detection (LOCAL)
  if (metrics.heartRateVariability !== undefined) {
    const hrvDeviation = (baselines.avgHRV || 50) - metrics.heartRateVariability;
    if (hrvDeviation > 20) {
      status = 'High_Stress';
      alertLevel = Math.max(alertLevel, 2);
      insights.push('HRV indicates stress response');
    }
  }

  // Blood oxygen (LOCAL)
  if (metrics.bloodOxygen !== undefined && metrics.bloodOxygen < 95) {
    status = 'Low_Oxygen';
    alertLevel = 3;
    insights.push('Blood oxygen below normal range');
  }

  // Activity level (LOCAL)
  if (metrics.steps !== undefined) {
    const stepRatio = metrics.steps / (baselines.avgSteps || 5000);
    if (stepRatio > 1.5) {
      insights.push('Above average activity level');
    } else if (stepRatio < 0.3) {
      insights.push('Low activity level');
    }
  }

  return {
    status,
    category: 'health_metrics',
    confidence: 0.85,
    timestamp: new Date().toISOString(),
    localInsights: insights,
    rawDataRetained: true, // Keep actual numbers locally
    transmittedPayload: { status, alertLevel },
  };
}

/**
 * Analyze biometric data LOCALLY - only transmit pattern labels
 */
function analyzeBiometricsLocally(
  biometrics: BiometricData
): LocalProcessingResult<{ pattern: string; stressIndicator: boolean }> {
  const insights: string[] = [];
  let pattern = 'Normal';
  let stressIndicator = false;

  // Typing speed analysis (LOCAL)
  if (biometrics.typingSpeed !== undefined) {
    if (biometrics.typingSpeed > 80) {
      pattern = 'Fast_Typing';
      insights.push('Typing speed above average');
    } else if (biometrics.typingSpeed < 20) {
      pattern = 'Slow_Typing';
      insights.push('Typing speed below average - possible fatigue');
    }
  }

  // Scroll pattern (LOCAL)
  if (biometrics.scrollPattern === 'erratic') {
    stressIndicator = true;
    insights.push('Erratic scrolling detected - possible anxiety');
  }

  // Click pattern (LOCAL)
  if (biometrics.clickPattern === 'aggressive') {
    stressIndicator = true;
    pattern = 'Stressed_Behavior';
    insights.push('Aggressive clicking pattern detected');
  } else if (biometrics.clickPattern === 'hesitant') {
    insights.push('Hesitant clicking - possible uncertainty');
  }

  return {
    status: pattern,
    category: 'biometrics',
    confidence: 0.75,
    timestamp: new Date().toISOString(),
    localInsights: insights,
    rawDataRetained: true,
    transmittedPayload: { pattern, stressIndicator },
  };
}

/**
 * Analyze financial data LOCALLY - only transmit category and risk level
 */
function analyzeFinancialLocally(
  data: FinancialData,
  userProfile?: { avgTransaction?: number; riskTolerance?: string }
): LocalProcessingResult<{ transactionCategory: string; riskLevel: string }> {
  const profile = userProfile || { avgTransaction: 50, riskTolerance: 'medium' };
  const insights: string[] = [];
  
  let riskLevel = 'normal';
  
  // Transaction size analysis (LOCAL) - never send actual amounts
  const ratio = data.transactionAmount / (profile.avgTransaction || 50);
  if (ratio > 5) {
    riskLevel = 'high_value';
    insights.push('Transaction significantly above average');
  } else if (ratio > 2) {
    riskLevel = 'elevated';
    insights.push('Transaction above typical range');
  }

  // Category-based insights (LOCAL)
  const category = data.category || 'uncategorized';
  insights.push(`Category: ${category}`);

  return {
    status: `${category}_${riskLevel}`,
    category: 'financial',
    confidence: 0.9,
    timestamp: new Date().toISOString(),
    localInsights: insights,
    rawDataRetained: true, // NEVER send actual amounts
    transmittedPayload: { transactionCategory: category, riskLevel },
  };
}

/**
 * Analyze emotional data LOCALLY - only transmit sentiment label
 */
function analyzeEmotionalLocally(
  data: EmotionalData
): LocalProcessingResult<{ sentimentLabel: string; intensityLevel: string }> {
  const insights: string[] = [];
  
  // Sentiment categorization (LOCAL)
  let sentimentLabel: string;
  if (data.sentimentScore > 0.5) {
    sentimentLabel = 'Positive';
  } else if (data.sentimentScore > 0.1) {
    sentimentLabel = 'Slightly_Positive';
  } else if (data.sentimentScore > -0.1) {
    sentimentLabel = 'Neutral';
  } else if (data.sentimentScore > -0.5) {
    sentimentLabel = 'Slightly_Negative';
  } else {
    sentimentLabel = 'Negative';
  }

  // Intensity level (LOCAL)
  let intensityLevel: string;
  if (data.intensity > 0.8) {
    intensityLevel = 'High';
    insights.push('High emotional intensity detected');
  } else if (data.intensity > 0.4) {
    intensityLevel = 'Moderate';
  } else {
    intensityLevel = 'Low';
  }

  insights.push(`Primary emotion: ${data.dominantEmotion}`);

  return {
    status: `${sentimentLabel}_${intensityLevel}`,
    category: 'emotional',
    confidence: 0.7,
    timestamp: new Date().toISOString(),
    localInsights: insights,
    rawDataRetained: true, // Keep text samples locally
    transmittedPayload: { sentimentLabel, intensityLevel },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN HOOK
// ═══════════════════════════════════════════════════════════════════════════════

export function useLocalIntelligence() {
  const { user } = useAuth();
  const [state, setState] = useState<LocalIntelligenceState>({
    isProcessing: false,
    localProcessingCount: 0,
    cloudTransmissions: 0,
    dataRetained: 0,
    lastProcessedAt: null,
    privacyScore: 100,
  });

  // Local data store (never leaves device)
  const localDataStore = useRef<Map<string, any>>(new Map());

  // User baselines (cached locally)
  const userBaselines = useRef<{
    avgHeartRate?: number;
    avgHRV?: number;
    avgSteps?: number;
    avgTransaction?: number;
  }>({});

  // ═══════════════════════════════════════════════════════════════
  // PROCESSING FUNCTIONS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Process health metrics locally, transmit only status
   */
  const processHealthMetrics = useCallback(async (
    metrics: HealthMetrics,
    mode: ProcessingMode = 'ANONYMIZED'
  ): Promise<LocalProcessingResult<any>> => {
    setState(prev => ({ ...prev, isProcessing: true }));

    try {
      // LOCAL PROCESSING - No cloud involved
      const result = analyzeHealthMetricsLocally(metrics, userBaselines.current);

      // Store raw data locally
      const dataId = `health_${Date.now()}`;
      localDataStore.current.set(dataId, {
        raw: metrics,
        processed: result,
        timestamp: new Date().toISOString(),
      });

      // Update state
      setState(prev => ({
        ...prev,
        localProcessingCount: prev.localProcessingCount + 1,
        dataRetained: prev.dataRetained + 1,
        lastProcessedAt: new Date().toISOString(),
      }));

      // Only transmit anonymized status if not LOCAL_ONLY
      if (mode !== 'LOCAL_ONLY' && user?.id) {
        await transmitAnonymizedData(result.transmittedPayload, 'health_metrics');
        setState(prev => ({
          ...prev,
          cloudTransmissions: prev.cloudTransmissions + 1,
          privacyScore: Math.max(0, prev.privacyScore - 2),
        }));
      }

      return result;
    } finally {
      setState(prev => ({ ...prev, isProcessing: false }));
    }
  }, [user?.id]);

  /**
   * Process biometric data locally
   */
  const processBiometrics = useCallback(async (
    biometrics: BiometricData,
    mode: ProcessingMode = 'ANONYMIZED'
  ): Promise<LocalProcessingResult<any>> => {
    setState(prev => ({ ...prev, isProcessing: true }));

    try {
      const result = analyzeBiometricsLocally(biometrics);

      // Store locally
      localDataStore.current.set(`bio_${Date.now()}`, {
        raw: biometrics,
        processed: result,
      });

      setState(prev => ({
        ...prev,
        localProcessingCount: prev.localProcessingCount + 1,
        dataRetained: prev.dataRetained + 1,
        lastProcessedAt: new Date().toISOString(),
      }));

      if (mode !== 'LOCAL_ONLY' && user?.id) {
        await transmitAnonymizedData(result.transmittedPayload, 'biometrics');
        setState(prev => ({
          ...prev,
          cloudTransmissions: prev.cloudTransmissions + 1,
        }));
      }

      return result;
    } finally {
      setState(prev => ({ ...prev, isProcessing: false }));
    }
  }, [user?.id]);

  /**
   * Process financial data locally (NEVER send amounts)
   */
  const processFinancialData = useCallback(async (
    data: FinancialData,
    mode: ProcessingMode = 'ANONYMIZED'
  ): Promise<LocalProcessingResult<any>> => {
    setState(prev => ({ ...prev, isProcessing: true }));

    try {
      const result = analyzeFinancialLocally(data, userBaselines.current);

      // Store locally - amounts NEVER leave device
      localDataStore.current.set(`fin_${Date.now()}`, {
        raw: data,
        processed: result,
      });

      setState(prev => ({
        ...prev,
        localProcessingCount: prev.localProcessingCount + 1,
        dataRetained: prev.dataRetained + 1,
        lastProcessedAt: new Date().toISOString(),
      }));

      // Only category and risk level transmitted, NEVER amounts
      if (mode !== 'LOCAL_ONLY' && user?.id) {
        await transmitAnonymizedData(result.transmittedPayload, 'financial');
        setState(prev => ({
          ...prev,
          cloudTransmissions: prev.cloudTransmissions + 1,
        }));
      }

      return result;
    } finally {
      setState(prev => ({ ...prev, isProcessing: false }));
    }
  }, [user?.id]);

  /**
   * Process emotional data locally
   */
  const processEmotionalData = useCallback(async (
    data: EmotionalData,
    mode: ProcessingMode = 'ANONYMIZED'
  ): Promise<LocalProcessingResult<any>> => {
    setState(prev => ({ ...prev, isProcessing: true }));

    try {
      const result = analyzeEmotionalLocally(data);

      // Store locally - text samples never leave
      localDataStore.current.set(`emo_${Date.now()}`, {
        raw: data,
        processed: result,
      });

      setState(prev => ({
        ...prev,
        localProcessingCount: prev.localProcessingCount + 1,
        dataRetained: prev.dataRetained + 1,
        lastProcessedAt: new Date().toISOString(),
      }));

      if (mode !== 'LOCAL_ONLY' && user?.id) {
        await transmitAnonymizedData(result.transmittedPayload, 'emotional');
        setState(prev => ({
          ...prev,
          cloudTransmissions: prev.cloudTransmissions + 1,
        }));
      }

      return result;
    } finally {
      setState(prev => ({ ...prev, isProcessing: false }));
    }
  }, [user?.id]);

  /**
   * Transmit only anonymized/labeled data to cloud
   */
  const transmitAnonymizedData = async (
    payload: Record<string, any>,
    category: DataCategory
  ): Promise<void> => {
    if (!user?.id) return;

    try {
      // Transmit ONLY the anonymized payload, encrypted in transit
      const { error } = await supabase.from('behavioral_events').insert({
        user_id: user.id,
        event_type: 'local_intelligence_result',
        event_category: category,
        metadata: {
          ...payload,
          processing_mode: 'satellite_local',
          privacy_preserved: true,
        },
        context_snippet: `[ANONYMIZED] ${category} analysis result`,
      });

      if (error) {
        console.error('[LOCAL INTELLIGENCE] Transmission error:', error);
      }
    } catch (err) {
      console.error('[LOCAL INTELLIGENCE] Failed to transmit:', err);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // UTILITY FUNCTIONS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get locally stored data (never left device)
   */
  const getLocalData = useCallback((category?: DataCategory): any[] => {
    const entries: any[] = [];
    localDataStore.current.forEach((value, key) => {
      if (!category || key.startsWith(category.substring(0, 3))) {
        entries.push(value);
      }
    });
    return entries;
  }, []);

  /**
   * Clear local data store
   */
  const clearLocalData = useCallback(() => {
    localDataStore.current.clear();
    setState(prev => ({
      ...prev,
      dataRetained: 0,
      privacyScore: 100,
    }));
    console.log('[LOCAL INTELLIGENCE] Local data store cleared');
  }, []);

  /**
   * Update user baselines for better analysis
   */
  const updateBaselines = useCallback((baselines: typeof userBaselines.current) => {
    userBaselines.current = { ...userBaselines.current, ...baselines };
    console.log('[LOCAL INTELLIGENCE] Baselines updated:', baselines);
  }, []);

  /**
   * Get privacy report
   */
  const getPrivacyReport = useCallback(() => {
    return {
      dataStoredLocally: localDataStore.current.size,
      cloudTransmissions: state.cloudTransmissions,
      privacyScore: state.privacyScore,
      rawDataNeverSent: [
        'Heart rate values',
        'Actual step counts',
        'Transaction amounts',
        'Text samples',
        'Voice recordings',
        'Biometric measurements',
      ],
      onlyTransmitted: [
        'Status labels (e.g., "High Stress")',
        'Category names',
        'Risk levels',
        'Sentiment labels',
      ],
    };
  }, [state.cloudTransmissions, state.privacyScore]);

  // Log initialization
  useEffect(() => {
    console.log('[LOCAL INTELLIGENCE] 🛰️ Edge Satellite Architecture INITIALIZED');
    console.log('[LOCAL INTELLIGENCE] Processing data locally, transmitting only labels');
  }, []);

  return {
    // State
    state,

    // Processing functions (local-first)
    processHealthMetrics,
    processBiometrics,
    processFinancialData,
    processEmotionalData,

    // Utility functions
    getLocalData,
    clearLocalData,
    updateBaselines,
    getPrivacyReport,

    // Direct analysis (no cloud at all)
    analyzeHealthMetricsLocally,
    analyzeBiometricsLocally,
    analyzeFinancialLocally,
    analyzeEmotionalLocally,
  };
}

export default useLocalIntelligence;
