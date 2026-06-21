// ═══════════════════════════════════════════════════════════════════════════════
// EMP PROTOCOL - Emergency Magnetic Pulse Lockdown System
// ═══════════════════════════════════════════════════════════════════════════════
// 
// TRIGGER CONDITIONS:
// 1. Constitutional Kernel violation with severity CRITICAL
// 2. Detected prompt injection attempt
// 3. Detected data exfiltration attempt
// 4. Detected zero-click attack (invisible text)
// 5. Manual trigger by Root Admin
// 
// EFFECTS:
// 1. Freeze all external API calls
// 2. Block all data exports
// 3. Activate read-only mode for DHF
// 4. Alert Root Admins
// 5. Log incident for forensic analysis
// ═══════════════════════════════════════════════════════════════════════════════

import { supabase } from '@/integrations/supabase/client';
import { 
  getConstitutionalKernel, 
  type ConstitutionalViolation 
} from './ImmutableConstitutionalKernel';

/**
 * EMP Protocol Trigger Reason
 */
export type EMPTriggerReason = 
  | 'constitutional_violation'
  | 'prompt_injection'
  | 'data_exfiltration'
  | 'zero_click_attack'
  | 'shadow_ai_detected'
  | 'integrity_failure'
  | 'manual_admin_trigger';

/**
 * EMP Protocol State
 */
export interface EMPState {
  isActive: boolean;
  triggeredAt: string | null;
  triggeredBy: EMPTriggerReason | null;
  triggerDetails: string | null;
  violations: ConstitutionalViolation[];
  affectedServices: string[];
  autoReleaseAt: string | null;
  releasedAt: string | null;
  releasedBy: string | null;
  lockdownId: string | null;
}

/**
 * EMP Protocol Configuration
 */
const EMP_CONFIG = Object.freeze({
  // Auto-release after 1 hour (for non-critical triggers)
  AUTO_RELEASE_MINUTES: 60,
  
  // Services to freeze during EMP
  AFFECTED_SERVICES: Object.freeze([
    'external_api_calls',
    'data_export',
    'edge_function_writes',
    'external_webhooks',
    'file_uploads',
    'third_party_integrations',
  ]),
  
  // Root admin usernames who can release EMP
  ROOT_ADMINS: Object.freeze(['moksh50', 'Justmkbhd']),
  
  // Severity levels that trigger auto-EMP
  AUTO_TRIGGER_SEVERITIES: Object.freeze(['CRITICAL']),
});

/**
 * EMP Protocol Handler
 * 
 * Emergency lockdown system that activates when constitutional
 * violations are detected. This is the "nuclear option" for security.
 */
export class EMPProtocol {
  private static instance: EMPProtocol;
  private state: EMPState;
  private kernel = getConstitutionalKernel();
  private listeners: ((state: EMPState) => void)[] = [];

  private constructor() {
    this.state = {
      isActive: false,
      triggeredAt: null,
      triggeredBy: null,
      triggerDetails: null,
      violations: [],
      affectedServices: [],
      autoReleaseAt: null,
      releasedAt: null,
      releasedBy: null,
      lockdownId: null,
    };

    // Listen for kernel violations
    this.kernel.onViolation((violation) => {
      if (EMP_CONFIG.AUTO_TRIGGER_SEVERITIES.includes(violation.severity)) {
        this.trigger('constitutional_violation', violation);
      }
    });

    // Listen for EMP trigger events from window
    if (typeof window !== 'undefined') {
      window.addEventListener('zoe-emp-protocol', (event: Event) => {
        const customEvent = event as CustomEvent<{ reason: string; timestamp: string }>;
        this.trigger('constitutional_violation', customEvent.detail);
      });
    }

    console.log('[EMP PROTOCOL] ⚡ System ARMED and ready');
  }

  static getInstance(): EMPProtocol {
    if (!EMPProtocol.instance) {
      EMPProtocol.instance = new EMPProtocol();
    }
    return EMPProtocol.instance;
  }

