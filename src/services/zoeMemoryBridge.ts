/**
 * Zoe persistent-memory bridge (mmora / Zoe / DHF).
 *
 * Two independent stores, used together:
 *   1. Sovereign memory  — `zoe_sovereign_memory` in Lovable Cloud (always-on).
 *   2. TencentDB Agent Memory gateway — optional local MemoryCore container.
 *
 * Every write goes to sovereign memory first (it is the source of truth) and
 * is mirrored to the gateway when it is online. Reads prefer the gateway's
 * cross-tier `/recall`, and fall back to sovereign rows so Zoe never loses
 * context when the container is down.
 */

import { supabase } from '@/integrations/supabase/client';
import {
  MemoryService,
  normaliseAtoms,
  extractPersonaText,
  getGatewayUrl,
} from '@/services/memoryService';
import { retryWithBackoff, TRANSIENT_GATEWAY_KINDS } from '@/utils/backoff';
import { logMemoryAudit } from '@/services/zoeMemoryAudit';

export const ZOE_MEMORY_EVENT = 'zoe_orb_round';

export type GatewayFailureKind =
  | 'cors'
  | 'unauthorized'
  | 'unreachable'
  | 'timeout'
  | 'gateway';

export interface StoreStatus {
  connected: boolean;
  /** Human-readable last error, null when healthy. */
  error: string | null;
}

export interface GatewayStatus extends StoreStatus {
  kind: 'online' | GatewayFailureKind;
  url: string;
  origin: string;
  /** Short human summary of the last probe. */
  summary?: string;
  /** Precise browser/CORS/preflight failure reason. */
  detail?: string;
  requiredHeaders?: string[];
  requestUrl?: string;
  healthOk?: boolean;
  authOk?: boolean;
  attempts?: number;
}

export interface ZoeMemoryStatus {
  sovereign: StoreStatus & { rows: number };
  gateway: GatewayStatus;
  checkedAt: string;
}


export interface RememberInput {
  userId?: string | null;
  sessionKey: string;
  userText: string;
  assistantText: string;
}

export interface RememberResult {
  sovereignSaved: boolean;
  gatewaySaved: boolean;
  gatewayKind?: GatewayStatus['kind'];
  error?: string;
}

/** Write one completed round to both stores. */
export async function rememberZoeRound(
  input: RememberInput
): Promise<RememberResult> {
  const result: RememberResult = { sovereignSaved: false, gatewaySaved: false };

  if (input.userId) {
    try {
      const { error } = await supabase.from('zoe_sovereign_memory').insert({
        user_id: input.userId,
        event_type: ZOE_MEMORY_EVENT,
        session_id: input.sessionKey,
        content_text: `User: ${input.userText}\nZoe: ${input.assistantText}`,
        zoe_state_json: {
          user_text: input.userText,
          assistant_text: input.assistantText,
          source: 'zoe-orb',
        },
      });
      if (error) result.error = error.message;
      else result.sovereignSaved = true;
    } catch (err) {
      result.error = err instanceof Error ? err.message : String(err);
    }
  }

  const { result: capture, attempts } = await retryWithBackoff(
    () =>
      MemoryService.captureRound(
        input.sessionKey,
        input.userText,
        input.assistantText,
        input.userId ?? undefined
      ),
    {
      attempts: 3,
      shouldRetry: (r) =>
        !r.success && TRANSIENT_GATEWAY_KINDS.has(r.failureKind ?? 'unreachable'),
    }
  );
  result.gatewaySaved = capture.success;
  if (!capture.success) {
    result.gatewayKind = capture.failureKind ?? 'unreachable';
    if (!result.error) result.error = capture.error;
  }

  logMemoryAudit({
    action: 'save',
    outcome: result.sovereignSaved || result.gatewaySaved ? 'ok' : 'error',
    target: result.sovereignSaved && result.gatewaySaved
      ? 'both'
      : result.gatewaySaved
        ? 'gateway'
        : result.sovereignSaved
          ? 'sovereign'
          : 'none',
    attempts,
    detail: result.gatewaySaved
      ? undefined
      : `gateway write-back failed (${result.gatewayKind}): ${result.error ?? 'unknown'}`,
  });

  return result;
}


