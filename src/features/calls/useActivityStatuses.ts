import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { setAmbientExtra } from '@/services/zoe-agent/ambientContext';
import { getCallActivityStatus } from '@/features/calls/callActivityStatuses';

interface ProfileStatusRow {
  user_id: string;
  status: string | null;
}

/**
 * Live activity statuses for any set of members, read from the same
 * `profiles.status` value the Profile page writes, so Calls and Profile can
 * never disagree. Kept outside the media/signalling path.
 */
export const useActivityStatuses = (currentUserId: string | null, peerIds: string[]) => {
  const [statuses, setStatuses] = useState<Record<string, string>>({});

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
      .select('user_id, status')
      .in('user_id', watchedIds);

    const next: Record<string, string> = {};
    (data as ProfileStatusRow[] | null)?.forEach(row => {
      next[row.user_id] = row.status || 'online';
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
          setStatuses(prev => ({ ...prev, [row.user_id]: row.status || 'online' }));
        },
      )
      .subscribe();

    const refresh = window.setInterval(() => void load(), 15_000);
    return () => {
      window.clearInterval(refresh);
      void supabase.removeChannel(channel);
    };
  }, [watchKey, load]); // eslint-disable-line react-hooks/exhaustive-deps

  const ownStatus = currentUserId ? statuses[currentUserId] || 'online' : 'online';

  const setOwnStatus = useCallback(async (status: string) => {
    if (!currentUserId) return;
    const previous = ownStatus;
    setStatuses(prev => ({ ...prev, [currentUserId]: status }));
    const { error } = await supabase.from('profiles').update({ status }).eq('user_id', currentUserId);
    if (error) setStatuses(prev => ({ ...prev, [currentUserId]: previous }));
  }, [currentUserId, ownStatus]);

  // Let Zoe speak about activity without any UI change: she reads ambient context.
  useEffect(() => {
    setAmbientExtra('My activity status', getCallActivityStatus(ownStatus).label);
    const peers = peerIds
      .filter(Boolean)
      .map(id => `${id.slice(0, 8)}: ${getCallActivityStatus(statuses[id]).label}`);
    setAmbientExtra('Call member activities', peers.length ? peers.join(', ') : null);
  }, [ownStatus, statuses, peerIds]);

  const statusFor = useCallback((userId?: string | null) => getCallActivityStatus(userId ? statuses[userId] : undefined), [statuses]);

  return { statuses, ownStatus, setOwnStatus, statusFor, reload: load };
};
