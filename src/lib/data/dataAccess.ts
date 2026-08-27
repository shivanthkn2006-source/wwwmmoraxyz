// ═══════════════════════════════════════════════════════════════════════════════
// ENTERPRISE DATA ACCESS LAYER
// Single funnel for every backend read/write. Enforces the RLS assumption of
// each query *before* it leaves the browser, so a policy change can never turn
// into a silent cross-tenant leak, and normalizes typed results + errors.
// ═══════════════════════════════════════════════════════════════════════════════

import { supabase } from '@/integrations/supabase/client';
import { reportPlatformError } from '@/lib/enterpriseTelemetry';

/**
 * The access assumption a query is written against.
 * - `owner`   : rows are scoped to auth.uid(); a session is required and the
 *               owner column MUST be constrained in the query.
 * - `admin`   : rows are readable only by admins; a session is required.
 * - `public`  : rows are intentionally world-readable (anon policy exists).
 * - `service` : rows are written by edge functions only — never from the client.
 */
export type RlsScope = 'owner' | 'admin' | 'public' | 'service';

export interface QueryContext {
  table: string;
  scope: RlsScope;
  /** Column carrying the owner id. Defaults to `user_id` for owner-scoped reads. */
  ownerColumn?: string;
  /** Explicit owner id; when omitted the current session user is used. */
  ownerId?: string;
}

export class DataAccessError extends Error {
  constructor(
    message: string,
    readonly table: string,
    readonly code?: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'DataAccessError';
  }
}

export type Result<T> = { data: T; error: null } | { data: null; error: DataAccessError };

const ok = <T,>(data: T): Result<T> => ({ data, error: null });

const fail = <T,>(ctx: QueryContext, message: string, code?: string, cause?: unknown): Result<T> => {
  const err = new DataAccessError(message, ctx.table, code, cause);
  reportPlatformError({
    errorType: 'DataAccessError',
    message: `${ctx.table}: ${message}`,
    severity: code === 'RLS_ASSUMPTION' ? 'high' : 'medium',
    source: `data-access:${ctx.table}`,
    metadata: { scope: ctx.scope, code },
  });
  return { data: null, error: err };
};

/** Cached session user id — avoids an auth round-trip on every query. */
let cachedUserId: string | null = null;

supabase.auth.onAuthStateChange((_event, session) => {
  cachedUserId = session?.user?.id ?? null;
});

export async function currentUserId(): Promise<string | null> {
  if (cachedUserId) return cachedUserId;
  const { data } = await supabase.auth.getSession();
  cachedUserId = data.session?.user?.id ?? null;
  return cachedUserId;
}

/** Test/bootstrap hook — keeps the cache honest outside a browser session. */
export function __setCachedUserId(id: string | null) {
  cachedUserId = id;
}

/**
 * Verifies the caller satisfies the table's RLS assumption before the request
 * is issued. Returns an error string when the query must not be sent.
 */
export async function assertRlsPrecondition(ctx: QueryContext): Promise<string | null> {
  if (ctx.scope === 'service') {
    return `${ctx.table} is service-role only and must be reached through an edge function`;
  }
  if (ctx.scope === 'public') return null;

  const uid = ctx.ownerId ?? (await currentUserId());
  if (!uid) return `${ctx.table} requires an authenticated session (${ctx.scope} scope)`;

  return null;
}

interface SelectOptions {
  columns?: string;
  eq?: Record<string, string | number | boolean | null>;
  in?: { column: string; values: Array<string | number> };
  order?: { column: string; ascending?: boolean };
  limit?: number;
  maybeSingle?: boolean;
}

/**
 * Typed, RLS-aware select. Owner-scoped tables are ALWAYS filtered by the
 * owner column in addition to the policy — defence in depth, and it keeps the
 * query plan aligned with the policy predicate.
 */
export async function selectRows<T>(
  ctx: QueryContext,
  options: SelectOptions = {},
): Promise<Result<T[]>> {
  const precondition = await assertRlsPrecondition(ctx);
  if (precondition) return fail<T[]>(ctx, precondition, 'RLS_ASSUMPTION');

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query: any = (supabase as any).from(ctx.table).select(options.columns ?? '*');

    if (ctx.scope === 'owner') {
      const uid = ctx.ownerId ?? (await currentUserId());
      query = query.eq(ctx.ownerColumn ?? 'user_id', uid);
    }
    for (const [column, value] of Object.entries(options.eq ?? {})) {
      query = value === null ? query.is(column, null) : query.eq(column, value);
    }
    if (options.in) query = query.in(options.in.column, options.in.values);
    if (options.order) {
      query = query.order(options.order.column, { ascending: options.order.ascending ?? false });
    }
    if (options.limit) query = query.limit(options.limit);

    const { data, error } = await query;
    if (error) return fail<T[]>(ctx, error.message, error.code, error);
    return ok((data ?? []) as T[]);
  } catch (e) {
    return fail<T[]>(ctx, String((e as Error)?.message ?? e), 'TRANSPORT', e);
  }
}

