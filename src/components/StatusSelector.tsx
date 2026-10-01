import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CircleOff } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth';
import { getCallActivityStatus } from '@/features/calls/callActivityStatuses';
import { useActivityStatuses } from '@/features/calls/useActivityStatuses';

interface StatusSelectorProps {
  currentStatus: string;
  onStatusChange: (status: string) => void;
}

const STATUSES = [
  'away', 'cooking', 'dining', 'driving', 'family_time', 'farming',
  'fitness', 'gaming', 'library', 'meditation', 'movie', 'online',
  'party', 'play', 'sleep', 'sports', 'studying', 'transit',
  'traveling', 'tv', 'vacation', 'work', 'yoga', 'offline',
];
const NO_PEERS: string[] = [];

const labelOf = (s: string) => s.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
const iconOf = (s: string) => (s === 'offline' ? CircleOff : getCallActivityStatus(s).Icon);

/** Same universal status symbols + custom status message as Messages and Calls. */
const StatusSelector: React.FC<StatusSelectorProps> = ({ currentStatus, onStatusChange }) => {
  const { user } = useAuth();
  const { ownMessage, setOwnMessage } = useActivityStatuses(user?.id ?? null, NO_PEERS);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  useEffect(() => { setDraft(ownMessage ?? ''); }, [ownMessage]);

  const current = currentStatus && currentStatus !== 'none' ? currentStatus : 'online';
  const CurrentIcon = iconOf(current);

  const saveMessage = async () => {
    if ((draft.trim() || null) === (ownMessage ?? null)) return;
    const ok = await setOwnMessage(draft);
    if (ok) toast.success(draft.trim() ? 'Custom status saved' : 'Custom status cleared');
    else toast.error('Failed to save custom status');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" className="gap-2 max-w-[11rem]" aria-label="Change your status">
          <CurrentIcon className="w-4 h-4 shrink-0" aria-hidden />
          <span className="truncate">{ownMessage?.trim() || labelOf(current)}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="surface-warm-tan w-56 max-h-[400px] overflow-y-auto border-0 shadow-none p-2">
        <div className="space-y-1">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, 80))}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void saveMessage(); setOpen(false); } }}
            onBlur={() => void saveMessage()}
            placeholder="Custom status message…"
            maxLength={80}
            aria-label="Custom status message"
            className="w-full bg-transparent border-0 outline-none text-sm text-white placeholder:text-white/60 px-3 py-2"
          />
          {STATUSES.map((s) => {
            const Icon = iconOf(s);
            return (
              <Button
                key={s}
                variant="ghost"
                className="w-full justify-start bg-transparent text-white hover:bg-transparent hover:text-white focus-visible:ring-0"
                onClick={() => { onStatusChange(s); setOpen(false); }}
              >
                <Icon className="w-4 h-4 mr-2" aria-hidden />
                {labelOf(s)}
              </Button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default StatusSelector;
