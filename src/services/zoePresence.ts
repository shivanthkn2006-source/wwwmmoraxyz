/**
 * Zoe presence: where the member is, right now, with no waiting.
 *
 * Two kinds of "where": the page they are standing on inside M'Mora, and the
 * city they are dialling in from. The city comes from the server's IP lookup,
 * which needs no browser permission prompt and is fetched once per session and
 * cached — so by the time someone says "hey Zoe", the answer is already in
 * memory and the greeting is instant instead of waiting on a network round-trip.
 *
 * Honesty rule: when the lookup has not landed or failed, the greeting simply
 * drops the city. It never guesses a place.
 */

import { supabase } from '@/integrations/supabase/client';
import { pageContextLine, resolvePageTitle } from '@/config/siteMap';

export interface ZoePresenceLocation {
  city: string | null;
  region: string | null;
  country: string | null;
}

const CACHE_KEY = 'mmora.zoe.presence.location';
const EMPTY: ZoePresenceLocation = { city: null, region: null, country: null };

let cached: ZoePresenceLocation | null = null;
let inFlight: Promise<ZoePresenceLocation> | null = null;

function readSession(): ZoePresenceLocation | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as ZoePresenceLocation) : null;
  } catch {
    return null;
  }
}

function writeSession(value: ZoePresenceLocation) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(value));
  } catch {
    /* private mode — in-memory cache still applies */
  }
}

/** Kick off the lookup early (app start) so wake-word replies never wait. */
export function prefetchPresenceLocation(): void {
  void getPresenceLocation();
}

/** Resolve the member's coarse location, cached for the session. */
export async function getPresenceLocation(): Promise<ZoePresenceLocation> {
  if (cached) return cached;
  const stored = readSession();
  if (stored) {
    cached = stored;
    return stored;
  }
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-user-location');
      if (error || !data) return EMPTY;
      const value: ZoePresenceLocation = {
        city: typeof data.city === 'string' && data.city !== 'Unknown' ? data.city : null,
        region: typeof data.region === 'string' ? data.region : null,
        country: typeof data.country === 'string' ? data.country : null,
      };
      cached = value;
      if (value.city) writeSession(value);
      return value;
    } catch {
      return EMPTY;
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

/** Whatever location is already known, with zero waiting. */
export function getCachedPresenceLocation(): ZoePresenceLocation {
  return cached ?? readSession() ?? EMPTY;
}

/**
 * The spoken line Zoe opens with on a wake word: which page they are on, the
 * city when known, and an offer to help. Built from cache so it is immediate.
 */
export function buildWakeGreeting(pathname: string, firstName?: string | null): string {
  const page = resolvePageTitle(pathname);
  const { city } = getCachedPresenceLocation();
  const who = firstName ? `, ${firstName}` : '';
  const place = page ? `You're on ${page}` : `You're here`;
  const where = city ? ` in ${city}` : '';
  return `${place}${where}${who}. What can I help you with?`;
}

/** Context sentence handed to the model so answers match the current page. */
export function buildPresenceContext(pathname: string): string {
  const { city, country } = getCachedPresenceLocation();
  const parts = [`Member is currently on the "${resolvePageTitle(pathname) || pathname}" page (${pathname}).`];
  const line = pageContextLine(pathname);
  if (line) parts.push(line);
  if (city) parts.push(`Approximate location from network: ${[city, country].filter(Boolean).join(', ')}.`);
  return parts.join(' ');
}
