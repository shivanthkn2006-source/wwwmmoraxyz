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
  showLabel?: boolean;
}

/** Plain white line icon activity picker on transparent glass. No outer frame. */
export const ActivityStatusPicker = ({ status, onChange, showLabel = false }: ActivityStatusPickerProps) => {
  const current = getCallActivityStatus(status);
  const Icon = current.Icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Your activity: ${current.label}. Change activity`}
        className="flex items-center gap-2 rounded-full px-2 py-1 text-white/80 outline-none transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-1 focus-visible:ring-white/40"
      >
        <Icon className="h-4 w-4 shrink-0" />
        {showLabel && <span className="truncate text-xs">{current.label}</span>}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={6}
        className="z-[10200] max-h-[min(58dvh,26rem)] w-48 overflow-y-auto border-white/10 bg-background/60 text-foreground backdrop-blur-2xl"
      >
        {CALL_ACTIVITY_STATUSES.map(entry => {
          const EntryIcon = entry.Icon;
          return (
            <DropdownMenuItem
              key={entry.value}
              onSelect={() => onChange(entry.value)}
              className="gap-3 text-foreground focus:bg-foreground/10 focus:text-foreground"
            >
              <EntryIcon className="h-4 w-4 shrink-0" />
              <span>{entry.label}</span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ActivityStatusPicker;
