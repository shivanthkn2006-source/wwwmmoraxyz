/**
 * "Show my real location on the VR map" — off by default. Stored per member in
 * notification_settings.share_real_location. Anything that would show a
 * member to others on the Real Map must call canShareRealLocation() first.
 */
import { supabase } from '@/integrations/supabase/client';

let cached: boolean | null = null;

export async function getShareRealLocation(): Promise<boolean> {
  if (cached !== null) return cached;
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return false;
  const { data } = await supabase.from('notification_settings')
    .select('share_real_location').eq('user_id', auth.user.id).maybeSingle();
  cached = Boolean((data as { share_real_location?: boolean } | null)?.share_real_location);
  return cached;
}

export async function setShareRealLocation(next: boolean): Promise<boolean> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return false;
  const { error } = await supabase.from('notification_settings')
    .upsert({ user_id: auth.user.id, share_real_location: next } as never, { onConflict: 'user_id' });
  if (error) return false;
  cached = next;
  window.dispatchEvent(new CustomEvent('vr-location-privacy', { detail: { share: next } }));
  return true;
}

export const canShareRealLocation = getShareRealLocation;
