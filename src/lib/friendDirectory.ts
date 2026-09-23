/**
 * FRIEND DIRECTORY — one place for "who may I see?".
 *
 * Personal profile rows are readable only by the member and their accepted
 * friends. Everything that merely needs a name, handle or photo of somebody the
 * member is not friends with reads the safe directory instead, so search and
 * suggestions keep working without exposing personal profile details.
 */
import { supabase } from '@/integrations/supabase/client';

export interface DirectoryProfile {
  user_id: string;
  username: string | null;
  display_name: string | null;
  profile_photo_url: string | null;
  bio?: string | null;
  city?: string | null;
  hobbies?: string[] | null;
  status?: string | null;
  event_date?: string | null;
  event_recurring?: boolean | null;
  profession?: string | null;
  field_of_study?: string | null;
  location_enabled?: boolean | null;
}

export const DIRECTORY_FIELDS =
  'user_id, username, display_name, profile_photo_url, bio, city, hobbies, status, event_date, event_recurring, profession, field_of_study, location_enabled';

/** Accepted friends of a member, both directions of the friendship row. */
export const loadFriendIds = async (userId: string): Promise<string[]> => {
  const { data, error } = await supabase
    .from('friendships')
    .select('user1_id, user2_id')
    .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

  if (error || !data) return [];
  return [...new Set(data.map((row) => (row.user1_id === userId ? row.user2_id : row.user1_id)))];
};

/** Directory rows for accepted friends only — used by calls, group calls and chat pickers. */
export const loadFriendDirectory = async (userId: string): Promise<DirectoryProfile[]> => {
  const friendIds = await loadFriendIds(userId);
  if (friendIds.length === 0) return [];

  const { data, error } = await supabase
    .from('public_profiles')
    .select(DIRECTORY_FIELDS)
    .in('user_id', friendIds);

  if (error || !data) return [];
  return data as DirectoryProfile[];
};

/** Name/handle search across the whole platform — discovery only, no personal details. */
export const searchDirectory = async (
  query: string,
  excludeUserId?: string | null,
  limit = 10,
): Promise<DirectoryProfile[]> => {
  const needle = query.trim();
  if (!needle) return [];

  let request = supabase
    .from('public_profiles')
    .select(DIRECTORY_FIELDS)
    .or(`display_name.ilike.%${needle}%,username.ilike.%${needle}%`)
    .limit(limit);

  if (excludeUserId) request = request.neq('user_id', excludeUserId);

  const { data, error } = await request;
  if (error || !data) return [];
  return data as DirectoryProfile[];
};

/** Directory rows for a known set of members (post authors, message senders, map pins). */
export const loadDirectoryByIds = async (userIds: string[]): Promise<Map<string, DirectoryProfile>> => {
  const unique = [...new Set(userIds.filter(Boolean))];
  if (unique.length === 0) return new Map();

  const { data } = await supabase.from('public_profiles').select(DIRECTORY_FIELDS).in('user_id', unique);
  return new Map(((data as DirectoryProfile[] | null) || []).map((row) => [row.user_id, row]));
};

/**
 * Attaches directory profiles to rows that reference a member id.
 * Used in place of joins on the private profiles table, so a post, comment or
 * message written by somebody who is not a friend still shows a name and photo.
 */
export const attachDirectoryProfiles = async <T extends Record<string, unknown>>(
  rows: T[] | null | undefined,
  idKey = 'user_id',
  targetKey = 'profile',
): Promise<T[]> => {
  const list = rows || [];
  if (list.length === 0) return [];
  const directory = await loadDirectoryByIds(list.map((row) => String(row[idKey] ?? '')));
  return list.map((row) => ({
    ...row,
    [targetKey]: directory.get(String(row[idKey] ?? '')) ?? null,
  })) as T[];
};
