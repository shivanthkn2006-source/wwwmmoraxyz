import { supabase } from '@/integrations/supabase/client';

export interface FriendBirthdayEvent {
  id: string;
  title: string;
  description: string | null;
  date_type: 'birthday';
  date_value: string;
  is_recurring: true;
}

const nextOccurrence = (value: string): string | null => {
  const match = value.slice(0, 10).match(/^\d{4}-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const month = Number(match[1]);
  const day = Number(match[2]);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let occurrence = new Date(now.getFullYear(), month - 1, day);
  if (occurrence < today) occurrence = new Date(now.getFullYear() + 1, month - 1, day);

  const year = occurrence.getFullYear();
  const normalizedMonth = String(occurrence.getMonth() + 1).padStart(2, '0');
  const normalizedDay = String(occurrence.getDate()).padStart(2, '0');
  return `${year}-${normalizedMonth}-${normalizedDay}`;
};

export const loadFriendBirthdayEvents = async (userId: string): Promise<FriendBirthdayEvent[]> => {
  const { data: friendships, error: friendshipError } = await supabase
    .from('friendships')
    .select('user1_id, user2_id')
    .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

  if (friendshipError || !friendships?.length) return [];

  const friendIds = [...new Set(friendships.map((friendship) =>
    friendship.user1_id === userId ? friendship.user2_id : friendship.user1_id
  ))];
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('user_id, display_name, event_type, event_date, birth_date, date_of_birth')
    .in('user_id', friendIds);

  if (profileError) return [];

  return (profiles || []).flatMap((profile) => {
    const configuredBirthday = profile.event_type?.toLowerCase() === 'birthday' ? profile.event_date : null;
    const dateValue = nextOccurrence(configuredBirthday || profile.birth_date || profile.date_of_birth || '');
    if (!dateValue) return [];
    return [{
      id: `friend-birthday-${profile.user_id}`,
      title: `${profile.display_name}'s birthday`,
      description: null,
      date_type: 'birthday' as const,
      date_value: dateValue,
      is_recurring: true as const,
    }];
  });
};