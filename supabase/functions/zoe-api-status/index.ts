/**
 * zoe-api-status — the single truthful inventory of every external API M'Mora
 * uses, with real key presence and (optionally) a real live probe per service.
 *
 * This is what Zoe's brain scan and the brain dashboard read, so nothing in the
 * UI is invented: `configured` comes from the actual secret, `probe` comes from
 * an actual HTTP round-trip to the provider.
 *
 *   GET             → inventory + key presence (no outbound calls)
 *   POST {probe:true} → same, plus a live ping per configured service
 */
import { publicGuard } from '../_shared/public-guard.ts';

// deno-lint-ignore no-explicit-any
declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

type Probe = (env: (k: string) => string | undefined) => Promise<Response>;

interface ApiDef {
  id: string;
  label: string;
  provider: string;
  capability: string;
  keyName?: string;
  /** Alternate secret names accepted for the same service. */
  altKeys?: string[];
  edgeFunctions: string[];
  probe?: Probe;
}

const PROBE_TIMEOUT_MS = 8000;

const get = (k: string) => Deno.env.get(k) as string | undefined;

const fetchJson = (url: string, init?: RequestInit) =>
  fetch(url, { ...init, signal: AbortSignal.timeout(PROBE_TIMEOUT_MS) });

const API_DEFS: ApiDef[] = [
  {
    id: 'deepgram',
    label: 'Deepgram voice',
    provider: 'Deepgram',
    capability: "Every word Zoe speaks (text-to-speech) and live speech-to-text.",
    keyName: 'DEEPGRAM_API_KEY',
    edgeFunctions: ['deepgram-tts', 'zoe-realtime-voice'],
    probe: (env) =>
      fetchJson('https://api.deepgram.com/v1/projects', {
        headers: { Authorization: `Token ${env('DEEPGRAM_API_KEY')}` },
      }),
  },
  {
    id: 'assemblyai',
    label: 'AssemblyAI transcription',
    provider: 'AssemblyAI',
    capability: 'Backup transcription and audio understanding.',
    keyName: 'ASSEMBLYAI_API_KEY',
    edgeFunctions: ['assemblyai-tts', 'transcribe-audio'],
    probe: (env) =>
      fetchJson('https://api.assemblyai.com/v2/transcript?limit=1', {
        headers: { authorization: env('ASSEMBLYAI_API_KEY') as string },
      }),
  },
  {
    id: 'groq',
    label: 'Groq inference',
    provider: 'Groq',
    capability: 'Fast reasoning and vision — Zoe\'s first-tier brain.',
    keyName: 'GROQ_API_KEY',
    edgeFunctions: ['zoe-chat', 'zoe-core-intelligence', 'zoe-agent'],
    probe: (env) =>
      fetchJson('https://api.groq.com/openai/v1/models', {
        headers: { Authorization: `Bearer ${env('GROQ_API_KEY')}` },
      }),
  },
  {
    id: 'google-ai-studio',
    label: 'Google AI Studio (Gemini)',
    provider: 'Google',
    capability: 'Long-context reasoning, vision and image editing.',
    keyName: 'GOOGLE_AI_STUDIO_KEY',
    altKeys: ['GEMINI_API_KEY', 'GOOGLE_API_KEY'],
    edgeFunctions: ['zoe-chat', 'zoe-perception', 'edit-image'],
    probe: (env) =>
      fetchJson(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${env('GOOGLE_AI_STUDIO_KEY') ?? env('GEMINI_API_KEY') ?? env('GOOGLE_API_KEY')}`,
      ),
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    provider: 'OpenRouter',
    capability: 'Fallback models when the primary tiers are rate limited.',
    keyName: 'OPENROUTER_API_KEY',
    edgeFunctions: ['zoe-chat', 'generate-image', 'edit-image'],
    probe: (env) =>
      fetchJson('https://openrouter.ai/api/v1/models', {
        headers: { Authorization: `Bearer ${env('OPENROUTER_API_KEY')}` },
      }),
  },
  {
    id: 'pollinations',
    label: 'Pollinations images',
    provider: 'Pollinations',
    capability: 'Image generation and photo editing.',
    keyName: 'POLLINATIONS_API_KEY',
    altKeys: ['POLLINATIONS_TOKEN', 'POLLINATIONS_KEY'],
    edgeFunctions: ['pollinations-image', 'generate-image', 'edit-image'],
    probe: () => fetchJson('https://image.pollinations.ai/models'),
  },
  {
    id: 'nvidia',
    label: 'NVIDIA NIM',
    provider: 'NVIDIA',
    capability: 'Specialist model tier used by audits and heavy reasoning.',
    keyName: 'NVIDIA_API_KEY',
    edgeFunctions: ['nvidia-audit'],
    probe: (env) =>
      fetchJson('https://integrate.api.nvidia.com/v1/models', {
        headers: { Authorization: `Bearer ${env('NVIDIA_API_KEY')}` },
      }),
  },
  {
    id: 'cohere',
    label: 'Cohere embeddings',
    provider: 'Cohere',
    capability: 'Embeddings and reranking for DHF / Omni-Graph search.',
    keyName: 'COHERE_API_KEY',
    edgeFunctions: ['zoe-index-ingest', 'zoe-search-indexer'],
    probe: (env) =>
      fetchJson('https://api.cohere.com/v1/models', {
        headers: { Authorization: `Bearer ${env('COHERE_API_KEY')}` },
      }),
  },
  {
    id: 'youtube',
    label: 'YouTube Data API',
    provider: 'Google',
    capability: 'Watching and summarising YouTube links you paste.',
    keyName: 'YOUTUBE_API_KEY',
    edgeFunctions: ['analyze-youtube'],
    probe: (env) =>
      fetchJson(`https://www.googleapis.com/youtube/v3/videos?part=id&id=dQw4w9WgXcQ&key=${env('YOUTUBE_API_KEY')}`),
  },
  {
    id: 'mapbox',
    label: 'Mapbox',
    provider: 'Mapbox',
    capability: 'Maps, geocoding and the globe navigation surface.',
    keyName: 'MAPBOX_PUBLIC_TOKEN',
    edgeFunctions: ['get-mapbox-token', 'get-user-location'],
    probe: (env) =>
      fetchJson(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/london.json?limit=1&access_token=${env('MAPBOX_PUBLIC_TOKEN')}`,
      ),
  },
  {
    id: 'resend',
    label: 'Resend email',
    provider: 'Resend',
    capability: 'Outbound email — invites, alerts, growth digests.',
    keyName: 'RESEND_API_KEY',
    edgeFunctions: ['beta-invite', 'bug-report-pipeline', 'growth-dispatch'],
    probe: (env) =>
      fetchJson('https://api.resend.com/domains', {
        headers: { Authorization: `Bearer ${env('RESEND_API_KEY')}` },
      }),
  },
  {
    id: 'twilio',
    label: 'Twilio SMS',
    provider: 'Twilio',
    capability: 'SMS notifications and phone verification.',
    keyName: 'TWILIO_ACCOUNT_SID',
    edgeFunctions: ['divine-notification'],
    probe: (env) =>
      fetchJson(`https://api.twilio.com/2010-04-01/Accounts/${env('TWILIO_ACCOUNT_SID')}.json`, {
        headers: {
          Authorization: `Basic ${btoa(`${env('TWILIO_ACCOUNT_SID')}:${env('TWILIO_AUTH_TOKEN')}`)}`,
        },
      }),
  },
  {
    id: 'slack',
    label: 'Slack alerts',
    provider: 'Slack',
    capability: 'Operational alerts to the team channel.',
    keyName: 'SLACK_BOT_TOKEN',
    altKeys: ['SLACK_API_KEY'],
    edgeFunctions: ['astro-dispatch', 'sentinel-guard'],
    probe: (env) =>
      fetchJson('https://slack.com/api/auth.test', {
        method: 'POST',
        headers: { Authorization: `Bearer ${env('SLACK_BOT_TOKEN') ?? env('SLACK_API_KEY')}` },
      }),
  },
  {
    id: 'serpapi',
    label: 'SerpAPI search',
    provider: 'SerpAPI',
    capability: 'Structured search results when the keyless sources are thin.',
    keyName: 'SERPAPI_KEY',
    edgeFunctions: ['external-search'],
    probe: (env) => fetchJson(`https://serpapi.com/account?api_key=${env('SERPAPI_KEY')}`),
  },
  {
    id: 'turnstile',
    label: 'Cloudflare Turnstile',
    provider: 'Cloudflare',
    capability: 'Bot defence on sign-up and public forms.',
    keyName: 'TURNSTILE_SECRET_KEY',
    edgeFunctions: ['signup-security'],
  },
  {
    id: 'open-meteo',
    label: 'Open-Meteo weather',
    provider: 'Open-Meteo (keyless)',
    capability: 'Live weather, air quality and geocoding in Zoe\'s answers.',
    edgeFunctions: ['zoe-chat', 'zoe-ambient-search'],
    probe: () => fetchJson('https://api.open-meteo.com/v1/forecast?latitude=51.5&longitude=-0.12&current=temperature_2m'),
  },
  {
    id: 'opensky',
    label: 'OpenSky flights',
    provider: 'OpenSky Network (keyless)',
    capability: 'Live aircraft positions for the globe and flight questions.',
    edgeFunctions: ['opensky-proxy', 'opensky-states'],
    probe: () =>
      fetchJson('https://opensky-network.org/api/states/all?lamin=51.0&lomin=-0.5&lamax=51.7&lomax=0.3'),
  },
  {
    id: 'wikipedia',
    label: 'Wikipedia',
    provider: 'Wikimedia (keyless)',
    capability: 'Encyclopedic grounding with citations.',
    edgeFunctions: ['external-search', 'zoe-core-intelligence'],
    probe: () => fetchJson('https://en.wikipedia.org/api/rest_v1/page/summary/Singapore'),
  },
  {
    id: 'duckduckgo',
    label: 'DuckDuckGo instant answers',
    provider: 'DuckDuckGo (keyless)',
    capability: 'Open-web grounding for questions beyond M\'Mora.',
    edgeFunctions: ['external-search', 'web-reader'],
    probe: () => fetchJson('https://api.duckduckgo.com/?q=mmora&format=json&no_html=1'),
  },
  {
    id: 'gdelt',
    label: 'GDELT news index',
    provider: 'GDELT (keyless)',
    capability: 'World news and event grounding.',
    edgeFunctions: ['external-search'],
    probe: () =>
      fetchJson('https://api.gdeltproject.org/api/v2/doc/doc?query=technology&mode=artlist&maxrecords=1&format=json'),
  },
  {
    id: 'google-news-rss',
    label: 'Google News RSS',
    provider: 'Google (keyless)',
    capability: 'Freshest headlines when GDELT lags.',
    edgeFunctions: ['external-search', 'zoe-core-intelligence'],
    probe: () => fetchJson('https://news.google.com/rss/search?q=technology&hl=en-US&gl=US&ceid=US:en'),
  },
  {
    id: 'swiss-ephemeris',
    label: 'Swiss Ephemeris (WASM)',
    provider: 'Astrodienst (in-process)',
    capability: 'Exact planetary positions behind dasha, transit and jathakam answers.',
    edgeFunctions: ['vedic-ephemeris', 'astro-dispatch'],
    probe: () => fetchJson('https://unpkg.com/sweph-wasm@2.6.9/package.json'),
  },
];

