// ═══════════════════════════════════════════════════════════════════════════════
// BLACK BOX LEDGER - Immutable Flight Recorder
// ═══════════════════════════════════════════════════════════════════════════════
// 
// The Final "Earth's Core" Requirement
// 
// Every Sovereign Entity needs an immutable history that nobody 
// (not even you or Zoe) can delete, just like an airplane's Black Box.
// 
// STORAGE: WORM (Write Once, Read Many)
// DATABASE RULE: DISABLES DELETE and UPDATE for everyone (including Admin)
// PURPOSE: Permanent, indestructible history of the civilization
// ═══════════════════════════════════════════════════════════════════════════════

import { supabase } from '@/integrations/supabase/client';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface BlackBoxEntry {
  event_id?: string;
  timestamp?: string;
  user_id?: string;
  event_type: string;
  event_category: BlackBoxCategory;
  encrypted_payload: Record<string, any>;
  genesis_signature: string;
  source_system: string;
  severity: BlackBoxSeverity;
  metadata?: Record<string, any>;
  integrity_hash: string;
}

export type BlackBoxCategory = 
  | 'security'
  | 'emp_trigger'
  | 'cognitive_collapse'
  | 'constitutional_violation'
  | 'dhf_operation'
  | 'god_mode_action'
  | 'quantum_shield'
  | 'validator_agent'
  | 'system_critical'
  | 'audit_trail';

export type BlackBoxSeverity = 'info' | 'warn' | 'critical' | 'emp';

export interface BlackBoxQuery {
  startTime?: Date;
  endTime?: Date;
  eventTypes?: string[];
  categories?: BlackBoxCategory[];
  severities?: BlackBoxSeverity[];
  limit?: number;
  userId?: string;
}

export interface BlackBoxStats {
  totalEntries: number;
  entriesLast24h: number;
  criticalEvents: number;
  empTriggers: number;
  oldestEntry: string | null;
  newestEntry: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const LEDGER_VERSION = '1.0.0';
const SOURCE_SYSTEMS = Object.freeze({
  ZOE_CORE: 'zoe_core',
  SECURITY_SHELL: 'security_shell',
  EMP_PROTOCOL: 'emp_protocol',
  VALIDATOR_AGENT: 'validator_agent',
  QUANTUM_SHIELD: 'quantum_shield',
  COGNITIVE_COLLAPSE: 'cognitive_collapse',
  CONSTITUTIONAL_KERNEL: 'constitutional_kernel',
  DHF_STACK: 'dhf_stack',
  GOD_MODE: 'god_mode',
});

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate genesis signature for entry authenticity
 */
function generateGenesisSignature(
  eventType: string,
  category: string,
  timestamp: string,
  sourceSystem: string
): string {
  // Create a deterministic signature from entry metadata
  const signatureData = `${eventType}|${category}|${timestamp}|${sourceSystem}|${LEDGER_VERSION}`;
  
  // Simple hash (in production, use crypto.subtle)
  let hash = 0;
  for (let i = 0; i < signatureData.length; i++) {
    const char = signatureData.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  return `GEN_${Math.abs(hash).toString(16).toUpperCase()}_${Date.now().toString(36).toUpperCase()}`;
}

/**
 * Generate integrity hash for payload verification
 */
function generateIntegrityHash(payload: Record<string, any>): string {
  const payloadString = JSON.stringify(payload);
  
  let hash = 0;
  for (let i = 0; i < payloadString.length; i++) {
    const char = payloadString.charCodeAt(i);
    hash = ((hash << 7) - hash) + char;
    hash = hash & hash;
  }
  
  return `INT_${Math.abs(hash).toString(16).toUpperCase()}`;
}

/**
 * Mask sensitive data in payload for storage
 */
function maskSensitiveData(payload: Record<string, any>): Record<string, any> {
  const sensitiveKeys = ['password', 'token', 'secret', 'key', 'credential', 'biometric'];
  const masked: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(payload)) {
    const isKeyySensitive = sensitiveKeys.some(sk => key.toLowerCase().includes(sk));
    
    if (isKeyySensitive && typeof value === 'string') {
      masked[key] = '****' + value.slice(-4);
    } else if (typeof value === 'object' && value !== null) {
      masked[key] = maskSensitiveData(value);
    } else {
      masked[key] = value;
    }
  }
  
  return masked;
}

// ═══════════════════════════════════════════════════════════════════════════════
// BLACK BOX LEDGER CLASS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * BlackBoxLedger - Immutable Flight Recorder
 * 
 * WORM Storage: Write Once, Read Many
 * Database-level triggers prevent any modification or deletion.
 */
export class BlackBoxLedger {
  private static instance: BlackBoxLedger;
  private localBuffer: BlackBoxEntry[] = [];
  private isOnline: boolean = true;

