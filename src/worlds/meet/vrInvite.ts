/**
 * "Meet me at the portal": invite a friend from the VR chat. The server sends
 * the alert (friends only, fixed wording); opening it drops the friend next to
 * the doorway.
 */
import { supabase } from '@/integrations/supabase/client';
import { invokeWithFreshSession } from '@/lib/edgeSession';
import { getWorldState, PORTAL_OFFSET, RETURN_PORTAL_POS } from '../worldMode';

export type Friend = { id: string; username: string; name: string; photo: string | null };

export async function loadFriends(): Promise<Friend[]> {
  const { data: u } = await supabase.auth.getUser();
  const me = u.user?.id;
  if (!me) return [];
  const [a, b] = await Promise.all([
    supabase.from('friendships').select('user2_id').eq('user1_id', me).limit(200),
    supabase.from('friendships').select('user1_id').eq('user2_id', me).limit(200),
  ]);
  const ids = [...(a.data ?? []).map((r: { user2_id: string }) => r.user2_id), ...(b.data ?? []).map((r: { user1_id: string }) => r.user1_id)];
  if (!ids.length) return [];
  const { data: p } = await supabase.from('public_profiles').select('user_id, username, display_name, profile_photo_url').in('user_id', ids);
  return (p ?? []).map((r: { user_id: string; username: string | null; display_name: string | null; profile_photo_url: string | null }) => ({
    id: r.user_id, username: r.username || 'member', name: r.display_name || r.username || 'Member', photo: r.profile_photo_url,
  })).sort((x, y) => x.username.localeCompare(y.username));
}

export async function sendPortalInvite(friendId: string): Promise<{ ok: boolean; error?: string }> {
  const { data, error } = await invokeWithFreshSession('notify-user', { type: 'vr_invite', userId: friendId, world: getWorldState().mode, priority: 4 });
  if (error) return { ok: false, error: 'Could not send' };
  const d = data as { ok?: boolean; error?: string } | null;
  return d?.ok ? { ok: true } : { ok: false, error: d?.error === 'rate limited' ? 'Too many invites — try later' : d?.error ?? 'Could not send' };
}

/** Pure: where to stand when arriving from an invite (just in front of the doorway, not inside it). */
export function portalMeetSpot(mode: 'real' | 'mmora'): [number, number, number] {
  const p = mode === 'mmora' ? RETURN_PORTAL_POS : PORTAL_OFFSET;
  return [p[0] + 2.5, 1.6, p[2] + 2.5];
}

/** Opened from an invite (?meet=portal): walk the member to the doorway once the world is ready. */
export function arriveFromInvite() {
  if (typeof location === 'undefined' || new URLSearchParams(location.search).get('meet') !== 'portal') return;
  window.setTimeout(() => {
    window.dispatchEvent(new CustomEvent('vr-teleport', { detail: { position: portalMeetSpot(getWorldState().mode), lockGround: true } }));
  }, 2500);
}
