import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { setAmbientExtra } from '@/services/zoe-agent/ambientContext';
import { getCallActivityStatus } from '@/features/calls/callActivityStatuses';

interface ProfileStatusRow {
  user_id: string;
  activity_status: string | null;
  activity_message: string | null;
}

export interface CallActivityPresence {
  status: string;
  message: string | null;
}

/**
 * Live activity statuses for any set of members, read from the same
 * dedicated profile activity fields, including the optional personal message.
 * Kept outside the media/signalling path.
 */
export const useActivityStatuses = (currentUserId: string | null, peerIds: string[]) => {
  const [statuses, setStatuses] = useState<Record<string, CallActivityPresence>>({});

  const watchedIds = useMemo(() => {
    const ids = new Set<string>();
    if (currentUserId) ids.add(currentUserId);
    peerIds.forEach(id => id && ids.add(id));
    return Array.from(ids).sort();
  }, [currentUserId, peerIds]);

  const watchKey = watchedIds.join(',');

  const load = useCallback(async () => {
    if (watchedIds.length === 0) return;
    const { data } = await supabase
      .from('profiles')
      .select('user_id, activity_status, activity_message')
      .in('user_id', watchedIds);

    const next: Record<string, CallActivityPresence> = {};
    (data as ProfileStatusRow[] | null)?.forEach(row => {
      next[row.user_id] = {
        status: row.activity_status || 'online',
        message: row.activity_message?.trim() || null,
      };
    });
    setStatuses(prev => ({ ...prev, ...next }));
  }, [watchKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (watchedIds.length === 0) return;
    void load();

    const channel = supabase
      .channel(`activity-status-${watchKey.slice(0, 60)}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles' },
        payload => {
          const row = payload.new as ProfileStatusRow;
          if (!row?.user_id || !watchedIds.includes(row.user_id)) return;
          setStatuses(prev => ({
            ...prev,
            [row.user_id]: {
              status: row.activity_status || 'online',
              message: row.activity_message?.trim() || null,
            },
          }));
        },
      )
      .subscribe();

    const refresh = window.setInterval(() => void load(), 15_000);
    return () => {
      window.clearInterval(refresh);
      void supabase.removeChannel(channel);
    };
  }, [watchKey, load]); // eslint-disable-line react-hooks/exhaustive-deps

  const ownPresence = currentUserId ? statuses[currentUserId] : undefined;
  const ownStatus = ownPresence?.status || 'online';
  const ownMessage = ownPresence?.message || null;

  const setOwnStatus = useCallback(async (status: string) => {
    if (!currentUserId) return;
    const previous = ownStatus;
    setStatuses(prev => ({ ...prev, [currentUserId]: { status, message: prev[currentUserId]?.message || null } }));
    const { error } = await supabase.from('profiles').update({ activity_status: status }).eq('user_id', currentUserId);
    if (error) setStatuses(prev => ({ ...prev, [currentUserId]: { status: previous, message: prev[currentUserId]?.message || null } }));
  }, [currentUserId, ownStatus]);

  const setOwnMessage = useCallback(async (message: string) => {
    if (!currentUserId) return false;
    const normalized = message.trim().slice(0, 80) || null;
    const previous = ownMessage;
    setStatuses(prev => ({
      ...prev,
      [currentUserId]: { status: prev[currentUserId]?.status || ownStatus, message: normalized },
    }));
    const { error } = await supabase.from('profiles').update({ activity_message: normalized }).eq('user_id', currentUserId);
    if (error) {
      setStatuses(prev => ({
        ...prev,
        [currentUserId]: { status: prev[currentUserId]?.status || ownStatus, message: previous },
      }));
      return false;
    }
    return true;
  }, [currentUserId, ownMessage, ownStatus]);

  // Let Zoe speak about activity without any UI change: she reads ambient context.
  useEffect(() => {
    setAmbientExtra('My activity status', ownMessage || getCallActivityStatus(ownStatus).label);
    const peers = peerIds
      .filter(Boolean)
      .map(id => `${id.slice(0, 8)}: ${statuses[id]?.message || getCallActivityStatus(statuses[id]?.status).label}`);
    setAmbientExtra('Call member activities', peers.length ? peers.join(', ') : null);
  }, [ownStatus, ownMessage, statuses, peerIds]);

  const statusFor = useCallback((userId?: string | null) => getCallActivityStatus(userId ? statuses[userId]?.status : undefined), [statuses]);
  const messageFor = useCallback((userId?: string | null) => userId ? statuses[userId]?.message || null : null, [statuses]);

  return { statuses, ownStatus, ownMessage, setOwnStatus, setOwnMessage, statusFor, messageFor, reload: load };
};