function resolveKey(def: ApiDef): { keyName?: string; configured: boolean } {
  if (!def.keyName) return { configured: true };
  const names = [def.keyName, ...(def.altKeys ?? [])];
  const found = names.find((n) => !!get(n));
  return { keyName: found ?? def.keyName, configured: !!found };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const guard = await publicGuard(req, { name: 'zoe-api-status', limit: 30, windowSeconds: 60 });
  if (guard.response) return guard.response;

  const wantProbe = req.method !== 'GET' && (guard.body as { probe?: boolean }).probe !== false;

  const apis = await Promise.all(
    API_DEFS.map(async (def) => {
      const { keyName, configured } = resolveKey(def);
      const base = {
        id: def.id,
        label: def.label,
        provider: def.provider,
        capability: def.capability,
        keyless: !def.keyName,
        keyName,
        configured,
        edgeFunctions: def.edgeFunctions,
      };

      if (!wantProbe || !def.probe || !configured) {
        return {
          ...base,
          probe: {
            ran: false,
            ok: null as boolean | null,
            status: null as number | null,
            latencyMs: null as number | null,
            detail: !configured ? 'secret not set' : !def.probe ? 'no live probe for this service' : 'probe skipped',
          },
        };
      }

      const t0 = Date.now();
      try {
        const res = await def.probe(get);
        const ok = res.ok || res.status === 429; // 429 = reachable, rate limited
        let detail = ok ? 'reachable' : `HTTP ${res.status}`;
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          if (text) detail = `HTTP ${res.status}: ${text.slice(0, 160)}`;
        }
        return {
          ...base,
          probe: { ran: true, ok, status: res.status, latencyMs: Date.now() - t0, detail },
        };
      } catch (err) {
        return {
          ...base,
          probe: {
            ran: true,
            ok: false,
            status: null,
            latencyMs: Date.now() - t0,
            detail: err instanceof Error ? err.message : String(err),
          },
        };
      }
    }),
  );

  const summary = {
    total: apis.length,
    configured: apis.filter((a) => a.configured).length,
    missingKey: apis.filter((a) => !a.configured).map((a) => a.id),
    probed: apis.filter((a) => a.probe.ran).length,
    failing: apis.filter((a) => a.probe.ran && a.probe.ok === false).map((a) => a.id),
  };

  return new Response(JSON.stringify({ ok: true, checkedAt: new Date().toISOString(), apis, summary }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
