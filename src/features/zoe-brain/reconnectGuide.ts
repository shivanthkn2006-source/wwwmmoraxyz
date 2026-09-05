/**
 * How to fix each integration yourself.
 *
 * Plain, provider-specific steps shown on the brain health page next to a
 * failing or unconnected service. Nothing here calls anything — it is the
 * repair manual for the person reading the page.
 */
export interface ReconnectGuide {
  /** Where the credential comes from. */
  where: string;
  /** Ordered, do-this steps. */
  steps: string[];
  /** Direct link to the provider's key page, when there is one. */
  link?: string;
  /** The secret name the platform expects. */
  secret?: string;
}

const GENERIC: ReconnectGuide = {
  where: 'The provider dashboard',
  steps: [
    'Open the provider account and create a fresh key.',
    'Ask Zoe (or your builder) to save it as a project secret with the exact name shown above.',
    'Come back here and press "Re-probe APIs" — the row should turn green.',
  ],
};

export const RECONNECT_GUIDES: Record<string, ReconnectGuide> = {
  deepgram: {
    where: 'console.deepgram.com → API Keys',
    link: 'https://console.deepgram.com/',
    secret: 'DEEPGRAM_API_KEY',
    steps: [
      'Sign in to the Deepgram console and check the balance — an empty balance returns 401/402 on every voice call.',
      'Create a new API key with "Member" permissions.',
      'Save it as DEEPGRAM_API_KEY, then re-probe. Zoe\'s voice depends only on this key.',
    ],
  },
  assemblyai: {
    where: 'assemblyai.com → Dashboard → API key',
    link: 'https://www.assemblyai.com/app/account',
    secret: 'ASSEMBLYAI_API_KEY',
    steps: [
      'Copy the API key from the AssemblyAI dashboard home.',
      'Save it as ASSEMBLYAI_API_KEY.',
      'Re-probe. This is only the backup transcriber; Deepgram stays primary.',
    ],
  },
  groq: {
    where: 'console.groq.com → API Keys',
    link: 'https://console.groq.com/keys',
    secret: 'GROQ_API_KEY',
    steps: [
      'Create a key in the Groq console.',
      'Save it as GROQ_API_KEY.',
      'A 429 here is a rate limit, not a broken key — Zoe rolls over to the next tier automatically.',
    ],
  },
  'google-ai-studio': {
    where: 'aistudio.google.com → Get API key',
    link: 'https://aistudio.google.com/app/apikey',
    secret: 'GOOGLE_AI_STUDIO_KEY',
    steps: [
      'Create a key in Google AI Studio (free tier is fine for text, image editing needs billing enabled).',
      'Save it as GOOGLE_AI_STUDIO_KEY.',
      'If image edits return 429, enable billing on the Google Cloud project behind the key.',
    ],
  },
  openrouter: {
    where: 'openrouter.ai → Keys',
    link: 'https://openrouter.ai/keys',
    secret: 'OPENROUTER_API_KEY',
    steps: [
      'Top up the OpenRouter balance — a zero balance returns 402 on image models.',
      'Create a key and save it as OPENROUTER_API_KEY.',
      'Re-probe; this tier catches everything the primaries drop.',
    ],
  },
  pollinations: {
    where: 'auth.pollinations.ai → tokens',
    link: 'https://auth.pollinations.ai/',
    secret: 'POLLINATIONS_API_KEY',
    steps: [
      'Sign in at auth.pollinations.ai and check credits — 402 means the balance ran out.',
      'Create a token and save it as POLLINATIONS_API_KEY.',
      'Re-probe. This powers image generation and identity photo editing.',
    ],
  },
  nvidia: {
    where: 'build.nvidia.com → API keys',
    link: 'https://build.nvidia.com/',
    secret: 'NVIDIA_API_KEY',
    steps: ['Generate a NIM key on build.nvidia.com.', 'Save it as NVIDIA_API_KEY.', 'Re-probe.'],
  },
  cohere: {
    where: 'dashboard.cohere.com → API keys',
    link: 'https://dashboard.cohere.com/api-keys',
    secret: 'COHERE_API_KEY',
    steps: [
      'Create a production key in the Cohere dashboard.',
      'Save it as COHERE_API_KEY.',
      'Without it, search falls back to keyword matching instead of embeddings.',
    ],
  },
  youtube: {
    where: 'Google Cloud console → YouTube Data API v3',
    link: 'https://console.cloud.google.com/apis/library/youtube.googleapis.com',
    secret: 'YOUTUBE_API_KEY',
    steps: [
      'Enable YouTube Data API v3 on your Google Cloud project.',
      'Create an API key restricted to that API and save it as YOUTUBE_API_KEY.',
      '403 usually means the daily quota is spent — it resets at midnight Pacific.',
    ],
  },
  mapbox: {
    where: 'account.mapbox.com → Access tokens',
    link: 'https://account.mapbox.com/access-tokens/',
    secret: 'MAPBOX_PUBLIC_TOKEN',
    steps: [
      'Copy the default public token (starts with pk.).',
      'Save it as MAPBOX_PUBLIC_TOKEN.',
      'Re-probe — the globe and geocoding light up immediately.',
    ],
  },
  resend: {
    where: 'resend.com → API Keys',
    link: 'https://resend.com/api-keys',
    secret: 'RESEND_API_KEY',
    steps: ['Create a sending key in Resend.', 'Save it as RESEND_API_KEY.', 'Verify your sending domain or mail stays in test mode.'],
  },
  twilio: {
    where: 'console.twilio.com → Account Info',
    link: 'https://console.twilio.com/',
    secret: 'TWILIO_AUTH_TOKEN',
    steps: [
      'Copy the Account SID and Auth Token from the Twilio console home.',
      'Save them as TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.',
      'Both are required — one alone returns 401.',
    ],
  },
  slack: {
    where: 'Lovable connectors (recommended) or api.slack.com/apps',
    link: 'https://api.slack.com/apps',
    secret: 'SLACK_API_KEY',
    steps: [
      'Easiest: ask Zoe to connect Slack — the connector saves SLACK_API_KEY for you.',
      'Manual route: create a Slack app, add the chat:write / channels:read scopes, install it, and save the bot token as SLACK_BOT_TOKEN.',
      'Re-probe — Zoe can then read and post in the channels she is invited to.',
    ],
  },
  serpapi: {
    where: 'serpapi.com → Your Account → API Key',
    link: 'https://serpapi.com/manage-api-key',
    secret: 'SERPAPI_KEY',
    steps: [
      'Sign in to SerpAPI and copy the private API key (the free plan gives 100 searches a month).',
      'Save it as SERPAPI_KEY.',
      'Re-probe — Zoe then uses real Google results and shopping prices instead of the keyless fallbacks.',
    ],
  },
  turnstile: {
    where: 'Cloudflare dashboard → Turnstile',
    link: 'https://dash.cloudflare.com/?to=/:account/turnstile',
    secret: 'TURNSTILE_SECRET_KEY',
    steps: ['Create a Turnstile widget for your domain.', 'Save the secret as TURNSTILE_SECRET_KEY.', 'Re-probe.'],
  },
};

export const KEYLESS_NOTE: ReconnectGuide = {
  where: 'No key needed',
  steps: [
    'This service is keyless — a failure means the provider itself is down or blocking us.',
    'Wait a few minutes and re-probe; Zoe already falls back to the other free sources meanwhile.',
  ],
};

export function guideFor(apiId: string, keyless: boolean): ReconnectGuide {
  return RECONNECT_GUIDES[apiId] ?? (keyless ? KEYLESS_NOTE : GENERIC);
}
