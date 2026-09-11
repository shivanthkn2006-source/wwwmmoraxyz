/**
 * Zoe's first-launch greeting film.
 *
 * A short video replaces the old spoken "I am Zoe Sovereign AI" line. It plays
 * full screen exactly once per person, can be minimised to a picture-in-picture
 * tile, and disappears when it ends. Everything is data-driven here so the file
 * can be swapped without touching the player.
 */

import zoeGreetingAsset from '@/assets/video/zoe-greeting.mp4.asset.json';

/** Ordered candidates — the first one that loads is used. */
export const ZOE_GREETING_SOURCES = [zoeGreetingAsset.url, '/videos/avatar-zoe-happy.mp4'] as const;

/** Poster shown while the first frame decodes. */
export const ZOE_GREETING_POSTER = '/placeholder.svg';

/** Hard ceiling: the overlay always closes itself, even if the file stalls.
 *  The greeting film runs ~36s, so allow it to finish before the watchdog. */
export const ZOE_GREETING_MAX_MS = 60_000;

/** Per-account seen marker. */
export function zoeGreetingSeenKey(userId?: string | null): string {
  return `mmora.zoe.greetingFilmSeen.${userId ?? 'anon'}`;
}

export function hasSeenZoeGreeting(userId?: string | null): boolean {
  try {
    return localStorage.getItem(zoeGreetingSeenKey(userId)) === '1';
  } catch {
    return true; // storage blocked: never loop the film
  }
}

export function markZoeGreetingSeen(userId?: string | null): void {
  try {
    localStorage.setItem(zoeGreetingSeenKey(userId), '1');
  } catch {
    /* private mode */
  }
}
