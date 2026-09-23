import type { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

const done = new Set<string>();

/**
 * Makes sure the signed-in member has their own profile row.
 *
 * Accounts created outside the invite portal (normal sign-up, social sign-in)
 * arrive with no profile row, which leaves them missing from the member
 * directory and invisible to friends. This writes the row once per session,
 * using only fields the member owns, and never overwrites existing values.
 */
export async function ensureOwnProfile(user: User): Promise<void> {
  if (!user?.id || done.has(user.id)) return;
  done.add(user.id);

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (error || data) return;

    const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
    const fallback = (user.email ?? '').split('@')[0] || 'member';
    await supabase.from('profiles').insert({
      user_id: user.id,
      username: String(meta.username ?? `user_${user.id.slice(0, 8)}`).slice(0, 40),
      display_name: String(meta.display_name ?? meta.full_name ?? fallback).slice(0, 60),
      profile_visibility: 'public',
    });
  } catch {
    // A missing profile is repaired on the next sign-in; never block startup.
    done.delete(user.id);
  }
}
