import type { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

const done = new Set<string>();

/**
 * Makes sure the signed-in member has their own profile row, and fills
 * blank name / photo / contact email from their sign-in account (Google or
 * email). Existing values the member set are never overwritten.
 */
export async function ensureOwnProfile(user: User): Promise<void> {
  if (!user?.id || done.has(user.id)) return;
  done.add(user.id);

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : '');
  const name = str(meta.display_name) || str(meta.full_name) || str(meta.name);
  const photo = str(meta.avatar_url) || str(meta.picture);
  const email = user.email ?? '';

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('user_id, display_name, profile_photo_url, contact_email')
      .eq('user_id', user.id)
      .maybeSingle();
    if (error) throw error;

    if (!data) {
      const fallback = email.split('@')[0] || 'member';
      await supabase.from('profiles').insert({
        user_id: user.id,
        username: String(meta.username ?? `user_${user.id.slice(0, 8)}`).slice(0, 40),
        display_name: (name || fallback).slice(0, 60),
        profile_photo_url: photo || null,
        contact_email: email || null,
        profile_visibility: 'public',
      } as never);
      return;
    }

    const row = data as { display_name?: string | null; profile_photo_url?: string | null; contact_email?: string | null };
    const patch: Record<string, string> = {};
    if (!str(row.display_name) && name) patch.display_name = name.slice(0, 60);
    if (!str(row.profile_photo_url) && photo) patch.profile_photo_url = photo;
    if (!str(row.contact_email) && email) patch.contact_email = email;
    if (Object.keys(patch).length) {
      await supabase.from('profiles').update(patch as never).eq('user_id', user.id);
    }
  } catch {
    // Repaired on the next sign-in; never block startup.
    done.delete(user.id);
  }
}
