// ═══════════════════════════════════════════════════════════════════════════════
// AGENT INTERACTIONS — unified, RLS-isolated context store for all 28+ agents
// One table indexed by (user_id, agent_id) instead of 28 tables. Every read and
// write goes through the enterprise data-access layer so the owner-scope RLS
// assumption is asserted client-side before the request leaves the browser.
// ═══════════════════════════════════════════════════════════════════════════════

import {
  selectRows,
  selectOne,
  insertRow,
  updateRows,
  deleteRows,
  currentUserId,
  type Result,
} from '@/lib/data/dataAccess';

export const AGENT_INTERACTIONS_TABLE = 'agent_interactions';

export interface AgentInteraction {
  id: string;
  user_id: string;
  agent_id: string;
  context_payload: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

const ctx = { table: AGENT_INTERACTIONS_TABLE, scope: 'owner' as const, ownerColumn: 'user_id' };

/** Latest context rows for a single agent section (RLS filters to the owner). */
export const fetchAgentContext = (agentId: string, limit = 20) =>
  selectRows<AgentInteraction>(ctx, (q) =>
    q.select('*').eq('agent_id', agentId).order('created_at', { ascending: false }).limit(limit),
  );

/** Most recent single context payload for an agent. */
export const fetchLatestAgentContext = (agentId: string) =>
  selectOne<AgentInteraction>(ctx, (q) =>
    q.select('*').eq('agent_id', agentId).order('created_at', { ascending: false }).limit(1),
  );

/** Append a new context snapshot for an agent. */
export async function recordAgentContext(
  agentId: string,
  payload: Record<string, unknown>,
): Promise<Result<AgentInteraction>> {
  const userId = await currentUserId();
  return insertRow<Record<string, unknown>>(ctx, {
    user_id: userId ?? undefined,
    agent_id: agentId,
    context_payload: payload,
  }) as Promise<Result<AgentInteraction>>;
}

/** Patch the payload of an existing row. */
export const updateAgentContext = (rowId: string, payload: Record<string, unknown>) =>
  updateRows(ctx, { context_payload: payload, updated_at: new Date().toISOString() }, (q) =>
    q.eq('id', rowId),
  );

/** Forget one agent's stored context (user-initiated data control). */
export const clearAgentContext = (agentId: string) =>
  deleteRows(ctx, (q) => q.eq('agent_id', agentId));
