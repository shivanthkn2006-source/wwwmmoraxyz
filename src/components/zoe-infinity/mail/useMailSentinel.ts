/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ZOE INFINITY MAIL - MAIL SENTINEL HOOK
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * React hook for interacting with the Mail Sentinel agent.
 * Provides email analysis, briefings, and auto-response capabilities.
 * 
 * Architecture: Standalone for migration
 * Cost: Lovable AI usage-based
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MailMessage, GatekeeperVerdict, MessagePriority, GatekeeperAction } from './types';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface EmailAnalysis {
  category: GatekeeperVerdict;
  priority: MessagePriority;
  summary: string;
  actionRequired: boolean;
  suggestedAction?: {
    type: 'reply' | 'archive' | 'delete' | 'schedule' | 'track_finance' | 'forward';
    description: string;
    autoExecute: boolean;
    draftContent?: string;
  };
  extractedData?: {
    amount?: number;
    currency?: string;
    dueDate?: string;
    eventDate?: string;
    eventTime?: string;
    senderIntent?: string;
  };
  sentiment: 'positive' | 'neutral' | 'negative';
  phishingRisk: number;
}

export interface BriefingData {
  urgentCount: number;
  urgentItems: { sender: string; subject: string; summary: string }[];
  actionsPending: number;
  newslettersArchived: number;
  spamBlocked: number;
  voiceSummary: string;
  highlights: string[];
}

export interface DraftResponse {
  subject: string;
  body: string;
  tone: 'professional' | 'friendly' | 'formal';
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════════

export function useMailSentinel() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingBriefing, setIsGeneratingBriefing] = useState(false);
  const [isGeneratingResponse, setIsGeneratingResponse] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Analyze a single email with the Gatekeeper AI
   */
  const analyzeEmail = useCallback(async (
    email: Pick<MailMessage, 'senderName' | 'senderEmail' | 'subject' | 'preview' | 'receivedAt' | 'senderVerified'>
  ): Promise<EmailAnalysis | null> => {
    setIsAnalyzing(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('mail-sentinel', {
        body: {
          action: 'analyze',
          payload: {
            sender: email.senderName,
            senderEmail: email.senderEmail,
            subject: email.subject,
            body: email.preview,
            receivedAt: email.receivedAt.toISOString(),
            isVerifiedSender: email.senderVerified,
          },
        },
      });

      if (fnError) throw new Error(fnError.message);
      return data?.analysis || null;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Analysis failed';
      setError(message);
      console.error('[MailSentinel] Analysis error:', message);
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  /**
   * Generate a daily briefing from a list of emails
   */
  const generateBriefing = useCallback(async (
    emails: Array<{
      sender: string;
      subject: string;
      category: string;
      priority: string;
      summary?: string;
      actionRequired?: boolean;
    }>,
    timeRange: 'today' | 'yesterday' | 'week' = 'today'
  ): Promise<BriefingData | null> => {
    setIsGeneratingBriefing(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('mail-sentinel', {
        body: {
          action: 'briefing',
          payload: { emails, timeRange },
        },
      });

      if (fnError) throw new Error(fnError.message);
      return data?.briefing || null;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Briefing generation failed';
      setError(message);
      console.error('[MailSentinel] Briefing error:', message);
      return null;
    } finally {
      setIsGeneratingBriefing(false);
    }
  }, []);

  /**
   * Generate an auto-response draft
   */
  const generateAutoResponse = useCallback(async (
    originalEmail: { sender: string; subject: string; body: string },
    responseType: 'accept_meeting' | 'decline_meeting' | 'propose_time' | 'acknowledge' | 'request_info',
    userContext?: { name?: string; schedule?: { date: string; available: boolean }[]; preferences?: string }
  ): Promise<DraftResponse | null> => {
    setIsGeneratingResponse(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('mail-sentinel', {
        body: {
          action: 'auto_respond',
          payload: { originalEmail, responseType, userContext },
        },
      });

      if (fnError) throw new Error(fnError.message);
      return data?.draft || null;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Response generation failed';
      setError(message);
      console.error('[MailSentinel] Response error:', message);
      return null;
    } finally {
      setIsGeneratingResponse(false);
    }
  }, []);

  /**
   * Batch process multiple emails for quick classification
   */
  const batchProcess = useCallback(async (
    emails: Array<{
      id: string;
      sender: string;
      senderEmail: string;
      subject: string;
      bodyPreview: string;
    }>
  ): Promise<Array<{
    id: string;
    category: string;
    priority: string;
    summary: string;
    autoAction: string;
  }> | null> => {
    setIsAnalyzing(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('mail-sentinel', {
        body: {
          action: 'batch_process',
          payload: { emails },
        },
      });

      if (fnError) throw new Error(fnError.message);
      return data?.results || null;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Batch processing failed';
      setError(message);
      console.error('[MailSentinel] Batch error:', message);
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  /**
   * Convert analysis to Gatekeeper action for UI
   */
  const analysisToGatekeeperAction = useCallback((
    analysis: EmailAnalysis
  ): GatekeeperAction | undefined => {
    if (!analysis.suggestedAction) return undefined;

    const typeMap: Record<string, GatekeeperAction['type']> = {
      'reply': 'reply',
      'archive': 'archive',
      'delete': 'delete',
      'schedule': 'book_meeting',
      'track_finance': 'summarize',
      'forward': 'reply',
    };

    return {
      type: typeMap[analysis.suggestedAction.type] || 'summarize',
      description: analysis.suggestedAction.description,
      autoExecute: analysis.suggestedAction.autoExecute,
      payload: {
        draftContent: analysis.suggestedAction.draftContent,
        extractedData: analysis.extractedData,
      },
    };
  }, []);

  return {
    // State
    isAnalyzing,
    isGeneratingBriefing,
    isGeneratingResponse,
    error,
    
    // Actions
    analyzeEmail,
    generateBriefing,
    generateAutoResponse,
    batchProcess,
    analysisToGatekeeperAction,
  };
}

export default useMailSentinel;
