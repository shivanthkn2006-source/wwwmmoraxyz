// Remembers every short uploaded from /home in the M'mora orb memory:
// - a local offline cache so shorts survive reloads and load without network
// - a best-effort write to the unified Zoe memory bridge (sovereign + gateway)

import { rememberZoeRound } from '@/services/zoeMemoryBridge';

export interface RememberedShort {
  postId: string;
  mediaUrl?: string | null;
  posterUrl?: string | null;
  mediaType?: string | null;
  content?: string | null;
  createdAt: string;
}

const CACHE_KEY = 'mmora.orb.shorts.v1';
const MAX_CACHED = 60;
export const ORB_SHORTS_EVENT = 'mmora:orb-shorts-changed';

export function getCachedShorts(): RememberedShort[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    const parsed = raw ? (JSON.parse(raw) as RememberedShort[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCache(shorts: RememberedShort[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(shorts.slice(0, MAX_CACHED)));
    window.dispatchEvent(new CustomEvent(ORB_SHORTS_EVENT, { detail: shorts }));
  } catch {
    /* quota — ignore */
  }
}

export async function rememberShortInOrbMemory(
  short: RememberedShort,
  userId?: string | null,
): Promise<void> {
  const existing = getCachedShorts().filter((s) => s.postId !== short.postId);
  writeCache([short, ...existing]);

  try {
    await rememberZoeRound({
      userId: userId ?? undefined,
      sessionKey: `mmora-shorts-${userId || 'guest'}`,
      userText: `I posted a short video${short.content ? `: ${short.content}` : ''}`,
      assistantText: `Saved short ${short.postId} (${short.mediaType || 'video'}) at ${short.mediaUrl || 'unknown url'}`,
    });
  } catch {
    /* offline — the local cache already holds it */
  }
}
