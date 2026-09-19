/**
 * Call history helpers: read the member's own completed calls and record a
 * missed-call alert for the person who never picked up. Pure mapping lives here
 * so it can be tested without a network or a browser.
 */

import { supabase } from '@/integrations/supabase/client';

export type CallHistoryDirection = 'outgoing' | 'incoming';

export interface CallHistorySessionRow {
  id: string;
  caller_id: string;
  receiver_id: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  end_reason: string | null;
  call_quality: string | null;
}

export interface CallHistoryEntry {
  id: string;
  direction: CallHistoryDirection;
  counterpartId: string;
  counterpartName: string;
  counterpartAvatar: string | null;
  startedAt: string;
  durationSeconds: number;
  missed: boolean;
  quality: string | null;
}

const MISSED_REASONS = new Set(['timeout', 'no_answer', 'rejected', 'receiver-media-unavailable', 'receiver-connection-unavailable']);

export const isMissedCall = (row: Pick<CallHistorySessionRow, 'duration_seconds' | 'end_reason'>): boolean =>
  (row.duration_seconds ?? 0) <= 0 && MISSED_REASONS.has(row.end_reason ?? '');

export const formatCallDuration = (seconds: number): string => {
  if (seconds <= 0) return '—';
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, '0')}`;
};

export const mapCallHistory = (
  rows: CallHistorySessionRow[],
  currentUserId: string,
  profiles: Record<string, { displayName: string; avatarUrl: string | null }>,
): CallHistoryEntry[] => rows.map(row => {
  const direction: CallHistoryDirection = row.caller_id === currentUserId ? 'outgoing' : 'incoming';
  const counterpartId = direction === 'outgoing' ? row.receiver_id : row.caller_id;
  const profile = profiles[counterpartId];
  return {
    id: row.id,
    direction,
    counterpartId,
    counterpartName: profile?.displayName || 'M’Mora member',
    counterpartAvatar: profile?.avatarUrl ?? null,
    startedAt: row.started_at,
    durationSeconds: Math.max(0, row.duration_seconds ?? 0),
    missed: isMissedCall(row),
    quality: row.call_quality,
  };
});

/** Loads the signed-in member's own call records, newest first. */
export const fetchCallHistory = async (currentUserId: string, limit = 50): Promise<CallHistoryEntry[]> => {
  const { data, error } = await supabase
    .from('quantum_call_sessions')
    .select('id, caller_id, receiver_id, started_at, ended_at, duration_seconds, end_reason, call_quality')
    .or(`caller_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)
    .order('started_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  const rows = (data ?? []) as CallHistorySessionRow[];
  const counterpartIds = Array.from(new Set(rows.map(row => (row.caller_id === currentUserId ? row.receiver_id : row.caller_id))));

  const profiles: Record<string, { displayName: string; avatarUrl: string | null }> = {};
  if (counterpartIds.length) {
    const { data: profileRows } = await supabase
      .from('profiles')
      .select('user_id, display_name, username, profile_photo_url')
      .in('user_id', counterpartIds);
    (profileRows ?? []).forEach(profile => {
      profiles[profile.user_id] = {
        displayName: profile.display_name || profile.username || 'M’Mora member',
        avatarUrl: profile.profile_photo_url ?? null,
      };
    });
  }

  return mapCallHistory(rows, currentUserId, profiles);
};

/** Leaves an in-app alert so the person who missed a call can see who rang. */
export const recordMissedCallNotification = async (callerId: string, receiverId: string): Promise<void> => {
  try {
    await supabase.from('notifications').insert({
      user_id: receiverId,
      from_user_id: callerId,
      type: 'missed_call',
      context_data: { route: '/calls/history' },
    });
  } catch (error) {
    console.warn('[Calls] Could not record the missed call alert', error);
  }
};
