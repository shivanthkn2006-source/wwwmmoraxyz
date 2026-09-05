/**
 * Client view of Zoe's external API inventory.
 *
 * The list itself is served by the `zoe-api-status` edge function so key
 * presence and live reachability are real, never hard-coded in the UI. This
 * module only caches it and gives Zoe/dashboard helpers on top.
 */
import { supabase } from '@/integrations/supabase/client';

export interface ApiProbe {
  ran: boolean;
  ok: boolean | null;
  status: number | null;
  latencyMs: number | null;
  detail: string;
}

export interface ApiStatusEntry {
  id: string;
  label: string;
  provider: string;
  capability: string;
  keyless: boolean;
  keyName?: string;
  configured: boolean;
  edgeFunctions: string[];
  probe: ApiProbe;
}

export interface ApiStatusReport {
  checkedAt: string;
  apis: ApiStatusEntry[];
  summary: {
    total: number;
    configured: number;
    missingKey: string[];
    probed: number;
    failing: string[];
  };
}

/** Search words that map a plain sentence onto an API in the registry. */
const KEYWORDS: Record<string, string[]> = {
  deepgram: ['deepgram', 'voice', 'speak', 'tts', 'text to speech', 'your voice'],
  assemblyai: ['assembly', 'assemblyai', 'transcribe', 'transcription', 'subtitle'],
  groq: ['groq'],
  'google-ai-studio': ['gemini', 'google ai', 'ai studio'],
  openrouter: ['openrouter', 'open router'],
  pollinations: ['pollinations', 'image generation', 'generate image', 'make an image', 'edit photo'],
  nvidia: ['nvidia', 'nim'],
  cohere: ['cohere', 'embedding', 'rerank'],
  youtube: ['youtube', 'video link', 'watch video'],
  mapbox: ['mapbox', 'map', 'globe', 'geocode'],
  resend: ['resend', 'email', 'mail'],
  twilio: ['twilio', 'sms', 'text message'],
  slack: ['slack'],
  serpapi: ['serpapi', 'serp'],
  turnstile: ['turnstile', 'captcha', 'bot protection'],
  'open-meteo': ['weather', 'temperature', 'forecast', 'air quality', 'open-meteo', 'open meteo'],
  opensky: ['opensky', 'flight', 'flights', 'aircraft', 'plane'],
  wikipedia: ['wikipedia', 'wiki'],
  duckduckgo: ['duckduckgo', 'duck duck go', 'web search', 'search the web'],
  gdelt: ['gdelt'],
  'google-news-rss': ['news', 'headline', 'headlines'],
  'swiss-ephemeris': ['ephemeris', 'swiss', 'astrology', 'planet', 'dasha', 'transit', 'jathakam', 'horoscope'],
};

let cache: { at: number; report: ApiStatusReport } | null = null;
const TTL_MS = 60_000;

export async function fetchApiStatus(opts?: { probe?: boolean; force?: boolean }): Promise<ApiStatusReport> {
  const probe = opts?.probe !== false;
  if (!opts?.force && cache && Date.now() - cache.at < TTL_MS) return cache.report;

  const { data, error } = await supabase.functions.invoke('zoe-api-status', { body: { probe } });
  if (error) throw error;
  const report = data as ApiStatusReport;
  cache = { at: Date.now(), report };
  // Persist failures so the health page can show when each service last broke.
  try {
    const { recordApiReport } = await import('./apiFailureLog');
    recordApiReport(report);
  } catch {
    /* history is best effort */
  }
  return report;
}


export function getCachedApiStatus(): ApiStatusReport | null {
  return cache?.report ?? null;
}

/** Returns the APIs a sentence is asking about (empty when it is a general question). */
export function matchApis(text: string, apis: ApiStatusEntry[]): ApiStatusEntry[] {
  const t = ` ${(text || '').toLowerCase()} `;
  const hits = new Set<string>();
  for (const [id, words] of Object.entries(KEYWORDS)) {
    if (words.some((w) => t.includes(` ${w} `) || t.includes(`${w},`) || t.includes(`${w}?`) || t.includes(`${w}.`) || t.includes(` ${w}`))) {
      hits.add(id);
    }
  }
  return apis.filter((a) => hits.has(a.id));
}

export function apiHealthWord(a: ApiStatusEntry): 'live' | 'configured' | 'failing' | 'missing' {
  if (!a.configured) return 'missing';
  if (a.probe.ran && a.probe.ok === false) return 'failing';
  if (a.probe.ran && a.probe.ok) return 'live';
  return 'configured';
}
