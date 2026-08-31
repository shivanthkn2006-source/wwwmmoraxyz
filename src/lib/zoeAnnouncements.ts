/**
 * Zoe spoken announcements for platform notifications.
 *
 * Kept tiny and dependency-free so it can be unit-tested and reused by any
 * surface that needs "Zoe says what just happened".
 */
const KEY = 'mmora.zoe.announcements.enabled';

export function isZoeAnnouncementsEnabled(): boolean {
  try {
    return window.localStorage.getItem(KEY) !== '0';
  } catch {
    return true;
  }
}

export function setZoeAnnouncementsEnabled(enabled: boolean): void {
  try {
    window.localStorage.setItem(KEY, enabled ? '1' : '0');
  } catch {
    /* private mode */
  }
}

/**
 * Builds the sentence Zoe speaks. The toast description carries
 * "date · time · feature · from X · content"; speech only needs the human
 * parts, so timestamps are dropped and separators become natural pauses.
 */
export function buildAnnouncementSpeech(title: string, description?: string | null): string {
  const parts = (description ?? '')
    .split('·')
    .map((p) => p.trim())
    .filter(Boolean)
    // drop the leading date/time stamp segments
    .filter((p) => !/^\d/.test(p) && !/^(today|yesterday)\b/i.test(p));
  const tail = parts.join('. ');
  return tail ? `${title}. ${tail}.` : `${title}.`;
}
