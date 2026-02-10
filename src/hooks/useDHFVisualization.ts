/**
 * DHF Visualization Hook - Elite Advantage 2
 * Provides deep multimodal reasoning and T&E for ECN/DHF state visualization
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ECNVisualization {
  chart_type: 'line' | 'bubble' | 'radar' | 'heatmap';
  data_points: Array<{
    timestamp: string;
    value: number;
    label: string;
    color: string;
  }>;
  annotations: Array<{
    point: number;
    label: string;
    significance: string;
  }>;
  visual_reasoning: string;
  insights: string[];
  recommendations: string[];
}

interface VisualizationResult {
  success: boolean;
  visualization?: ECNVisualization;
  zoe_narration?: string;
  processing_time_ms?: number;
  data_coverage?: {
    ecn_points: number;
    zsmt_events: number;
    veto_events: number;
    dhf_sessions: number;
  };
  error?: string;
}

type VisualizationType = 'ecn_stress' | 'dhf_autonomy' | 'emotional_timeline' | 'stability_score' | 'full_state' | 'correlation_map';
type TimeRange = '24h' | '7d' | '30d' | '90d';

export const useDHFVisualization = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [currentVisualization, setCurrentVisualization] = useState<VisualizationResult | null>(null);

  const generateVisualization = useCallback(async (
    type: VisualizationType,
    options?: {
      timeRange?: TimeRange;
      includeReasoning?: boolean;
      format?: 'chart_data' | 'narrative' | 'both';
    }
  ): Promise<VisualizationResult | null> => {
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('dhf-visualization', {
        body: {
          visualization_type: type,
          time_range: options?.timeRange || '7d',
          include_reasoning: options?.includeReasoning ?? true,
          format: options?.format || 'both'
        }
      });

      if (error) throw error;

      const result: VisualizationResult = {
        success: data.success,
        visualization: data.visualization,
        zoe_narration: data.zoe_narration,
        processing_time_ms: data.processing_time_ms,
        data_coverage: data.data_coverage
      };

      setCurrentVisualization(result);

      if (data.success) {
        toast.success('Visualization ready', {
          description: `Analyzed ${data.data_coverage?.ecn_points || 0} data points`
        });
      }

      return result;

    } catch (error) {
      console.error('[DHF Visualization] Error:', error);
      const errorResult: VisualizationResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Visualization failed'
      };
      setCurrentVisualization(errorResult);
      toast.error('Visualization failed', { description: errorResult.error });
      return errorResult;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Convenience methods for specific visualization types
  const showStressVisualization = useCallback((timeRange?: TimeRange) => {
    return generateVisualization('ecn_stress', { timeRange });
  }, [generateVisualization]);

  const showEmotionalTimeline = useCallback((timeRange?: TimeRange) => {
    return generateVisualization('emotional_timeline', { timeRange });
  }, [generateVisualization]);

  const showDHFAutonomy = useCallback((timeRange?: TimeRange) => {
    return generateVisualization('dhf_autonomy', { timeRange });
  }, [generateVisualization]);

  const showStabilityScore = useCallback((timeRange?: TimeRange) => {
    return generateVisualization('stability_score', { timeRange });
  }, [generateVisualization]);

  const showFullState = useCallback(() => {
    return generateVisualization('full_state', { timeRange: '24h' });
  }, [generateVisualization]);

  const showCorrelationMap = useCallback((timeRange?: TimeRange) => {
    return generateVisualization('correlation_map', { timeRange });
  }, [generateVisualization]);

  const clearVisualization = useCallback(() => {
    setCurrentVisualization(null);
  }, []);

  // Get current insight from Zoe's visual reasoning
  const getCurrentInsight = useCallback((): string | null => {
    if (!currentVisualization?.visualization?.visual_reasoning) return null;
    return currentVisualization.visualization.visual_reasoning;
  }, [currentVisualization]);

  // Get annotations for highlighting in UI
  const getAnnotations = useCallback(() => {
    return currentVisualization?.visualization?.annotations || [];
  }, [currentVisualization]);

  return {
    isLoading,
    currentVisualization,
    generateVisualization,
    showStressVisualization,
    showEmotionalTimeline,
    showDHFAutonomy,
    showStabilityScore,
    showFullState,
    showCorrelationMap,
    clearVisualization,
    getCurrentInsight,
    getAnnotations
  };
};
