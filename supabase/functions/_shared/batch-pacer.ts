/**
 * BATCH PACER — throttling + queued retries for the AI batch runs.
 *
 * The daily-motivation and astrology dispatch runs iterate members and call
 * models per member. Two failure modes killed whole runs:
 *   1. no wall-clock budget → the platform severed the request at its idle
 *      timeout and every member after the cut was silently lost;
 *   2. no spacing between model calls → provider 429s cascaded.
 *
 * This helper gives both a deadline and a minimum gap, and parks whatever the
 * run did not reach in `public.ai_batch_queue` so the next scheduled run (or a
 * drain call) finishes it instead of it being dropped.
 */

export interface PacerOptions {
  /** Whole-run wall clock budget in ms (keep well under the platform timeout). */
  budgetMs?: number;
  /** Minimum gap between two paced units of work, in ms. */
  minGapMs?: number;
  /** Extra pause after a rate-limited unit, in ms. */
  rateLimitCooldownMs?: number;
}

export interface Pacer {
  /** True once the wall-clock budget is spent — stop the loop and enqueue. */
  expired: () => boolean;
  /** Await before each unit of work so calls are spaced out. */
  gate: () => Promise<void>;
  /** Await after a 429 so the provider gets room to recover. */
  cooldown: () => Promise<void>;
  elapsedMs: () => number;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function createPacer(opts: PacerOptions = {}): Pacer {
  const budgetMs = opts.budgetMs ?? 90_000;
  const minGapMs = opts.minGapMs ?? 400;
  const cooldownMs = opts.rateLimitCooldownMs ?? 2_000;
  const startedAt = Date.now();
  let lastAt = 0;

  return {
    expired: () => Date.now() - startedAt >= budgetMs,
    elapsedMs: () => Date.now() - startedAt,
    gate: async () => {
      const wait = lastAt === 0 ? 0 : minGapMs - (Date.now() - lastAt);
      if (wait > 0) await sleep(wait);
      lastAt = Date.now();
    },
    cooldown: async () => {
      await sleep(cooldownMs);
      lastAt = Date.now();
    },
  };
}

export interface QueueEntry {
  userId: string | null;
  targetDate?: string | null;
  payload?: Record<string, unknown>;
  /** Seconds to wait before the entry becomes claimable. */
  delaySeconds?: number;
}

interface RestConfig {
  supabaseUrl: string;
  serviceKey: string;
}

const rest = async (cfg: RestConfig, path: string, init: RequestInit = {}) => {
  const res = await fetch(`${cfg.supabaseUrl}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: cfg.serviceKey,
      Authorization: `Bearer ${cfg.serviceKey}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  let data: unknown = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { ok: res.ok, status: res.status, data };
};

/** Park unreached members so a later run finishes them. Never throws. */
export async function enqueueRetries(
  cfg: RestConfig,
  jobType: string,
  entries: QueueEntry[],
): Promise<number> {
  if (!entries.length) return 0;
  const rows = entries.map((e) => ({
    job_type: jobType,
    user_id: e.userId,
    target_date: e.targetDate ?? null,
    payload: e.payload ?? {},
    status: 'pending',
    next_attempt_at: new Date(Date.now() + (e.delaySeconds ?? 60) * 1000).toISOString(),
  }));
  const res = await rest(cfg, 'ai_batch_queue?on_conflict=job_type,user_id,target_date', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(rows),
  }).catch(() => ({ ok: false, status: 0, data: null }));
  return res.ok ? rows.length : 0;
}

export interface ClaimedJob {
  id: string;
  user_id: string | null;
  target_date: string | null;
  payload: Record<string, unknown>;
  attempts: number;
}

/** Read the due queue for a job type (oldest first). Never throws. */
export async function claimQueued(
  cfg: RestConfig,
  jobType: string,
  limit: number,
): Promise<ClaimedJob[]> {
  const res = await rest(
    cfg,
    `ai_batch_queue?job_type=eq.${encodeURIComponent(jobType)}&status=eq.pending` +
      `&next_attempt_at=lte.${encodeURIComponent(new Date().toISOString())}` +
      `&select=id,user_id,target_date,payload,attempts&order=next_attempt_at.asc&limit=${limit}`,
  ).catch(() => ({ ok: false, status: 0, data: null }));
  return Array.isArray(res.data) ? (res.data as ClaimedJob[]) : [];
}

/** Mark a queue entry finished, or schedule its next attempt with backoff. */
export async function settleQueued(
  cfg: RestConfig,
  job: ClaimedJob,
  outcome: { ok: boolean; error?: string; maxAttempts?: number },
): Promise<void> {
  const maxAttempts = outcome.maxAttempts ?? 5;
  const attempts = (job.attempts ?? 0) + 1;
  const body = outcome.ok
    ? { status: 'done', attempts, last_error: null }
    : attempts >= maxAttempts
      ? { status: 'failed', attempts, last_error: outcome.error ?? 'unknown' }
      : {
          status: 'pending',
          attempts,
          last_error: outcome.error ?? 'unknown',
          next_attempt_at: new Date(Date.now() + Math.min(30, 2 ** attempts) * 60_000).toISOString(),
        };
  await rest(cfg, `ai_batch_queue?id=eq.${job.id}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify(body),
  }).catch(() => undefined);
}
