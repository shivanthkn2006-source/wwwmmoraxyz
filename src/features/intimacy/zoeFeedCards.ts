/**
 * Zoe-written feed cards.
 *
 * The cards are generated server-side from real rows only (the member's own
 * posts, the people they are closest to, and their own engagement signals).
 * Nothing here fabricates a card when the backend has nothing real to say.
 */
import { supabase } from '@/integrations/supabase/client';
import { hasLiveSession } from '@/lib/edgeSession';

export interface ZoeFeedCard {
  id: string;
  kind: string;
  title: string;
  body: string;
  /** The generation this card was written for. */
  cohort: string | null;
  related_post_ids: string[];
  source: Record<string, unknown>;
  created_at: string;
}

export async function fetchZoeFeedCards(limit = 6): Promise<ZoeFeedCard[]> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return [];

  const { data, error } = await supabase
    .from('zoe_feed_cards')
    .select('id, kind, title, body, cohort, related_post_ids, source, created_at')
    .eq('user_id', auth.user.id)
    .eq('dismissed', false)
    .order('created_at', { ascending: false })
    .limit(limit);


  if (error) {
    console.warn('[zoeFeedCards] read failed:', error.message);
    return [];
  }
  return (data ?? []) as ZoeFeedCard[];
}

/** Asks Zoe to write fresh cards. Returns how many she actually wrote. */
export async function generateZoeFeedCards(force = false): Promise<{ created: number; reason?: string }> {
  if (!(await hasLiveSession())) return { created: 0, reason: 'signed_out' };

  const { data, error } = await supabase.functions.invoke('zoe-feed-cards', {
    body: { force },
  });

  if (error) {
    console.warn('[zoeFeedCards] generation failed:', error.message);
    return { created: 0, reason: error.message };
  }
  return { created: Number(data?.created ?? 0), reason: data?.reason };
}

export async function dismissZoeFeedCard(id: string): Promise<boolean> {
  const { error } = await supabase.from('zoe_feed_cards').update({ dismissed: true }).eq('id', id);
  if (error) {
    console.warn('[zoeFeedCards] dismiss failed:', error.message);
    return false;
  }
  return true;
}
