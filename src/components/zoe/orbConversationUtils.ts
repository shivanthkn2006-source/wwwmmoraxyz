import { format, isToday, isYesterday } from 'date-fns';

/** Format a message timestamp for the orb conversation transcript. */
export const formatMessageTime = (date: Date | string | undefined): string => {
  if (!date) return '';
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '';
    if (isToday(d)) {
      return format(d, 'h:mm a');
    } else if (isYesterday(d)) {
      return `Yesterday ${format(d, 'h:mm a')}`;
    }
    return format(d, 'MMM d, h:mm a');
  } catch {
    return '';
  }
};

/** Relationship command patterns that should be executed as commands, not chat. */
export const RELATIONSHIP_COMMAND_PATTERNS = [
  /^(?:zoe\s+)?(?:inform|tell|message|notify|remind)\s+(?:my\s+)?(son|daughter|wife|husband|father|mother|dad|mom|brother|sister|grandpa|grandma|grandfather|grandmother|uncle|aunt|cousin|friend|partner)\s+(?:to|that|about)?\s*.+$/i,
  /^(?:zoe\s+)?(?:send|text)\s+(?:my\s+)?(son|daughter|wife|husband|father|mother|dad|mom|brother|sister|friend|partner)$/i,
  /^(?:zoe\s+)?(?:ask|tell|remind)\s+(?:my\s+)?(son|daughter|wife|husband|father|mother|dad|mom|brother|sister|friend|partner)\s+to\s+call\s+(?:me|back)$/i,
];

export const isRelationshipCommand = (text: string): boolean =>
  RELATIONSHIP_COMMAND_PATTERNS.some((pattern) => pattern.test(text.trim()));

/** Relative "time ago" label shared by Zoe surfaces. */
export const getTimeAgo = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return date.toLocaleDateString();
};