/** Pull grounding context: gateway recall/search first, sovereign rows as fallback. */
export async function recallZoeMemory(opts: {
  query: string;
  sessionKey: string;
  userId?: string | null;
  limit?: number;
}): Promise<{ context: string; source: 'gateway' | 'sovereign' | 'none' }> {
  const limit = opts.limit ?? 5;
  let fallbackReason = 'gateway returned no context';
  let recallAttempts = 1;

  try {
    const { result: recalled, attempts } = await retryWithBackoff(
      () =>
        MemoryService.recall(
          opts.query,
          opts.sessionKey,
          opts.userId ?? undefined
        ),
      {
        attempts: 3,
        shouldRetry: (r) =>
          !r.success && TRANSIENT_GATEWAY_KINDS.has(r.failureKind ?? 'unreachable'),
      }
    );
    recallAttempts = attempts;
    if (!recalled.success) {
      fallbackReason = `gateway recall failed (${recalled.failureKind ?? 'unreachable'}): ${recalled.error ?? 'unknown'}`;
    }
    const direct = recalled.success ? recalled.data?.context?.trim() : '';
    if (direct) {
      logMemoryAudit({
        action: 'recall',
        outcome: 'ok',
        target: 'gateway',
        attempts,
      });
      return { context: direct, source: 'gateway' };
    }

    if (recalled.success) {
      const [facts, persona] = await Promise.all([
        MemoryService.searchMemories(opts.query, limit),
        MemoryService.getPersona(),
      ]);
      const parts: string[] = [];
      if (persona.success) {
        const text = extractPersonaText(persona.data ?? null);
        if (text) parts.push(`Known persona: ${text}`);
      }
      if (facts.success) {
        const atoms = normaliseAtoms(facts.data).slice(0, limit);
        if (atoms.length) {
          parts.push(
            `Relevant remembered facts:\n${atoms.map((a) => `- ${a.content}`).join('\n')}`
          );
        }
      }
      if (parts.length) {
        logMemoryAudit({
          action: 'recall',
          outcome: 'ok',
          target: 'gateway',
          attempts,
        });
        return { context: parts.join('\n\n'), source: 'gateway' };
      }
    }
  } catch (err) {
    fallbackReason = err instanceof Error ? err.message : String(err);
  }

  if (opts.userId) {
    try {
      const { data } = await supabase
        .from('zoe_sovereign_memory')
        .select('content_text, created_at')
        .eq('user_id', opts.userId)
        .eq('event_type', ZOE_MEMORY_EVENT)
        .order('created_at', { ascending: false })
        .limit(limit);
      const rows = (data ?? []).filter((r) => r.content_text);
      if (rows.length) {
        logMemoryAudit({
          action: 'fallback',
          outcome: 'fallback',
          target: 'sovereign',
          attempts: recallAttempts,
          detail: fallbackReason,
        });
        return {
          context: `Earlier remembered exchanges:\n${rows
            .map((r) => `- ${r.content_text}`)
            .join('\n')}`,
          source: 'sovereign',
        };
      }
    } catch {
      /* ignore */
    }
  }

  logMemoryAudit({
    action: 'recall',
    outcome: 'error',
    target: 'none',
    attempts: recallAttempts,
    detail: fallbackReason,
  });
  return { context: '', source: 'none' };
}

export interface StoredZoeMemory {
  id: string;
  createdAt: string;
  text: string;
}

/** List stored sovereign memory rows for the memory controls UI. */
export async function listZoeMemories(
  userId?: string | null,
  limit = 25
): Promise<StoredZoeMemory[]> {
  if (!userId) return [];
  const { data, error } = await supabase
    .from('zoe_sovereign_memory')
    .select('id, content_text, created_at')
    .eq('user_id', userId)
    .eq('event_type', ZOE_MEMORY_EVENT)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []).map((r) => ({
    id: String(r.id),
    createdAt: r.created_at as string,
    text: (r.content_text as string) ?? '',
  }));
}

/** Delete one stored memory row. */
export async function deleteMemory(id: string): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.from('zoe_sovereign_memory').delete().eq('id', id);
  logMemoryAudit({
    action: 'save',
    outcome: error ? 'error' : 'ok',
    target: 'sovereign',
    detail: error ? `delete failed: ${error.message}` : `deleted memory ${id}`,
  });
  return { ok: !error, error: error?.message };
}

/** Delete every stored memory for this user. */
export async function clearAllMemory(
  userId?: string | null
): Promise<{ ok: boolean; error?: string }> {
  if (!userId) return { ok: false, error: 'Not signed in' };
  const { error } = await supabase
    .from('zoe_sovereign_memory')
    .delete()
    .eq('user_id', userId)
    .eq('event_type', ZOE_MEMORY_EVENT);
  logMemoryAudit({
    action: 'save',
    outcome: error ? 'error' : 'ok',
    target: 'sovereign',
    detail: error ? `clear all failed: ${error.message}` : 'cleared all stored memories',
  });
  return { ok: !error, error: error?.message };
}


/** Health of both stores, with the precise gateway failure reason. */
export async function getZoeMemoryStatus(
  userId?: string | null
): Promise<ZoeMemoryStatus> {
  const origin = typeof window === 'undefined' ? '' : window.location.origin;

  const sovereignPromise = (async () => {
    if (!userId) {
      return { connected: false, error: 'Not signed in', rows: 0 };
    }
    try {
      const { count, error } = await supabase
        .from('zoe_sovereign_memory')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId);
      if (error) return { connected: false, error: error.message, rows: 0 };
      return { connected: true, error: null, rows: count ?? 0 };
    } catch (err) {
      return {
        connected: false,
        error: err instanceof Error ? err.message : String(err),
        rows: 0,
      };
    }
  })();

  const gatewayPromise = (async (): Promise<GatewayStatus> => {
    const { result: diag, attempts } = await retryWithBackoff(
      () => MemoryService.diagnose(),
      {
        attempts: 3,
        baseDelayMs: 500,
        // CORS / 401 are deterministic — only retry transient failures.
        shouldRetry: (d) => !d.ok && TRANSIENT_GATEWAY_KINDS.has(d.kind),
      }
    );
    const status: GatewayStatus = {
      connected: diag.ok,
      kind: diag.kind,
      url: getGatewayUrl(),
      origin: diag.origin || origin,
      summary: diag.summary,
      detail: diag.detail,
      requiredHeaders: diag.requiredHeaders,
      requestUrl: diag.requestUrl,
      healthOk: diag.healthOk,
      authOk: diag.authOk,
      attempts,
      error: diag.ok ? null : `${diag.summary} ${diag.detail}`.trim(),
    };
    logMemoryAudit({
      action: 'health',
      outcome: diag.ok ? 'ok' : 'error',
      target: 'gateway',
      attempts,
      detail: diag.ok ? undefined : `${diag.kind}: ${diag.summary}`,
    });
    return status;
  })();


  const [sovereign, gateway] = await Promise.all([
    sovereignPromise,
    gatewayPromise,
  ]);

  return { sovereign, gateway, checkedAt: new Date().toISOString() };
}
