/**
 * Intimacy signal ingestion.
 *
 * Records *how* a member engages with another member's content — a skim, a long
 * dwell, a reply, a save — into `feed_events`. Nothing here changes what the
 * feed renders; it only observes. Writes are dropped when signed out (no RLS
 * error storms) and are batched so scroll never pays a network cost per card.
 */
import { supabase } from '@/integrations/supabase/client';
import { resolveAuthUid } from '@/lib/safeTelemetry';

export type FeedEventType =
  | 'view'
  | 'dwell'
  | 'like'
  | 'comment'
  | 'reply'
  | 'share'
  | 'save'
  | 'profile_visit'
  | 'dm'
  | 'replay'
  | 'skip';

/** Interaction weights — depth beats volume, which is the whole point. */
export const EVENT_WEIGHTS: Record<FeedEventType, number> = {
  view: 0.2,
  dwell: 1,
  like: 1.5,
  comment: 4,
  reply: 5,
  share: 4.5,
  save: 3.5,
  profile_visit: 2,
  dm: 6,
  replay: 3,
  skip: 0,
};

export interface FeedEventInput {
  targetUserId?: string | null;
  postId?: string | null;
  type: FeedEventType;
  dwellMs?: number;
  surface?: string;
}

interface QueuedEvent {
  user_id: string;
  target_user_id: string | null;
  post_id: string | null;
  event_type: FeedEventType;
  dwell_ms: number;
  weight: number;
  surface: string | null;
}

const FLUSH_MS = 4000;
const MAX_BATCH = 40;
const queue: QueuedEvent[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

const isUuid = (v: unknown): v is string =>
  typeof v === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

/** Dwell contributes sub-linearly: 10s of attention is not 10x 1s. */
export function dwellWeight(dwellMs: number): number {
  const seconds = Math.max(0, Math.min(dwellMs, 600_000)) / 1000;
  return Math.min(6, Math.log2(1 + seconds));
}

export async function recordFeedEvent(input: FeedEventInput): Promise<boolean> {
  const uid = await resolveAuthUid();
  if (!uid) return false; // signed out — drop locally, never hit the API

  const dwellMs = Math.max(0, Math.round(input.dwellMs ?? 0));
  const base = EVENT_WEIGHTS[input.type] ?? 0;
  const weight = Math.min(100, base + (input.type === 'dwell' ? dwellWeight(dwellMs) : 0));

  queue.push({
    user_id: uid,
    target_user_id: isUuid(input.targetUserId) && input.targetUserId !== uid ? input.targetUserId : null,
    post_id: isUuid(input.postId) ? input.postId : null,
    event_type: input.type,
    dwell_ms: Math.min(dwellMs, 3_600_000),
    weight: Number(weight.toFixed(3)),
    surface: input.surface ? input.surface.slice(0, 60) : null,
  });

  if (queue.length >= MAX_BATCH) return flushFeedEvents();
  if (!timer) timer = setTimeout(() => void flushFeedEvents(), FLUSH_MS);
  return true;
}

export async function flushFeedEvents(): Promise<boolean> {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  if (queue.length === 0) return true;
  const batch = queue.splice(0, queue.length);
  try {
    const { error } = await supabase.from('feed_events').insert(batch);
    if (error) return false;
    return true;
  } catch {
    return false;
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => void flushFeedEvents());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void flushFeedEvents();
  });
}
