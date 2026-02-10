/**
 * RAA Code Debugger Hook - Elite Advantage 1
 * Provides external code debugging and synthesis using Gemini 3 Pro
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CodeAnalysisResult {
  diagnosis: {
    root_cause: string;
    affected_lines: number[];
    severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
    category: string;
  };
  vulnerabilities: Array<{
    type: string;
    line: number;
    description: string;
    cwe_id?: string;
  }>;
  performance_issues: Array<{
    type: string;
    line: number;
    impact: string;
    suggestion: string;
  }>;
  corrected_code: string;
  patch_commands: string[];
  explanation: string;
  confidence_score: number;
}

interface DebugResult {
  success: boolean;
  analysis?: CodeAnalysisResult;
  processing_time_ms?: number;
  zoe_response?: string;
  error?: string;
}

export const useRAACodeDebugger = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastResult, setLastResult] = useState<DebugResult | null>(null);

  const analyzeCode = useCallback(async (
    codeSnippet: string,
    options?: {
      errorLog?: string;
      language?: string;
      analysisType?: 'debug' | 'security' | 'performance' | 'full_audit';
      generateFix?: boolean;
    }
  ): Promise<DebugResult | null> => {
    if (!codeSnippet.trim()) {
      toast.error('No code provided', { description: 'Please provide code to analyze' });
      return null;
    }

    setIsAnalyzing(true);

    try {
      const { data, error } = await supabase.functions.invoke('raa-code-debugger', {
        body: {
          code_snippet: codeSnippet,
          error_log: options?.errorLog,
          language: options?.language,
          analysis_type: options?.analysisType || 'full_audit',
          generate_fix: options?.generateFix ?? true
        }
      });

      if (error) throw error;

      const result: DebugResult = {
        success: data.success,
        analysis: data.analysis,
        processing_time_ms: data.processing_time_ms,
        zoe_response: data.zoe_response
      };

      setLastResult(result);

      if (data.success) {
        const severity = data.analysis?.diagnosis?.severity || 'info';
        const severityColors = {
          critical: 'destructive',
          high: 'destructive',
          medium: 'warning',
          low: 'info',
          info: 'info'
        };

        toast.success('Code analysis complete', {
          description: data.zoe_response
        });
      }

      return result;

    } catch (error) {
      console.error('[RAA Code Debugger] Error:', error);
      const errorResult: DebugResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Analysis failed'
      };
      setLastResult(errorResult);
      toast.error('Code analysis failed', { description: errorResult.error });
      return errorResult;
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const quickDebug = useCallback((code: string, errorLog?: string) => {
    return analyzeCode(code, { errorLog, analysisType: 'debug', generateFix: true });
  }, [analyzeCode]);

  const securityScan = useCallback((code: string, language?: string) => {
    return analyzeCode(code, { language, analysisType: 'security', generateFix: false });
  }, [analyzeCode]);

  const performanceAudit = useCallback((code: string, language?: string) => {
    return analyzeCode(code, { language, analysisType: 'performance', generateFix: true });
  }, [analyzeCode]);

  const fullAudit = useCallback((code: string, errorLog?: string, language?: string) => {
    return analyzeCode(code, { errorLog, language, analysisType: 'full_audit', generateFix: true });
  }, [analyzeCode]);

  const clearResult = useCallback(() => {
    setLastResult(null);
  }, []);

  return {
    isAnalyzing,
    lastResult,
    analyzeCode,
    quickDebug,
    securityScan,
    performanceAudit,
    fullAudit,
    clearResult
  };
};