  /**
   * TRIGGER EMP PROTOCOL
   * This is the main function that activates the lockdown
   */
  async trigger(
    reason: EMPTriggerReason,
    details: ConstitutionalViolation | { reason: string; timestamp: string } | string
  ): Promise<{ success: boolean; lockdownId?: string; error?: string }> {
    if (this.state.isActive) {
      console.warn('[EMP PROTOCOL] Already active, ignoring duplicate trigger');
      return { success: true, lockdownId: this.state.lockdownId || undefined };
    }

    const now = new Date();
    const autoReleaseAt = new Date(now.getTime() + EMP_CONFIG.AUTO_RELEASE_MINUTES * 60 * 1000);

    // Format details for logging
    const detailsString = typeof details === 'string' 
      ? details 
      : JSON.stringify(details, null, 2);

    console.error('[EMP PROTOCOL] 🚨🚨🚨 EMERGENCY LOCKDOWN TRIGGERED 🚨🚨🚨');
    console.error('[EMP PROTOCOL] Reason:', reason);
    console.error('[EMP PROTOCOL] Details:', detailsString);

    try {
      // Record lockdown in database
      const { data: lockdown, error } = await supabase
        .from('dhf_lockdown_events')
        .insert({
          lockdown_type: 'emp_protocol',
          reason: `${reason}: ${detailsString.substring(0, 500)}`,
          initiated_by: 'system_constitutional_kernel',
          affected_services: [...EMP_CONFIG.AFFECTED_SERVICES],
          is_active: true,
          auto_release_at: autoReleaseAt.toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('[EMP PROTOCOL] Database error:', error);
        // Continue with local lockdown even if DB fails
      }

      // Update local state
      this.state = {
        isActive: true,
        triggeredAt: now.toISOString(),
        triggeredBy: reason,
        triggerDetails: detailsString,
        violations: 'ruleId' in (details as any) ? [details as ConstitutionalViolation] : [],
        affectedServices: [...EMP_CONFIG.AFFECTED_SERVICES],
        autoReleaseAt: autoReleaseAt.toISOString(),
        releasedAt: null,
        releasedBy: null,
        lockdownId: lockdown?.id || `local_${now.getTime()}`,
      };

      // Notify listeners
      this.notifyListeners();

      // Emit window event for UI components
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('zoe-emp-active', {
          detail: this.state,
        }));
      }

      // Start auto-release timer
      this.scheduleAutoRelease(autoReleaseAt);

      return { success: true, lockdownId: this.state.lockdownId || undefined };
    } catch (err) {
      console.error('[EMP PROTOCOL] Trigger failed:', err);
      return { success: false, error: String(err) };
    }
  }

  /**
   * RELEASE EMP PROTOCOL
   * Only Root Admins can manually release
   */
  async release(
    releasedBy: string,
    reason: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.state.isActive) {
      return { success: false, error: 'EMP Protocol is not active' };
    }

    // Verify admin status
    if (!EMP_CONFIG.ROOT_ADMINS.includes(releasedBy.toLowerCase())) {
      console.warn('[EMP PROTOCOL] Unauthorized release attempt by:', releasedBy);
      return { success: false, error: 'Unauthorized: Only Root Admins can release EMP' };
    }

    const now = new Date();

    console.log('[EMP PROTOCOL] 🟢 LOCKDOWN RELEASED by:', releasedBy);
    console.log('[EMP PROTOCOL] Reason:', reason);

    try {
      // Update database
      if (this.state.lockdownId && !this.state.lockdownId.startsWith('local_')) {
        await supabase
          .from('dhf_lockdown_events')
          .update({
            is_active: false,
            released_at: now.toISOString(),
            released_by: releasedBy,
            release_reason: reason,
          })
          .eq('id', this.state.lockdownId);
      }

      // Update local state
      this.state = {
        ...this.state,
        isActive: false,
        releasedAt: now.toISOString(),
        releasedBy,
      };

      // Notify listeners
      this.notifyListeners();

      // Emit window event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('zoe-emp-released', {
          detail: this.state,
        }));
      }

      return { success: true };
    } catch (err) {
      console.error('[EMP PROTOCOL] Release failed:', err);
      return { success: false, error: String(err) };
    }
  }

  /**
   * Schedule auto-release
   */
  private scheduleAutoRelease(releaseAt: Date): void {
    const delay = releaseAt.getTime() - Date.now();
    
    if (delay > 0) {
      setTimeout(() => {
        if (this.state.isActive && this.state.autoReleaseAt) {
          const autoReleaseTime = new Date(this.state.autoReleaseAt);
          if (Date.now() >= autoReleaseTime.getTime()) {
            console.log('[EMP PROTOCOL] Auto-releasing after timeout');
            this.release('SYSTEM_AUTO_RELEASE', 'Automatic release after timeout period');
          }
        }
      }, delay);
    }
  }

  /**
   * Check if a service is blocked
   */
  isServiceBlocked(serviceName: string): boolean {
    if (!this.state.isActive) return false;
    return this.state.affectedServices.includes(serviceName);
  }

  /**
   * Get current state
   */
  getState(): Readonly<EMPState> {
    return { ...this.state };
  }

  /**
   * Register state change listener
   */
  onStateChange(listener: (state: EMPState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(): void {
    const stateCopy = { ...this.state };
    this.listeners.forEach(listener => listener(stateCopy));
  }

  /**
   * Check if API call should be blocked
   */
  shouldBlockExternalCall(url: string): boolean {
    if (!this.state.isActive) return false;

    // Always allow calls to Supabase (our own backend)
    if (url.includes('supabase.co') || url.includes('supabase.in')) {
      return false;
    }

    // Block all other external calls during EMP
    return true;
  }

  /**
   * Create a safe fetch wrapper that respects EMP
   */
  createSafeFetch(): typeof fetch {
    const emp = this;

    return async function safeFetch(
      input: RequestInfo | URL,
      init?: RequestInit
    ): Promise<Response> {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

      if (emp.shouldBlockExternalCall(url)) {
        console.warn('[EMP PROTOCOL] Blocked external call to:', url);
        throw new Error(`EMP Protocol Active: External calls to ${new URL(url).hostname} are blocked`);
      }

      return fetch(input, init);
    };
  }
}

// Export singleton accessor
export const getEMPProtocol = () => EMPProtocol.getInstance();

/**
 * React hook for EMP state
 */
export function useEMPProtocol(): EMPState {
  const [state, setState] = React.useState<EMPState>(getEMPProtocol().getState());

  React.useEffect(() => {
    const unsubscribe = getEMPProtocol().onStateChange(setState);
    return unsubscribe;
  }, []);

  return state;
}

// Import React for the hook
import React from 'react';

/**
 * Type guard for EMP trigger reason
 */
export function isEMPTriggerReason(value: unknown): value is EMPTriggerReason {
  return typeof value === 'string' && [
    'constitutional_violation',
    'prompt_injection',
    'data_exfiltration',
    'zero_click_attack',
    'shadow_ai_detected',
    'integrity_failure',
    'manual_admin_trigger',
  ].includes(value);
}