  private constructor() {
    // Monitor online status
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline = true;
        this.flushBuffer();
      });
      window.addEventListener('offline', () => {
        this.isOnline = false;
      });
    }

    console.log('[BLACK BOX LEDGER] 📦 Flight Recorder INITIALIZED');
    console.log('[BLACK BOX LEDGER] WORM Storage Active - No Modifications Allowed');
  }

  static getInstance(): BlackBoxLedger {
    if (!BlackBoxLedger.instance) {
      BlackBoxLedger.instance = new BlackBoxLedger();
    }
    return BlackBoxLedger.instance;
  }

  // ═══════════════════════════════════════════════════════════════
  // WRITE OPERATIONS (Append-Only)
  // ═══════════════════════════════════════════════════════════════

  /**
   * Record an event to the Black Box (WRITE ONCE)
   */
  async recordEvent(
    eventType: string,
    category: BlackBoxCategory,
    payload: Record<string, any>,
    options: {
      severity?: BlackBoxSeverity;
      sourceSystem?: string;
      userId?: string;
      metadata?: Record<string, any>;
    } = {}
  ): Promise<{ success: boolean; entryId?: string; error?: string }> {
    const timestamp = new Date().toISOString();
    const sourceSystem = options.sourceSystem || SOURCE_SYSTEMS.ZOE_CORE;
    const severity = options.severity || 'info';

    // Mask sensitive data before storage
    const maskedPayload = maskSensitiveData(payload);

    // Generate signatures
    const genesisSignature = generateGenesisSignature(eventType, category, timestamp, sourceSystem);
    const integrityHash = generateIntegrityHash(maskedPayload);

    // Ledger rows are owner-scoped: attribute the event to the signed-in user
    // so the insert (and its returning row) stays readable under RLS.
    let ownerId = options.userId;
    if (!ownerId) {
      try {
        const { data: authData } = await supabase.auth.getUser();
        ownerId = authData?.user?.id;
      } catch {
        ownerId = undefined;
      }
    }

    const entry: BlackBoxEntry = {
      event_type: eventType,
      event_category: category,
      encrypted_payload: maskedPayload,
      genesis_signature: genesisSignature,
      source_system: sourceSystem,
      severity,
      metadata: {
        ...options.metadata,
        ledger_version: LEDGER_VERSION,
        recorded_at: timestamp,
      },
      integrity_hash: integrityHash,
      user_id: ownerId,
    };


    // If offline, buffer locally
    if (!this.isOnline) {
      this.localBuffer.push(entry);
      console.log('[BLACK BOX LEDGER] Buffered entry (offline):', eventType);
      return { success: true, entryId: 'buffered_' + Date.now() };
    }

    // Signed-out boot events can't own a ledger row — buffer them instead of
    // firing a write the WORM policy will reject.
    if (!ownerId) {
      this.localBuffer.push(entry);
      return { success: true, entryId: 'buffered_' + Date.now() };
    }

    try {
      // Insert without a returning read: the ledger is write-once and the
      // returning row would need a second permission check.
      const { error } = await supabase
        .from('zoe_black_box_ledger')
        .insert(entry);

      if (error) {
        // Buffer on error
        this.localBuffer.push(entry);
        console.error('[BLACK BOX LEDGER] Insert error, buffered:', error);
        return { success: false, error: error.message };
      }

      return { success: true, entryId: genesisSignature };
    } catch (err) {
      this.localBuffer.push(entry);
      console.error('[BLACK BOX LEDGER] Exception:', err);
      return { success: false, error: String(err) };
    }

  }

  /**
   * Record a security event
   */
  async recordSecurityEvent(
    eventType: string,
    payload: Record<string, any>,
    severity: BlackBoxSeverity = 'warn',
    userId?: string
  ): Promise<{ success: boolean; entryId?: string }> {
    return this.recordEvent(eventType, 'security', payload, {
      severity,
      sourceSystem: SOURCE_SYSTEMS.SECURITY_SHELL,
      userId,
    });
  }

  /**
   * Record an EMP trigger event
   */
  async recordEMPTrigger(
    triggerReason: string,
    details: Record<string, any>,
    userId?: string
  ): Promise<{ success: boolean; entryId?: string }> {
    return this.recordEvent('EMP_TRIGGERED', 'emp_trigger', {
      reason: triggerReason,
      ...details,
    }, {
      severity: 'emp',
      sourceSystem: SOURCE_SYSTEMS.EMP_PROTOCOL,
      userId,
    });
  }

  /**
   * Record a cognitive collapse event
   */
  async recordCognitiveCollapse(
    dissonanceScore: number,
    threats: string[],
    userId?: string
  ): Promise<{ success: boolean; entryId?: string }> {
    return this.recordEvent('COGNITIVE_COLLAPSE', 'cognitive_collapse', {
      dissonance_score: dissonanceScore,
      threats_detected: threats.length,
      threat_types: threats,
    }, {
      severity: 'critical',
      sourceSystem: SOURCE_SYSTEMS.COGNITIVE_COLLAPSE,
      userId,
    });
  }

  /**
   * Record a constitutional violation
   */
  async recordConstitutionalViolation(
    ruleId: string,
    violation: Record<string, any>,
    userId?: string
  ): Promise<{ success: boolean; entryId?: string }> {
    return this.recordEvent('CONSTITUTIONAL_VIOLATION', 'constitutional_violation', {
      rule_id: ruleId,
      ...violation,
    }, {
      severity: 'critical',
      sourceSystem: SOURCE_SYSTEMS.CONSTITUTIONAL_KERNEL,
      userId,
    });
  }

  /**
   * Record a God Mode action
   */
  async recordGodModeAction(
    action: string,
    details: Record<string, any>,
    userId?: string
  ): Promise<{ success: boolean; entryId?: string }> {
    return this.recordEvent('GOD_MODE_ACTION', 'god_mode_action', {
      action,
      ...details,
    }, {
      severity: 'info',
      sourceSystem: SOURCE_SYSTEMS.GOD_MODE,
      userId,
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // READ OPERATIONS (Read Many)
  // ═══════════════════════════════════════════════════════════════

  /**
   * Query the Black Box ledger
   */
  async queryLedger(query: BlackBoxQuery = {}): Promise<{
    entries: BlackBoxEntry[];
    error?: string;
  }> {
    try {
      let queryBuilder = supabase
        .from('zoe_black_box_ledger')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(query.limit || 100);

      if (query.userId) {
        queryBuilder = queryBuilder.eq('user_id', query.userId);
      }

      if (query.eventTypes && query.eventTypes.length > 0) {
        queryBuilder = queryBuilder.in('event_type', query.eventTypes);
      }

      if (query.categories && query.categories.length > 0) {
        queryBuilder = queryBuilder.in('event_category', query.categories);
      }

      if (query.severities && query.severities.length > 0) {
        queryBuilder = queryBuilder.in('severity', query.severities);
      }

      if (query.startTime) {
        queryBuilder = queryBuilder.gte('timestamp', query.startTime.toISOString());
      }

      if (query.endTime) {
        queryBuilder = queryBuilder.lte('timestamp', query.endTime.toISOString());
      }

      const { data, error } = await queryBuilder;

      if (error) {
        return { entries: [], error: error.message };
      }

      return { entries: (data || []) as unknown as BlackBoxEntry[] };
    } catch (err) {
      return { entries: [], error: String(err) };
    }
  }

  /**
   * Get statistics from the Black Box
   */
  async getStats(userId?: string): Promise<BlackBoxStats> {
    try {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Ledger rows are RLS-scoped to their owner; always query within the
      // caller's own scope so unscoped reads don't get rejected.
      if (!userId) {
        const { data: authData } = await supabase.auth.getUser();
        userId = authData?.user?.id;
      }
      if (!userId) {
        return {
          totalEntries: 0,
          entriesLast24h: 0,
          criticalEvents: 0,
          empTriggers: 0,
          oldestEntry: null,
          newestEntry: null,
        };
      }

      // Total entries
      let totalQuery = supabase.from('zoe_black_box_ledger').select('event_id', { count: 'exact' });
      if (userId) totalQuery = totalQuery.eq('user_id', userId);
      const { count: totalEntries } = await totalQuery;


      // Last 24h
      let recentQuery = supabase.from('zoe_black_box_ledger')
        .select('event_id', { count: 'exact' })
        .gte('timestamp', yesterday.toISOString());
      if (userId) recentQuery = recentQuery.eq('user_id', userId);
      const { count: entriesLast24h } = await recentQuery;

      // Critical events
      let criticalQuery = supabase.from('zoe_black_box_ledger')
        .select('event_id', { count: 'exact' })
        .eq('severity', 'critical');
      if (userId) criticalQuery = criticalQuery.eq('user_id', userId);
      const { count: criticalEvents } = await criticalQuery;

      // EMP triggers
      let empQuery = supabase.from('zoe_black_box_ledger')
        .select('event_id', { count: 'exact' })
        .eq('severity', 'emp');
      if (userId) empQuery = empQuery.eq('user_id', userId);
      const { count: empTriggers } = await empQuery;

      // Oldest entry
      let oldestQuery = supabase.from('zoe_black_box_ledger')
        .select('timestamp')
        .order('timestamp', { ascending: true })
        .limit(1);
      if (userId) oldestQuery = oldestQuery.eq('user_id', userId);
      const { data: oldestData } = await oldestQuery;

      // Newest entry
      let newestQuery = supabase.from('zoe_black_box_ledger')
        .select('timestamp')
        .order('timestamp', { ascending: false })
        .limit(1);
      if (userId) newestQuery = newestQuery.eq('user_id', userId);
      const { data: newestData } = await newestQuery;

      return {
        totalEntries: totalEntries || 0,
        entriesLast24h: entriesLast24h || 0,
        criticalEvents: criticalEvents || 0,
        empTriggers: empTriggers || 0,
        oldestEntry: oldestData?.[0]?.timestamp || null,
        newestEntry: newestData?.[0]?.timestamp || null,
      };
    } catch (err) {
      console.error('[BLACK BOX LEDGER] Stats error:', err);
      return {
        totalEntries: 0,
        entriesLast24h: 0,
        criticalEvents: 0,
        empTriggers: 0,
        oldestEntry: null,
        newestEntry: null,
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // BUFFER MANAGEMENT
  // ═══════════════════════════════════════════════════════════════

  /**
   * Flush buffered entries to database
   */
  private async flushBuffer(): Promise<void> {
    if (this.localBuffer.length === 0) return;

    console.log('[BLACK BOX LEDGER] Flushing', this.localBuffer.length, 'buffered entries');

    const toFlush = [...this.localBuffer];
    this.localBuffer = [];

    let ownerId: string | undefined;
    try {
      const { data: authData } = await supabase.auth.getUser();
      ownerId = authData?.user?.id;
    } catch {
      ownerId = undefined;
    }

    for (const entry of toFlush) {
      if (!entry.user_id && !ownerId) {
        this.localBuffer.push(entry);
        continue;
      }
      try {
        await supabase
          .from('zoe_black_box_ledger')
          .insert({ ...entry, user_id: entry.user_id || ownerId });
      } catch (err) {
        // Re-buffer on failure
        this.localBuffer.push(entry);
      }
    }
  }


  /**
   * Get count of buffered entries
   */
  getBufferedCount(): number {
    return this.localBuffer.length;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLETON ACCESSOR & EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export function getBlackBoxLedger(): BlackBoxLedger {
  return BlackBoxLedger.getInstance();
}

// Convenience functions
export async function recordToBlackBox(
  eventType: string,
  category: BlackBoxCategory,
  payload: Record<string, any>,
  options?: {
    severity?: BlackBoxSeverity;
    sourceSystem?: string;
    userId?: string;
  }
): Promise<{ success: boolean; entryId?: string }> {
  return getBlackBoxLedger().recordEvent(eventType, category, payload, options);
}

export async function recordSecurityToBlackBox(
  eventType: string,
  payload: Record<string, any>,
  severity: BlackBoxSeverity = 'warn',
  userId?: string
): Promise<{ success: boolean; entryId?: string }> {
  return getBlackBoxLedger().recordSecurityEvent(eventType, payload, severity, userId);
}

// React hook for Black Box access
export function useBlackBoxLedger() {
  const ledger = getBlackBoxLedger();

  return {
    recordEvent: ledger.recordEvent.bind(ledger),
    recordSecurityEvent: ledger.recordSecurityEvent.bind(ledger),
    recordEMPTrigger: ledger.recordEMPTrigger.bind(ledger),
    recordCognitiveCollapse: ledger.recordCognitiveCollapse.bind(ledger),
    recordConstitutionalViolation: ledger.recordConstitutionalViolation.bind(ledger),
    recordGodModeAction: ledger.recordGodModeAction.bind(ledger),
    queryLedger: ledger.queryLedger.bind(ledger),
    getStats: ledger.getStats.bind(ledger),
    getBufferedCount: ledger.getBufferedCount.bind(ledger),
  };
}
