/**
 * EXTERNAL ONTOLOGY ADAPTER
 * Securely pulls and filters external conversational data
 * Inactive by default - requires explicit user consent
 * Logs all results to ZSMT
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

interface ExternalDataSource {
  type: 'calendar' | 'chat_logs' | 'email_summary' | 'social_commitments';
  name: string;
  status: 'pending' | 'connected' | 'disconnected' | 'error';
  lastSync?: string;
}

interface ExternalEvent {
  type: string;
  title: string;
  date: string;
  source: string;
  metadata?: any;
}

interface SocialCommitment {
  type: 'meeting' | 'call' | 'event' | 'task' | 'promise';
  description: string;
  dueDate?: string;
  priority: 'high' | 'medium' | 'low';
  relatedPerson?: string;
}

interface OntologyState {
  isActive: boolean;
  hasConsent: boolean;
  connectedSources: ExternalDataSource[];
  recentEvents: ExternalEvent[];
  socialCommitments: SocialCommitment[];
  lastSyncTimestamp?: string;
}

export const useExternalOntologyAdapter = () => {
  const { user } = useAuth();
  
  const [state, setState] = useState<OntologyState>({
    isActive: false,
    hasConsent: false,
    connectedSources: [],
    recentEvents: [],
    socialCommitments: []
  });

  // Load consent status from database
  useEffect(() => {
    if (!user?.id) return;

    const loadConsentStatus = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('enrichment_consent')
        .eq('user_id', user.id)
        .single();

      if (data) {
        setState(prev => ({
          ...prev,
          hasConsent: data.enrichment_consent || false,
          isActive: data.enrichment_consent || false
        }));
      }
    };

    loadConsentStatus();
  }, [user?.id]);

  // Request user consent
  const requestConsent = useCallback(async (): Promise<boolean> => {
    if (!user?.id) return false;

    // This would typically show a consent modal
    // For now, we'll just update the state
    console.log('[OntologyAdapter] Consent request initiated');
    
    return new Promise((resolve) => {
      // Emit event for UI to handle consent dialog
      window.dispatchEvent(new CustomEvent('zoe-ontology-consent-request', {
        detail: { userId: user.id }
      }));
      
      // Listen for response
      const handler = (event: CustomEvent) => {
        const granted = event.detail.granted;
        if (granted) {
          setState(prev => ({ ...prev, hasConsent: true, isActive: true }));
        }
        resolve(granted);
        window.removeEventListener('zoe-ontology-consent-response', handler as EventListener);
      };
      
      window.addEventListener('zoe-ontology-consent-response', handler as EventListener);
    });
  }, [user?.id]);

  // Grant consent programmatically
  const grantConsent = useCallback(async () => {
    if (!user?.id) return;

    await supabase
      .from('profiles')
      .update({ enrichment_consent: true })
      .eq('user_id', user.id);

    setState(prev => ({ ...prev, hasConsent: true, isActive: true }));

    // Log to ZSMT
    await logToZSMT('consent_granted', 'User granted external ontology data access');
  }, [user?.id]);

  // Revoke consent
  const revokeConsent = useCallback(async () => {
    if (!user?.id) return;

    await supabase
      .from('profiles')
      .update({ enrichment_consent: false })
      .eq('user_id', user.id);

    setState(prev => ({
      ...prev,
      hasConsent: false,
      isActive: false,
      connectedSources: [],
      recentEvents: [],
      socialCommitments: []
    }));

    // Log to ZSMT
    await logToZSMT('consent_revoked', 'User revoked external ontology data access');
  }, [user?.id]);

  // Log to ZSMT
  const logToZSMT = useCallback(async (eventType: string, content: string, data?: any) => {
    if (!user?.id) return;

    try {
      await (supabase.from('zoe_sovereign_memory') as any).insert({
        user_id: user.id,
        event_type: eventType,
        content_text: content,
        zoe_state_json: data || {},
        session_id: `ontology_${Date.now()}`
      });
    } catch (e) {
      console.error('[OntologyAdapter] Failed to log to ZSMT:', e);
    }
  }, [user?.id]);

  // Connect a data source
  const connectSource = useCallback(async (sourceType: ExternalDataSource['type']) => {
    if (!state.hasConsent) {
      console.warn('[OntologyAdapter] Cannot connect source without consent');
      return false;
    }

    const newSource: ExternalDataSource = {
      type: sourceType,
      name: getSourceName(sourceType),
      status: 'pending'
    };

    setState(prev => ({
      ...prev,
      connectedSources: [...prev.connectedSources.filter(s => s.type !== sourceType), newSource]
    }));

    // Simulate connection (would integrate with actual APIs)
    await new Promise(resolve => setTimeout(resolve, 1000));

    setState(prev => ({
      ...prev,
      connectedSources: prev.connectedSources.map(s => 
        s.type === sourceType ? { ...s, status: 'connected', lastSync: new Date().toISOString() } : s
      )
    }));

    await logToZSMT('source_connected', `Connected external source: ${sourceType}`);
    return true;
  }, [state.hasConsent, logToZSMT]);

  // Disconnect a data source
  const disconnectSource = useCallback(async (sourceType: ExternalDataSource['type']) => {
    setState(prev => ({
      ...prev,
      connectedSources: prev.connectedSources.filter(s => s.type !== sourceType)
    }));

    await logToZSMT('source_disconnected', `Disconnected external source: ${sourceType}`);
  }, [logToZSMT]);

  // Pull calendar events (simulated)
  const pullCalendarEvents = useCallback(async (): Promise<ExternalEvent[]> => {
    if (!state.hasConsent || !state.connectedSources.find(s => s.type === 'calendar')) {
      return [];
    }

    // Would integrate with Google Calendar, Outlook, etc.
    // For now, return empty array as placeholder
    const events: ExternalEvent[] = [];
    
    await logToZSMT('calendar_sync', 'Pulled calendar events', { count: events.length });
    
    setState(prev => ({
      ...prev,
      recentEvents: events,
      lastSyncTimestamp: new Date().toISOString()
    }));

    return events;
  }, [state.hasConsent, state.connectedSources, logToZSMT]);

  // Extract social commitments from data
  const extractSocialCommitments = useCallback(async (): Promise<SocialCommitment[]> => {
    if (!state.hasConsent) return [];

    // Would use AI to extract commitments from calendar/chat data
    // Placeholder for now
    const commitments: SocialCommitment[] = [];

    setState(prev => ({
      ...prev,
      socialCommitments: commitments
    }));

    await logToZSMT('commitments_extracted', 'Extracted social commitments', { count: commitments.length });

    return commitments;
  }, [state.hasConsent, logToZSMT]);

  // Get social role projection based on commitments
  const getSocialRoleProjection = useCallback((): string => {
    const { socialCommitments } = state;
    
    if (socialCommitments.length === 0) {
      return 'Adaptive supportive companion';
    }

    const highPriority = socialCommitments.filter(c => c.priority === 'high').length;
    const hasUpcoming = socialCommitments.some(c => c.dueDate && new Date(c.dueDate) <= new Date(Date.now() + 24 * 60 * 60 * 1000));

    if (hasUpcoming && highPriority > 0) {
      return 'Proactive reminder and preparation assistant';
    }
    if (highPriority > 2) {
      return 'Stress-aware supportive guide';
    }
    return 'Balanced companion with social awareness';
  }, [state.socialCommitments]);

  return {
    // State
    isActive: state.isActive,
    hasConsent: state.hasConsent,
    connectedSources: state.connectedSources,
    recentEvents: state.recentEvents,
    socialCommitments: state.socialCommitments,
    lastSyncTimestamp: state.lastSyncTimestamp,

    // Actions
    requestConsent,
    grantConsent,
    revokeConsent,
    connectSource,
    disconnectSource,
    pullCalendarEvents,
    extractSocialCommitments,
    getSocialRoleProjection
  };
};

// Helper function
function getSourceName(type: ExternalDataSource['type']): string {
  const names: Record<ExternalDataSource['type'], string> = {
    calendar: 'Calendar',
    chat_logs: 'Chat History',
    email_summary: 'Email Summary',
    social_commitments: 'Social Commitments'
  };
  return names[type] || type;
}

export default useExternalOntologyAdapter;