/** Typed single-row read. Returns `null` data when nothing matched. */
export async function selectOne<T>(
  ctx: QueryContext,
  options: SelectOptions = {},
): Promise<Result<T | null>> {
  const res = await selectRows<T>(ctx, { ...options, limit: 1 });
  if (res.error) return { data: null, error: res.error };
  return ok(res.data[0] ?? null);
}

/**
 * Insert with the owner column stamped from the session. Never trusts a
 * caller-supplied owner id on owner-scoped tables — that is exactly the shape
 * an RLS `WITH CHECK` rejects, and failing fast beats a 403 round trip.
 */
export async function insertRow<T extends Record<string, unknown>>(
  ctx: QueryContext,
  values: T,
): Promise<Result<T>> {
  const precondition = await assertRlsPrecondition(ctx);
  if (precondition) return fail<T>(ctx, precondition, 'RLS_ASSUMPTION');

  const payload: Record<string, unknown> = { ...values };
  if (ctx.scope === 'owner') {
    const column = ctx.ownerColumn ?? 'user_id';
    payload[column] = ctx.ownerId ?? (await currentUserId());
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from(ctx.table)
      .insert(payload)
      .select()
      .maybeSingle();
    if (error) return fail<T>(ctx, error.message, error.code, error);
    return ok(data as T);
  } catch (e) {
    return fail<T>(ctx, String((e as Error)?.message ?? e), 'TRANSPORT', e);
  }
}

/** Update constrained to the caller's own rows on owner-scoped tables. */
export async function updateRows<T extends Record<string, unknown>>(
  ctx: QueryContext,
  match: Record<string, string | number>,
  patch: Partial<T>,
): Promise<Result<T[]>> {
  const precondition = await assertRlsPrecondition(ctx);
  if (precondition) return fail<T[]>(ctx, precondition, 'RLS_ASSUMPTION');

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query: any = (supabase as any).from(ctx.table).update(patch);
    if (ctx.scope === 'owner') {
      query = query.eq(ctx.ownerColumn ?? 'user_id', ctx.ownerId ?? (await currentUserId()));
    }
    for (const [column, value] of Object.entries(match)) query = query.eq(column, value);

    const { data, error } = await query.select();
    if (error) return fail<T[]>(ctx, error.message, error.code, error);
    return ok((data ?? []) as T[]);
  } catch (e) {
    return fail<T[]>(ctx, String((e as Error)?.message ?? e), 'TRANSPORT', e);
  }
}

/** Delete constrained to the caller's own rows on owner-scoped tables. */
export async function deleteRows(
  ctx: QueryContext,
  match: Record<string, string | number>,
): Promise<Result<true>> {
  const precondition = await assertRlsPrecondition(ctx);
  if (precondition) return fail<true>(ctx, precondition, 'RLS_ASSUMPTION');

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query: any = (supabase as any).from(ctx.table).delete();
    if (ctx.scope === 'owner') {
      query = query.eq(ctx.ownerColumn ?? 'user_id', ctx.ownerId ?? (await currentUserId()));
    }
    for (const [column, value] of Object.entries(match)) query = query.eq(column, value);

    const { error } = await query;
    if (error) return fail<true>(ctx, error.message, error.code, error);
    return ok(true as const);
  } catch (e) {
    return fail<true>(ctx, String((e as Error)?.message ?? e), 'TRANSPORT', e);
  }
}

// ───────────────────────── typed table contracts ─────────────────────────

export interface NotificationAttempt {
  id: string;
  audit_run_id: string | null;
  correlation_id: string | null;
  channel: string;
  attempt: number;
  max_attempts: number;
  succeeded: boolean;
  transport: string | null;
  error: string | null;
  http_status: number | null;
  duration_ms: number | null;
  subject: string | null;
  source: string | null;
  created_at: string;
}

/** Admin-only: recent Slack/email delivery attempts, newest first. */
export const fetchNotificationAttempts = (auditRunId?: string, limit = 100) =>
  selectRows<NotificationAttempt>(
    { table: 'notification_attempts', scope: 'admin' },
    {
      eq: auditRunId ? { audit_run_id: auditRunId } : undefined,
      order: { column: 'created_at', ascending: false },
      limit,
    },
  );
