/**
 * Edit-image reference downloads accept only the reviewed origins members'
 * reference photos actually come from: this backend's own storage objects and
 * Google account avatars. Anything else is refused before any network call.
 */
const GOOGLE_AVATAR_ORIGIN = 'https://lh3.googleusercontent.com';

export function editReferenceUrl(raw: unknown, backendUrl: string | undefined): string | null {
  if (typeof raw !== 'string' || !raw) return null;
  let url: URL;
  try { url = new URL(raw); } catch { return null; }
  if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
  if (url.origin === GOOGLE_AVATAR_ORIGIN) return url.href;
  let backend: URL | null = null;
  try { backend = backendUrl ? new URL(backendUrl) : null; } catch { backend = null; }
  if (backend && backend.protocol === 'https:' && !backend.port && url.origin === backend.origin
    && url.pathname.startsWith('/storage/v1/object/')) return url.href;
  return null;
}
