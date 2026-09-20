import { useEffect, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  CALL_ACTIVITY_STATUSES,
  getCallActivityStatus,
} from '@/features/calls/callActivityStatuses';

interface ActivityStatusPickerProps {
  status: string;
  onChange: (status: string) => void;
  customMessage?: string | null;
  onCustomMessageChange?: (message: string) => Promise<boolean> | boolean;
  showLabel?: boolean;
}

/** Plain white line icon activity picker on transparent glass. No outer frame. */
export const ActivityStatusPicker = ({
  status,
  onChange,
  customMessage,
  onCustomMessageChange,
  showLabel = false,
}: ActivityStatusPickerProps) => {
  const current = getCallActivityStatus(status);
  const Icon = current.Icon;
  const [draft, setDraft] = useState(customMessage || '');

  useEffect(() => setDraft(customMessage || ''), [customMessage]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Your activity: ${customMessage || current.label}. Change activity`}
        className="flex items-center gap-2 rounded-full px-2 py-1 text-white/80 outline-none transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-1 focus-visible:ring-white/40"
      >
        <Icon className="h-4 w-4 shrink-0" />
        {showLabel && <span className="max-w-32 truncate text-xs">{customMessage || current.label}</span>}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={6}
        className="z-[10200] max-h-[min(58dvh,26rem)] w-56 overflow-y-auto border-transparent bg-transparent text-white shadow-none backdrop-blur-2xl"
      >
        {CALL_ACTIVITY_STATUSES.map(entry => {
          const EntryIcon = entry.Icon;
          return (
            <DropdownMenuItem
              key={entry.value}
              onSelect={() => onChange(entry.value)}
              className="gap-3 text-white focus:bg-white/10 focus:text-white"
            >
              <EntryIcon className="h-4 w-4 shrink-0" />
              <span>{entry.label}</span>
            </DropdownMenuItem>
          );
        })}
        {onCustomMessageChange && (
          <div className="sticky bottom-0 flex gap-2 bg-transparent p-2 backdrop-blur-2xl" onKeyDown={event => event.stopPropagation()}>
            <MessageCircle className="mt-2 h-4 w-4 shrink-0 text-white/80" aria-hidden />
            <div className="min-w-0 flex-1">
              <input
                value={draft}
                onChange={event => setDraft(event.target.value.slice(0, 80))}
                onKeyDown={event => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    void onCustomMessageChange(draft);
                  }
                }}
                maxLength={80}
                aria-label="Custom activity message"
                placeholder="Personal message"
                className="h-8 w-full border-0 border-b border-white/20 bg-transparent px-1 text-sm text-white outline-none placeholder:text-white/50 focus:border-white/60"
              />
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[10px] text-white/50">{draft.length}/80</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-white hover:bg-white/10 hover:text-white"
                  onClick={() => void onCustomMessageChange(draft)}
                >
                  Save
                </Button>
              </div>
            </div>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ActivityStatusPicker;
