import { useCallback, useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import {
  CALL_ACTIVITY_STATUSES,
  getCallActivityStatus,
} from '@/features/calls/callActivityStatuses';

interface CallActivityStatusPanelProps {
  currentUserId: string;
  participantId?: string;
  participantName?: string;
}

interface ProfileStatusRow {
  user_id: string;
  activity_status: string | null;
  activity_message: string | null;
}

export const CallActivityStatusPanel = ({
  currentUserId,
  participantId,
  participantName,
}: CallActivityStatusPanelProps) => {
  const [ownStatus, setOwnStatus] = useState('online');
  const [participantStatus, setParticipantStatus] = useState('online');
  const [ownMessage, setOwnMessage] = useState<string | null>(null);
  const [participantMessage, setParticipantMessage] = useState<string | null>(null);

  const loadStatuses = useCallback(async () => {
    const userIds = [currentUserId, participantId].filter((id): id is string => Boolean(id));
    if (userIds.length === 0) return;

    const { data } = await supabase
      .from('profiles')
      .select('user_id, activity_status, activity_message')
      .in('user_id', userIds);

    (data as ProfileStatusRow[] | null)?.forEach(profile => {
      if (profile.user_id === currentUserId) {
        setOwnStatus(profile.activity_status || 'online');
        setOwnMessage(profile.activity_message?.trim() || null);
      }
      if (profile.user_id === participantId) {
        setParticipantStatus(profile.activity_status || 'online');
        setParticipantMessage(profile.activity_message?.trim() || null);
      }
    });
  }, [currentUserId, participantId]);

  useEffect(() => {
    void loadStatuses();

    const channel = supabase
      .channel(`call-activity-${currentUserId}-${participantId ?? 'pending'}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles' },
        payload => {
          const profile = payload.new as ProfileStatusRow;
          if (profile.user_id === currentUserId) {
            setOwnStatus(profile.activity_status || 'online');
            setOwnMessage(profile.activity_message?.trim() || null);
          }
          if (profile.user_id === participantId) {
            setParticipantStatus(profile.activity_status || 'online');
            setParticipantMessage(profile.activity_message?.trim() || null);
          }
        },
      )
      .subscribe();

    const refresh = window.setInterval(() => void loadStatuses(), 15_000);
    return () => {
      window.clearInterval(refresh);
      void supabase.removeChannel(channel);
    };
  }, [currentUserId, loadStatuses, participantId]);

  const updateOwnStatus = useCallback(async (status: string) => {
    const previous = ownStatus;
    setOwnStatus(status);
    const { error } = await supabase
      .from('profiles')
      .update({ activity_status: status })
      .eq('user_id', currentUserId);
    if (error) setOwnStatus(previous);
  }, [currentUserId, ownStatus]);

  const updateOwnMessage = useCallback(async (message: string) => {
    const normalized = message.trim().slice(0, 80) || null;
    const previous = ownMessage;
    setOwnMessage(normalized);
    const { error } = await supabase.from('profiles').update({ activity_message: normalized }).eq('user_id', currentUserId);
    if (error) {
      setOwnMessage(previous);
      return false;
    }
    return true;
  }, [currentUserId, ownMessage]);

  const own = getCallActivityStatus(ownStatus);
  const remote = getCallActivityStatus(participantStatus);
  const OwnIcon = own.Icon;
  const RemoteIcon = remote.Icon;

  return (
    <div className="flex max-w-[min(18rem,calc(100vw-2rem))] flex-col items-start gap-1 text-white" aria-label="Call activity statuses">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 max-w-full gap-2 rounded-full bg-white/[0.08] px-3 text-xs text-white backdrop-blur-2xl hover:bg-white/15 hover:text-white"
            aria-label={`Change your activity. Current activity: ${own.label}`}
          >
            <OwnIcon className="h-3.5 w-3.5 shrink-0" />
             <span className="truncate">You · {ownMessage || own.label}</span>
            <ChevronDown className="h-3 w-3 shrink-0 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          sideOffset={6}
          className="z-[10200] max-h-[min(58dvh,28rem)] w-56 overflow-y-auto border-transparent bg-transparent text-white shadow-none backdrop-blur-2xl"
        >
          {CALL_ACTIVITY_STATUSES.map(status => {
            const Icon = status.Icon;
            return (
              <DropdownMenuItem
                key={status.value}
                onSelect={() => void updateOwnStatus(status.value)}
                className="gap-3 text-white focus:bg-white/10 focus:text-white"
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{status.label}</span>
              </DropdownMenuItem>
            );
          })}
          <div className="sticky bottom-0 bg-transparent p-2 backdrop-blur-2xl">
            <input
              defaultValue={ownMessage || ''}
              maxLength={80}
              aria-label="Custom activity message"
              placeholder="Personal message"
              onKeyDown={event => {
                event.stopPropagation();
                if (event.key === 'Enter') void updateOwnMessage(event.currentTarget.value);
              }}
              onBlur={event => void updateOwnMessage(event.currentTarget.value)}
              className="h-9 w-full border-0 border-b border-white/20 bg-transparent px-2 text-sm text-white outline-none placeholder:text-white/50"
            />
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {participantId && (
        <div
          className="flex h-8 max-w-full items-center gap-2 rounded-full bg-white/[0.08] px-3 text-xs text-white backdrop-blur-2xl"
          aria-label={`${participantName || 'Other person'} activity: ${participantMessage || remote.label}`}
        >
          <RemoteIcon className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{participantName || 'Other person'} · {participantMessage || remote.label}</span>
        </div>
      )}
    </div>
  );
};

export default CallActivityStatusPanel;