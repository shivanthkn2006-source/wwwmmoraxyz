// ═══════════════════════════════════════════════════════════════════════════════
// AGENT INTERACTION LOCAL BUFFER
// Optimistic, offline-first mirror of agent_interactions. Writes land here first
// so any of the 28+ agent sections can read its own context instantly — even
// with the backend paused — and are synced through the durable write queue when
// connectivity returns.
// ═══════════════════════════════════════════════════════════════════════════════

import type { AgentInteraction } from '@/lib/data/agentInteractions';

const STORAGE_KEY = 'mmora.agentBuffer.v1';
const MAX_PER_AGENT = 50;
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface BufferedInteraction extends Omit<AgentInteraction, 'id' | 'user_id'> {
  id: string;
  user_id: string | null;
  /** Local-only marker: not yet confirmed by the backend. */
  pending: boolean;
  /** Write-queue item id, so a synced row can be reconciled. */
  queueId?: string;
}

type Listener = (rows: BufferedInteraction[]) => void;

let buffer: BufferedInteraction[] = [];
let loaded = false;
const listeners = new Set<Listener>();

const storage = (): Storage | null => {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
};

function load() {
  if (loaded) return;
  loaded = true;
  try {
    const raw = storage()?.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as BufferedInteraction[]) : [];
    const cutoff = Date.now() - TTL_MS;
    buffer = Array.isArray(parsed)
      ? parsed.filter((r) => r && Date.parse(r.created_at) > cutoff)
      : [];
  } catch {
    buffer = [];
  }
}

function persist() {
  try {
    storage()?.setItem(STORAGE_KEY, JSON.stringify(buffer));
  } catch {
    buffer = buffer.slice(Math.floor(buffer.length / 2));
  }
  const snap = [...buffer];
  for (const l of listeners) {
    try {
      l(snap);
    } catch {
      /* ignore */
    }
  }
}

function trim(agentId: string) {
  const forAgent = buffer.filter((r) => r.agent_id === agentId);
  if (forAgent.length <= MAX_PER_AGENT) return;
  const keep = new Set(
    forAgent
      .slice()
      .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
      .slice(0, MAX_PER_AGENT)
      .map((r) => r.id),
  );
  buffer = buffer.filter((r) => r.agent_id !== agentId || keep.has(r.id));
}

export function subscribeAgentBuffer(listener: Listener): () => void {
  load();
  listeners.add(listener);
  listener([...buffer]);
  return () => listeners.delete(listener);
}

/** Records a local snapshot; returns the buffered row. */
export function bufferAgentContext(
  agentId: string,
  payload: Record<string, unknown>,
  options: { userId?: string | null; pending?: boolean; queueId?: string } = {},
): BufferedInteraction {
  load();
  const now = new Date().toISOString();
  const row: BufferedInteraction = {
    id: `local_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    user_id: options.userId ?? null,
    agent_id: agentId,
    context_payload: payload,
    created_at: now,
    updated_at: now,
    pending: options.pending ?? true,
    queueId: options.queueId,
  };
  buffer.push(row);
  trim(agentId);
  persist();
  return row;
}

/** Local rows for one agent, newest first. Never crosses agent boundaries. */
export function readBufferedAgentContext(agentId: string, limit = 20): BufferedInteraction[] {
  load();
  return buffer
    .filter((r) => r.agent_id === agentId)
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
    .slice(0, limit);
}

export function pendingBufferedCount(agentId?: string): number {
  load();
  return buffer.filter((r) => r.pending && (!agentId || r.agent_id === agentId)).length;
}

/** Marks a buffered row as confirmed once its queued write succeeded. */
export function confirmBufferedWrite(queueId: string, serverRow?: Partial<AgentInteraction>) {
  load();
  let changed = false;
  buffer = buffer.map((r) => {
    if (r.queueId !== queueId) return r;
    changed = true;
    return {
      ...r,
      pending: false,
      id: serverRow?.id ?? r.id,
      user_id: serverRow?.user_id ?? r.user_id,
      updated_at: serverRow?.updated_at ?? new Date().toISOString(),
    };
  });
  if (changed) persist();
}

/** Drops a buffered row whose write was permanently rejected. */
export function dropBufferedWrite(queueId: string) {
  load();
  const next = buffer.filter((r) => r.queueId !== queueId);
  if (next.length !== buffer.length) {
    buffer = next;
    persist();
  }
}

/**
 * Merges server rows with local rows for one agent. Server rows win; pending
 * local rows are appended so the UI never loses an unsynced snapshot.
 */
export function mergeAgentContext(
  agentId: string,
  serverRows: AgentInteraction[],
  limit = 20,
): BufferedInteraction[] {
  const pending = readBufferedAgentContext(agentId).filter((r) => r.pending);
  const server: BufferedInteraction[] = serverRows
    .filter((r) => r.agent_id === agentId)
    .map((r) => ({ ...r, pending: false }));
  return [...server, ...pending]
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
    .slice(0, limit);
}

/** User-initiated forget for a single agent section. */
export function clearBufferedAgent(agentId: string) {
  load();
  buffer = buffer.filter((r) => r.agent_id !== agentId);
  persist();
}

/** Test hook. */
export function __resetAgentBuffer() {
  buffer = [];
  loaded = true;
  listeners.clear();
  try {
    storage()?.removeItem(STORAGE_KEY);
  } catch {
    /* noop */
  }
}
