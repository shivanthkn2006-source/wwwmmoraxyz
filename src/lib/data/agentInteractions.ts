// ═══════════════════════════════════════════════════════════════════════════════
// AGENT INTERACTIONS — unified, RLS-isolated context store for all 28+ agents
// One table indexed by (user_id, agent_id) instead of 28 tables. Every read and
// write goes through the enterprise data-access layer so the owner-scope RLS
// assumption is asserted client-side before the request leaves the browser.
//
// Outage behaviour: writes are mirrored into a local buffer and replayed by the
// durable write queue with exponential backoff, so a paused or timing-out
// backend degrades into "sync later" instead of data loss.
// ═══════════════════════════════════════════════════════════════════════════════

import {
  selectRows,
  selectOne,
  insertRow,
  updateRows,
  deleteRows,
  type QueryContext,
  type Result,
} from '@/lib/data/dataAccess';
import {
  bufferAgentContext,
  confirmBufferedWrite,
  dropBufferedWrite,
  mergeAgentContext,
  readBufferedAgentContext,
  clearBufferedAgent,
  type BufferedInteraction,
} from '@/lib/data/agentInteractionBuffer';
import {
  enqueueWrite,
  registerWriteExecutor,
  flushWriteQueue,
  pendingWriteCount,
  type QueuedWrite,
} from '@/lib/data/writeQueue';
import {
  isBackendUsable,
  isTransportFailure,
  recordBackendOutcome,
} from '@/lib/data/backendHealth';

export const AGENT_INTERACTIONS_TABLE = 'agent_interactions';

