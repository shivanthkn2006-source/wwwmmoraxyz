/**
 * CRYPTOGRAPHIC DHF LINEAGE LEDGER (client bridge)
 *
 * Every DHF write and every Zoe recommendation appends one tamper-evident row
 * to `public.dhf_lineage_ledger` through the `record_dhf_lineage` RPC. Each row
 * carries the triggering session id, a hashed client IP, the route, a SHA-256
 * content hash and the previous row's chain hash — so the whole per-user chain
 * can be replayed and any silent edit shows up as a broken link.
 *
 * The ledger is append-only in the database (UPDATE/DELETE raise).
 */
import { supabase } from '@/integrations/supabase/client';

const SESSION_KEY = 'zoe_lineage_session_id';
let cachedIpHash: string | null = null;

/** Stable per-browser-session id, created once and reused for the whole tab. */
export function getLineageSessionId(): string {
  try {
    const existing = sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const id = globalThis.crypto?.randomUUID?.() ?? `sess-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem(SESSION_KEY, id);
    return id;
  } catch {
    return 'ephemeral-session';
  }
}

export async function sha256Hex(value: string): Promise<string> {
  try {
    const bytes = new TextEncoder().encode(value);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  } catch {
    return '';
  }
}

/**
 * Hashed client IP. The raw IP is never stored: it is fetched once, hashed in
 * the browser and only the digest leaves the device.
 */
async function resolveIpHash(): Promise<string | null> {
  if (cachedIpHash !== null) return cachedIpHash || null;
  try {
    const res = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(4000) });
    if (!res.ok) throw new Error(String(res.status));
    const json = await res.json();
    cachedIpHash = json?.ip ? await sha256Hex(String(json.ip)) : '';
  } catch {
    cachedIpHash = '';
  }
  return cachedIpHash || null;
}

export interface LineageEntry {
  entityType: string;
  entityId?: string | null;
  action: string;
  /** Raw content that is hashed (never stored verbatim). */
  content: string;
  intent?: string | null;
  unhandledIntent?: boolean;
  metadata?: Record<string, unknown>;
}

/** Append one lineage entry. Never throws — lineage must not break UX. */
export async function recordDhfLineage(entry: LineageEntry): Promise<string | null> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session?.user?.id) return null;

    const ipHash = await resolveIpHash();
    const { data, error } = await supabase.rpc('record_dhf_lineage', {
      _entity_type: entry.entityType,
      _entity_id: entry.entityId ?? null,
      _action: entry.action,
      _content: entry.content,
      _session_id: getLineageSessionId(),
      _ip_hash: ipHash,
      _user_agent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 300) : null,
      _route: typeof window !== 'undefined' ? window.location.pathname : null,
      _intent: entry.intent ?? null,
      _unhandled_intent: entry.unhandledIntent ?? false,
      _metadata: (entry.metadata ?? {}) as any,
    });
    if (error) {
      console.warn('[DHFLineage] append failed:', error.message);
      return null;
    }
    return (data as string) ?? null;
  } catch (err) {
    console.warn('[DHFLineage] append error:', err);
    return null;
  }
}

export interface LineageRow {
  id: string;
  entity_type: string;
  entity_id: string | null;
  action: string;
  session_id: string | null;
  ip_hash: string | null;
  route: string | null;
  intent: string | null;
  unhandled_intent: boolean;
  content_hash: string;
  prev_hash: string | null;
  chain_hash: string;
  created_at: string;
}

/** Read the caller's lineage chain, newest first. */
export async function fetchLineage(limit = 100): Promise<LineageRow[]> {
  const { data, error } = await supabase
    .from('dhf_lineage_ledger')
    .select('id, entity_type, entity_id, action, session_id, ip_hash, route, intent, unhandled_intent, content_hash, prev_hash, chain_hash, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as LineageRow[];
}

/**
 * Verify the chain links of an ordered slice (newest first).
 * Returns the ids of rows whose `prev_hash` does not match the older row's
 * `chain_hash` — i.e. evidence of a gap or tampering.
 */
export function findBrokenLineageLinks(rows: LineageRow[]): string[] {
  const broken: string[] = [];
  for (let i = 0; i < rows.length - 1; i += 1) {
    const newer = rows[i];
    const older = rows[i + 1];
    if (newer.prev_hash && newer.prev_hash !== older.chain_hash) broken.push(newer.id);
  }
  return broken;
}