export interface AgentInteraction {
  id: string;
  user_id: string;
  agent_id: string;
  context_payload: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

const ctx: QueryContext = {
  table: AGENT_INTERACTIONS_TABLE,
  scope: 'owner',
  ownerColumn: 'user_id',
};

// ───────────────────────────── reads ─────────────────────────────

/** Latest context rows for a single agent section (RLS filters to the owner). */
export const fetchAgentContext = (agentId: string, limit = 20) =>
  selectRows<AgentInteraction>(ctx, {
    eq: { agent_id: agentId },
    order: { column: 'created_at', ascending: false },
    limit,
  });

/** Most recent single context payload for an agent. */
export const fetchLatestAgentContext = (agentId: string) =>
  selectOne<AgentInteraction>(ctx, {
    eq: { agent_id: agentId },
    order: { column: 'created_at', ascending: false },
  });

/**
 * Outage-tolerant read: server rows when reachable, merged with any unsynced
 * local rows; local-only when the backend is down. Never returns an error to
 * the UI — an outage should not blank an agent panel.
 */
export async function loadAgentContext(
  agentId: string,
  limit = 20,
): Promise<{ rows: BufferedInteraction[]; source: 'server' | 'buffer'; pending: number }> {
  const pending = pendingWriteCount(AGENT_INTERACTIONS_TABLE);

  if (!isBackendUsable()) {
    return { rows: readBufferedAgentContext(agentId, limit), source: 'buffer', pending };
  }

  const res = await fetchAgentContext(agentId, limit);
  if (res.error) {
    recordBackendOutcome({
      ok: false,
      code: res.error.code,
      message: res.error.message,
    });
    return { rows: readBufferedAgentContext(agentId, limit), source: 'buffer', pending };
  }
  recordBackendOutcome({ ok: true });
  return { rows: mergeAgentContext(agentId, res.data, limit), source: 'server', pending };
}

// ───────────────────────────── writes ─────────────────────────────

/** Append a new context snapshot for an agent (owner id stamped by the layer). */
export const recordAgentContext = (agentId: string, payload: Record<string, unknown>) =>
  insertRow(ctx, { agent_id: agentId, context_payload: payload }) as Promise<
    Result<Record<string, unknown>>
  >;

/** Patch the payload of an existing row, still constrained to the caller. */
export const updateAgentContext = (rowId: string, payload: Record<string, unknown>) =>
  updateRows<Record<string, unknown>>(
    ctx,
    { id: rowId },
    {
      context_payload: payload,
      updated_at: new Date().toISOString(),
    },
  );

/** Forget one agent's stored context (user-initiated data control). */
export const clearAgentContext = (agentId: string) => {
  clearBufferedAgent(agentId);
  return deleteRows(ctx, { agent_id: agentId });
};

export type SaveOutcome = 'synced' | 'queued';

/**
 * Durable append. Tries the backend first when it looks usable; on any
 * transport-shaped failure the snapshot is buffered locally and queued for
 * replay with exponential backoff.
 */
export async function saveAgentContext(
  agentId: string,
  payload: Record<string, unknown>,
): Promise<{ outcome: SaveOutcome; row: BufferedInteraction | null; error?: string }> {
  if (isBackendUsable()) {
    const res = await recordAgentContext(agentId, payload);
    if (!res.error) {
      recordBackendOutcome({ ok: true });
      const server = res.data as unknown as AgentInteraction;
      return {
        outcome: 'synced',
        row: { ...server, pending: false } as BufferedInteraction,
      };
    }
    recordBackendOutcome({ ok: false, code: res.error.code, message: res.error.message });
    // A policy/validation rejection can never succeed on retry — surface it.
    if (!isTransportFailure(res.error.code, res.error.message)) {
      return { outcome: 'queued', row: null, error: res.error.message };
    }
  }

  const queued = enqueueWrite({
    table: AGENT_INTERACTIONS_TABLE,
    op: 'insert',
    groupKey: agentId,
    payload: { agent_id: agentId, context_payload: payload },
  });
  const row = bufferAgentContext(agentId, payload, { pending: true, queueId: queued.id });
  return { outcome: 'queued', row };
}

/** Durable patch with the same queue-on-outage guarantee. */
export async function saveAgentContextPatch(
  rowId: string,
  agentId: string,
  payload: Record<string, unknown>,
): Promise<{ outcome: SaveOutcome; error?: string }> {
  if (isBackendUsable()) {
    const res = await updateAgentContext(rowId, payload);
    if (!res.error) {
      recordBackendOutcome({ ok: true });
      return { outcome: 'synced' };
    }
    recordBackendOutcome({ ok: false, code: res.error.code, message: res.error.message });
    if (!isTransportFailure(res.error.code, res.error.message)) {
      return { outcome: 'queued', error: res.error.message };
    }
  }

  enqueueWrite({
    table: AGENT_INTERACTIONS_TABLE,
    op: 'update',
    groupKey: agentId,
    match: { id: rowId },
    payload: { context_payload: payload, updated_at: new Date().toISOString() },
  });
  return { outcome: 'queued' };
}

/** Force a sync attempt (used by UI "retry sync" affordances). */
export const syncAgentInteractions = () => flushWriteQueue({ force: true });

export const pendingAgentWrites = () => pendingWriteCount(AGENT_INTERACTIONS_TABLE);

// ───────────────────── queue executor registration ─────────────────────

const executeQueuedAgentWrite = async (item: QueuedWrite) => {
  if (item.op === 'insert') {
    const res = await insertRow(ctx, item.payload as Record<string, unknown>);
    if (res.error) return { ok: false, error: res.error.message, code: res.error.code };
    confirmBufferedWrite(item.id, res.data as unknown as AgentInteraction);
    return { ok: true };
  }
  if (item.op === 'update') {
    const res = await updateRows(ctx, item.match ?? {}, item.payload);
    if (res.error) return { ok: false, error: res.error.message, code: res.error.code };
    confirmBufferedWrite(item.id);
    return { ok: true };
  }
  const res = await deleteRows(ctx, item.match ?? {});
  if (res.error) return { ok: false, error: res.error.message, code: res.error.code };
  dropBufferedWrite(item.id);
  return { ok: true };
};

registerWriteExecutor(AGENT_INTERACTIONS_TABLE, executeQueuedAgentWrite);

export const __executeQueuedAgentWrite = executeQueuedAgentWrite;
