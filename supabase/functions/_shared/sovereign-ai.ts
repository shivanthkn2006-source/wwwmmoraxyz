/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SOVEREIGN AI SHIM — drop-in replacement for the Lovable AI Gateway
 *
 * `sovereignFetch(url, init)` is signature-compatible with `fetch()` against
 * https://ai.gateway.lovable.dev/v1/... but routes every request to the
 * project's OWN provider keys. No Lovable credits are ever consumed.
 *
 * Routing:
 *   text            → Groq → Google AI Studio → Cohere → NVIDIA NIM → OpenRouter
 *   tools/functions → Groq → NVIDIA NIM → OpenRouter  (OpenAI-compatible tools)
 *   vision (images in messages) → Google AI Studio (gemini) → NVIDIA NIM VLM
 *   image generation/edit       → Pollinations → Google AI Studio image model
 *   streaming       → Groq SSE passthrough (OpenAI-compatible)
 *
 * Responses are normalised to the OpenAI chat-completions shape so existing
 * call sites keep working unchanged.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import {
  NVIDIA_BASE,
  NVIDIA_ROLES,
  isRetiredNvidiaModel,
  markNvidiaModelRetired,
  nvidiaKey,
} from './nvidia-provider.ts';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const GOOGLE_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

export const SOVEREIGN_PROVIDERS = ['groq', 'google-ai-studio', 'cohere', 'nvidia', 'openrouter', 'pollinations'] as const;


/** Truthy when at least one sovereign provider key is configured. */
export function sovereignKey(): string | undefined {
  return (
    Deno.env.get('GROQ_API_KEY') ||
    Deno.env.get('GOOGLE_AI_STUDIO_KEY') ||
    Deno.env.get('COHERE_API_KEY') ||
    Deno.env.get('OPENROUTER_API_KEY') ||
    Deno.env.get('POLLINATIONS_API_KEY') ||
    undefined
  );
}


/**
 * Hard guard: throws if anything still tries to reach the Lovable AI Gateway,
 * or relies on LOVABLE_API_KEY. Billed Lovable AI credits must never be used.
 */
export function assertNoLovableGateway(url: string): void {
  if (typeof url === 'string' && url.includes('ai.gateway.lovable.dev')) {
    throw new Error(
      `[sovereign-ai] BLOCKED: a caller passed a Lovable AI Gateway URL (${url}). ` +
        `This project routes 100% of AI through its own provider keys. ` +
        `Replace the URL with 'sovereign://chat/completions' (or 'sovereign://images' for image generation).`,
    );
  }
  if (Deno.env.get('LOVABLE_API_KEY')) {
    // Present in the environment is fine; USING it is not. Nothing in this shim reads it.
    // Surfaced once so a stale secret is visible and can be deleted.
    if (!warnedAboutLovableKey) {
      warnedAboutLovableKey = true;
      console.warn('[sovereign-ai] LOVABLE_API_KEY is still present in secrets but is never used. Safe to delete.');
    }
  }
}

let warnedAboutLovableKey = false;

// ───────────── model mapping ─────────────

// Verified live against each provider's /models catalogue (Aug 2026).
const GROQ_TEXT_FAST = 'openai/gpt-oss-20b';
const GROQ_TEXT_QUALITY = 'openai/gpt-oss-120b';
const OPENROUTER_TEXT = 'meta-llama/llama-3.3-70b-instruct';

/**
 * Google model catalogues drift (a model can be renamed or retired at any
 * time). Instead of one hard-coded id we walk a candidate list and remember
 * the first id the API actually accepts, so a retired preview name can never
 * silently take the whole vision/text path down.
 */
const GOOGLE_FAST_CANDIDATES = [
  'gemini-3.6-flash',
  // Live-probed 200 on this account (Sep 4 2026) while gemini-3.6-flash was
  // at 429 — Google quotas are PER MODEL, so a 429 must roll to the next id.
  'gemini-3-flash-preview',
  'gemini-3.5-flash',
  'gemini-2.5-flash',
  'gemini-flash-latest',
];

/** Groq multimodal model — live-probed with two images (Sep 4 2026). */
const GROQ_VISION = 'qwen/qwen3.8-27b';
/** OpenRouter multimodal fallbacks, cheapest first — both live-probed with two images. */
const OPENROUTER_VISION = ['google/gemini-2.5-flash-lite', 'google/gemma-3-12b-it'];
/** OpenRouter image generation / editing model (Nano Banana) — live-probed for text→image and image→image. */
const OPENROUTER_IMAGE = 'google/gemini-2.5-flash-image';

const GOOGLE_PRO_CANDIDATES = [
  'gemini-3.1-pro-preview',
  'gemini-2.5-pro',
  'gemini-pro-latest',
  ...GOOGLE_FAST_CANDIDATES,
];

/** Model ids proven dead (404/400) this isolate — skipped on later calls. */
const deadGoogleModels = new Set<string>();
/** First model id proven to work this isolate — tried first afterwards. */
let googleWorkingModel: string | null = null;

function isProTier(model: string): boolean {
  const m = (model || '').toLowerCase();
  return m.includes('pro') || m.includes('gpt-5') || m.includes('opus') || m.includes('sonnet');
}

function groqModelFor(model: string): string {
  const m = (model || '').toLowerCase();
  if (m.includes('lite') || m.includes('nano') || m.includes('instant')) return GROQ_TEXT_FAST;
  return isProTier(m) ? GROQ_TEXT_QUALITY : GROQ_TEXT_FAST;
}

function googleModelsFor(model: string): string[] {
  const base = isProTier(model) ? GOOGLE_PRO_CANDIDATES : GOOGLE_FAST_CANDIDATES;
  const ordered = googleWorkingModel ? [googleWorkingModel, ...base] : base;
  return [...new Set(ordered)].filter((m) => !deadGoogleModels.has(m));
}


// ───────────── helpers ─────────────

type AnyMsg = { role: string; content: any };

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function chatShape(content: string, model: string, images?: any[], usage?: any): any {
  return {
    id: `sov-${crypto.randomUUID()}`,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [
      {
        index: 0,
        message: { role: 'assistant', content, ...(images?.length ? { images } : {}) },
        finish_reason: 'stop',
      },
    ],
    usage: usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
  };
}

function extractImageParts(messages: AnyMsg[]): { text: string; images: string[] } {
  let text = '';
  const images: string[] = [];
  for (const m of messages) {
    if (typeof m.content === 'string') {
      text += (text ? '\n' : '') + m.content;
    } else if (Array.isArray(m.content)) {
      for (const part of m.content) {
        if (part?.type === 'text' && part.text) text += (text ? '\n' : '') + part.text;
        const url = part?.image_url?.url;
        if (url) images.push(url);
      }
    }
  }
  return { text, images };
}

function hasImageInput(messages: AnyMsg[]): boolean {
  return extractImageParts(messages).images.length > 0;
}

function flattenMessages(messages: AnyMsg[]): AnyMsg[] {
  return messages.map((m) => {
    if (typeof m.content === 'string') return m;
    if (Array.isArray(m.content)) {
      const text = m.content
        .filter((p: any) => p?.type === 'text' || typeof p?.text === 'string')
        .map((p: any) => p.text)
        .join('\n');
      return { ...m, content: text || '[non-text content omitted]' };
    }
    return { ...m, content: String(m.content ?? '') };
  });
}

function dataUrlToInline(url: string): { mimeType: string; data: string } | null {
  const match = /^data:([^;]+);base64,(.+)$/.exec(url);
  if (!match) return null;
  return { mimeType: match[1], data: match[2] };
}

async function urlToInline(url: string): Promise<{ mimeType: string; data: string } | null> {
  const inline = dataUrlToInline(url);
  if (inline) return inline;
  try {
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const buf = new Uint8Array(await resp.arrayBuffer());
    let binary = '';
    for (let i = 0; i < buf.length; i += 8192) {
      binary += String.fromCharCode(...buf.subarray(i, i + 8192));
    }
    return { mimeType: resp.headers.get('content-type') || 'image/jpeg', data: btoa(binary) };
  } catch {
    return null;
  }
}

// ───────────── providers ─────────────

async function callGroq(payload: any): Promise<Response | null> {
  const key = Deno.env.get('GROQ_API_KEY');
  if (!key) return null;
  const body: any = {
    model: groqModelFor(payload.model),
    messages: flattenMessages(payload.messages || []),
  };
  if (payload.temperature !== undefined) body.temperature = payload.temperature;
  if (payload.max_tokens !== undefined) body.max_tokens = payload.max_tokens;
  if (payload.tools) body.tools = payload.tools;
  if (payload.tool_choice) body.tool_choice = payload.tool_choice;
  if (payload.response_format) body.response_format = payload.response_format;
  if (payload.stream) body.stream = true;

  const resp = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    console.warn('[sovereign-ai] groq failed', resp.status, (await resp.clone().text()).slice(0, 200));
    return null;
  }
  return resp;
}

/**
 * Circuit breaker: once Google answers 429 (free-tier quota exhausted) every
 * further call in this isolate is pointless and just adds latency to every
 * request. Skip the provider for a cooldown window instead.
 */
let googleQuotaBlockedUntil = 0;
const GOOGLE_QUOTA_COOLDOWN_MS = 10 * 60 * 1000;

/** True while Google is rate-limited (used by callers to report inconclusive). */
export function googleQuotaExhausted(): boolean {
  return Date.now() < googleQuotaBlockedUntil;
}

async function callGoogle(payload: any): Promise<Response | null> {
  const key = Deno.env.get('GOOGLE_AI_STUDIO_KEY');
  if (!key) return null;
  if (googleQuotaExhausted()) return null;


  const messages: AnyMsg[] = payload.messages || [];
  const systemText = messages.filter((m) => m.role === 'system').map((m) => (typeof m.content === 'string' ? m.content : '')).join('\n');

  const contents: any[] = [];
  for (const m of messages) {
    if (m.role === 'system') continue;
    const parts: any[] = [];
    if (typeof m.content === 'string') {
      parts.push({ text: m.content });
    } else if (Array.isArray(m.content)) {
      for (const p of m.content) {
        if (p?.type === 'text' && p.text) parts.push({ text: p.text });
        const url = p?.image_url?.url;
        if (url) {
          const inline = await urlToInline(url);
          if (inline) parts.push({ inline_data: { mime_type: inline.mimeType, data: inline.data } });
        }
      }
    }
    if (parts.length) contents.push({ role: m.role === 'assistant' ? 'model' : 'user', parts });
  }
  if (!contents.length) return null;

  const body: any = {
    contents,
    generationConfig: {
      temperature: payload.temperature ?? 0.7,
      maxOutputTokens: payload.max_tokens ?? 2048,
    },
  };
  if (systemText) body.systemInstruction = { parts: [{ text: systemText }] };

  const candidates = googleModelsFor(payload.model);
  let sawQuota = false;
  for (const model of candidates) {
    const resp = await fetch(`${GOOGLE_BASE}/${model}:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      const detail = (await resp.text()).slice(0, 200);
      console.warn('[sovereign-ai] google failed', model, resp.status, detail);
      // A retired / unknown model must never take the whole path down.
      if (resp.status === 404 || resp.status === 400) {
        deadGoogleModels.add(model);
        continue;
      }
      // Google quotas are per model: one id at 429 says nothing about the next.
      if (resp.status === 429) { sawQuota = true; continue; }
      return null; // 401/5xx: key or service problem, another model won't help
    }
    sawQuota = false;
    const data = await resp.json();
    const text = data.candidates?.[0]?.content?.parts?.map((p: any) => p.text).filter(Boolean).join('') ?? '';
    if (!text) return null;
    googleWorkingModel = model;
    const usage = data.usageMetadata
      ? {
          prompt_tokens: data.usageMetadata.promptTokenCount ?? 0,
          completion_tokens: data.usageMetadata.candidatesTokenCount ?? 0,
          total_tokens: data.usageMetadata.totalTokenCount ?? 0,
        }
      : undefined;
    return json(chatShape(text, model, undefined, usage));
  }
  // Every live candidate answered 429 → cool the whole provider down.
  if (sawQuota) googleQuotaBlockedUntil = Date.now() + GOOGLE_QUOTA_COOLDOWN_MS;
  return null;
}

/**
 * OpenAI-compatible multimodal call (Groq / OpenRouter). The content arrays are
 * forwarded intact so the model really sees every image (identity comparisons
 * send two). Returns null on any failure so the chain keeps walking.
 */
async function callOpenAICompatVision(
  provider: 'groq' | 'openrouter',
  url: string,
  key: string,
  models: string[],
  payload: any,
  extraHeaders: Record<string, string> = {},
): Promise<Response | null> {
  const messages: AnyMsg[] = payload.messages || [];
  if (!messages.length) return null;
  for (const model of models) {
    try {
      const body: any = { model, messages, max_tokens: payload.max_tokens ?? 2048 };
      if (payload.temperature !== undefined) body.temperature = payload.temperature;
      if (payload.response_format?.type === 'json_object') body.response_format = payload.response_format;
      const resp = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', ...extraHeaders },
        body: JSON.stringify(body),
      });
      if (!resp.ok) {
        console.warn(`[sovereign-ai] ${provider} vision failed`, resp.status, model, (await resp.text()).slice(0, 200));
        continue;
      }
      const data = await resp.json();
      // OpenRouter can return HTTP 200 with an embedded upstream error.
      if (data?.error) {
        console.warn(`[sovereign-ai] ${provider} vision upstream error`, model, JSON.stringify(data.error).slice(0, 200));
        continue;
      }
      let content = data?.choices?.[0]?.message?.content;
      if (Array.isArray(content)) content = content.map((p: any) => p?.text ?? '').join('');
      if (typeof content !== 'string' || !content.trim()) continue;
      // Reasoning models may wrap thinking in <think>…</think>; never leak it.
      content = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
      if (!content) continue;
      return json(chatShape(content, `${provider}/${model}`, undefined, data?.usage));
    } catch (e) {
      console.warn(`[sovereign-ai] ${provider} vision threw`, model, e);
    }
  }
  return null;
}

async function callGroqVision(payload: any): Promise<Response | null> {
  const key = Deno.env.get('GROQ_API_KEY');
  if (!key) return null;
  return callOpenAICompatVision('groq', GROQ_URL, key, [GROQ_VISION], payload);
}

async function callOpenRouterVision(payload: any): Promise<Response | null> {
  const key = Deno.env.get('OPENROUTER_API_KEY');
  if (!key) return null;
  return callOpenAICompatVision('openrouter', OPENROUTER_URL, key, OPENROUTER_VISION, payload, {
    'HTTP-Referer': 'https://mmora.xyz',
    'X-Title': "M'Mora Zoe",
  });
}


/**
 * NVIDIA NIM (build.nvidia.com) — OpenAI-compatible, and the only other
 * provider on this account with real multimodal models. It therefore serves
 * two roles here:
 *   - text fallback after Groq/Google/Cohere,
 *   - **vision** fallback after Google, which text-only providers can never be.
 *
 * Each role walks a chain of model ids, so a retired or rate-limited NIM never
 * takes the feature down.
 */
async function callNvidia(payload: any, kind: 'text' | 'vision'): Promise<Response | null> {
  const key = nvidiaKey();
  if (!key) return null;

  const models = (kind === 'vision'
    ? NVIDIA_ROLES.vision
    : isProTier(payload.model)
      ? NVIDIA_ROLES.deep_thinking
      : NVIDIA_ROLES.chat
  ).filter((m) => !isRetiredNvidiaModel(m));

  // Vision models need the multimodal content array intact; text models get the
  // flattened form so a stray image part cannot become "no image provided".
  const messages = kind === 'vision' ? (payload.messages || []) : flattenMessages(payload.messages || []);
  if (!messages.length) return null;

  for (const model of models) {
    try {
      const body: any = { model, messages };
      if (payload.temperature !== undefined) body.temperature = payload.temperature;
      body.max_tokens = payload.max_tokens ?? 2048;
      if (payload.response_format) body.response_format = payload.response_format;
      if (kind === 'text' && payload.tools) body.tools = payload.tools;
      if (kind === 'text' && payload.tool_choice) body.tool_choice = payload.tool_choice;

      const resp = await fetch(`${NVIDIA_BASE}/chat/completions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!resp.ok) {
        if (resp.status === 410 || resp.status === 404) markNvidiaModelRetired(model);
        console.warn('[sovereign-ai] nvidia failed', resp.status, model, (await resp.text()).slice(0, 200));
        continue;
      }
      // NIM is OpenAI-compatible, so the response already has the shape callers
      // expect — but only forward it when it actually carries content.
      const data = await resp.json();
      const content = data?.choices?.[0]?.message?.content;
      if (typeof content !== 'string' || !content.trim()) continue;
      return json(chatShape(content, `nvidia/${model}`, undefined, data?.usage));
    } catch (e) {
      console.warn('[sovereign-ai] nvidia threw', model, e);
    }
  }
  return null;
}

/**
 * Cohere text fallback. Keeps the platform answering when Groq is down and the
 * Google free tier is quota-exhausted (the most common real-world outage).
 */
async function callCohere(payload: any): Promise<Response | null> {


  const key = Deno.env.get('COHERE_API_KEY');
  if (!key) return null;
  try {
    const messages = flattenMessages(payload.messages || []).map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : m.role === 'system' ? 'system' : 'user',
      content: String(m.content ?? ''),
    }));
    if (!messages.length) return null;
    const resp = await fetch('https://api.cohere.com/v2/chat', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: isProTier(payload.model) ? 'command-a-03-2025' : 'command-r-08-2024',
        messages,
        temperature: payload.temperature ?? 0.7,
        max_tokens: payload.max_tokens ?? 2048,
      }),
    });
    if (!resp.ok) {
      console.warn('[sovereign-ai] cohere failed', resp.status, (await resp.text()).slice(0, 200));
      return null;
    }
    const data = await resp.json();
    const text = Array.isArray(data?.message?.content)
      ? data.message.content.map((p: any) => p?.text).filter(Boolean).join('')
      : '';
    if (!text) return null;
    return json(chatShape(text, 'cohere', undefined, {
      prompt_tokens: data?.usage?.tokens?.input_tokens ?? 0,
      completion_tokens: data?.usage?.tokens?.output_tokens ?? 0,
      total_tokens:
        (data?.usage?.tokens?.input_tokens ?? 0) + (data?.usage?.tokens?.output_tokens ?? 0),
    }));
  } catch (e) {
    console.warn('[sovereign-ai] cohere error', e);
    return null;
  }
}

async function callOpenRouter(payload: any): Promise<Response | null> {

  const key = Deno.env.get('OPENROUTER_API_KEY');
  if (!key) return null;
  const body: any = {
    model: OPENROUTER_TEXT,
    messages: flattenMessages(payload.messages || []),
  };
  if (payload.temperature !== undefined) body.temperature = payload.temperature;
  if (payload.max_tokens !== undefined) body.max_tokens = payload.max_tokens;
  if (payload.tools) body.tools = payload.tools;
  if (payload.tool_choice) body.tool_choice = payload.tool_choice;
  if (payload.stream) body.stream = true;

  const resp = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://myzoe.xyz',
      'X-Title': 'Zoe Infinity',
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    console.warn('[sovereign-ai] openrouter failed', resp.status, (await resp.clone().text()).slice(0, 200));
    return null;
  }
  return resp;
}

// ───────────── image generation ─────────────

async function pollinationsImage(prompt: string): Promise<string | null> {
  try {
    const token = Deno.env.get('POLLINATIONS_API_KEY');
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&model=flux&nologo=true&enhance=true`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45_000);
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: token ? { Accept: 'image/*', Authorization: `Bearer ${token}` } : { Accept: 'image/*' },
    });
    clearTimeout(timer);
    if (!resp.ok) return null;
    const buf = new Uint8Array(await resp.arrayBuffer());
    if (buf.byteLength < 1000) return null;
    let binary = '';
    for (let i = 0; i < buf.length; i += 8192) binary += String.fromCharCode(...buf.subarray(i, i + 8192));
    const ct = resp.headers.get('content-type') || 'image/jpeg';
    return `data:${ct};base64,${btoa(binary)}`;
  } catch (e) {
    console.warn('[sovereign-ai] pollinations failed', e);
    return null;
  }
}

async function googleImage(prompt: string, inputImages: string[]): Promise<string | null> {
  const key = Deno.env.get('GOOGLE_AI_STUDIO_KEY');
  if (!key) return null;
  try {
    const parts: any[] = [{ text: prompt }];
    for (const url of inputImages) {
      const inline = await urlToInline(url);
      if (inline) parts.push({ inline_data: { mime_type: inline.mimeType, data: inline.data } });
    }
    const resp = await fetch(
      `${GOOGLE_BASE}/gemini-2.5-flash-image:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ role: 'user', parts }] }),
      },
    );
    if (!resp.ok) {
      console.warn('[sovereign-ai] google image failed', resp.status);
      return null;
    }
    const data = await resp.json();
    const imgPart = data.candidates?.[0]?.content?.parts?.find((p: any) => p.inline_data || p.inlineData);
    const inline = imgPart?.inline_data || imgPart?.inlineData;
    if (!inline?.data) return null;
    return `data:${inline.mime_type || inline.mimeType || 'image/png'};base64,${inline.data}`;
  } catch (e) {
    console.warn('[sovereign-ai] google image error', e);
    return null;
  }
}

/**
 * OpenRouter image generation / editing (Nano Banana). Used when Google AI
 * Studio image models are at quota and Pollinations' paid edit balance is empty.
 * Exported so `edit-image` can reuse the exact same call for identity edits.
 */
export async function openRouterImage(prompt: string, inputImages: string[]): Promise<string | null> {
  const key = Deno.env.get('OPENROUTER_API_KEY');
  if (!key) return null;
  try {
    const content: any[] = [{ type: 'text', text: prompt }];
    for (const url of inputImages) content.push({ type: 'image_url', image_url: { url } });
    const resp = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://mmora.xyz',
        'X-Title': "M'Mora Zoe",
      },
      body: JSON.stringify({
        model: OPENROUTER_IMAGE,
        messages: [{ role: 'user', content }],
        modalities: ['image', 'text'],
      }),
    });
    if (!resp.ok) {
      console.warn('[sovereign-ai] openrouter image failed', resp.status, (await resp.text()).slice(0, 200));
      return null;
    }
    const data = await resp.json();
    if (data?.error) {
      console.warn('[sovereign-ai] openrouter image upstream error', JSON.stringify(data.error).slice(0, 200));
      return null;
    }
    const img = data?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    return typeof img === 'string' && img.startsWith('data:') ? img : null;
  } catch (e) {
    console.warn('[sovereign-ai] openrouter image error', e);
    return null;
  }
}

async function handleImageRequest(payload: any, openaiImagesEndpoint: boolean): Promise<Response> {
  const messages: AnyMsg[] = payload.messages || [];
  const { text, images } = messages.length
    ? extractImageParts(messages)
    : { text: payload.prompt || '', images: [] as string[] };

  // Editing an existing image needs a multimodal model; generation can use Pollinations.
  let dataUrl: string | null = null;
  if (images.length) {
    dataUrl = await googleImage(text || 'Edit this image', images);
    if (!dataUrl) dataUrl = await openRouterImage(text || 'Edit this image', images);
    // Text-only generation can never preserve the input subject — do not
    // downgrade an edit into an unrelated render.
  } else {
    dataUrl = await pollinationsImage(text || 'image');
    if (!dataUrl) dataUrl = await googleImage(text || 'image', []);
    if (!dataUrl) dataUrl = await openRouterImage(text || 'image', []);
  }

  if (!dataUrl) {
    return json({ error: { message: 'All sovereign image providers failed', code: 'IMAGE_UNAVAILABLE' } }, 502);
  }

  if (openaiImagesEndpoint) {
    const b64 = dataUrl.split(',')[1];
    return json({ created: Math.floor(Date.now() / 1000), data: [{ b64_json: b64, url: dataUrl }] });
  }

  return json(
    chatShape('Image generated successfully', 'sovereign-image', [
      { type: 'image_url', image_url: { url: dataUrl } },
    ]),
  );
}

// ───────────── public entry point ─────────────

/**
 * Drop-in replacement for `fetch(<lovable gateway url>, init)`.
 * Always returns an OpenAI-compatible Response backed by sovereign providers.
 */
export async function sovereignFetch(url: string, init?: RequestInit): Promise<Response> {
  assertNoLovableGateway(url);

  let payload: any = {};
  try {
    payload = typeof init?.body === 'string' ? JSON.parse(init.body) : (init?.body ?? {});
  } catch {
    payload = {};
  }

  const isImagesEndpoint = typeof url === 'string' && url.includes('/images');
  const wantsImage =
    isImagesEndpoint ||
    (Array.isArray(payload.modalities) && payload.modalities.includes('image')) ||
    /image(-preview)?$/.test(String(payload.model || '')) ||
    String(payload.model || '').includes('image');

  if (wantsImage) {
    return await handleImageRequest(payload, isImagesEndpoint);
  }

  const messages: AnyMsg[] = payload.messages || [];

  // Vision requests: real multimodal providers only. Text-only providers must
  // NEVER be used as a fallback here — they silently drop the image and answer
  // "no image was provided", which callers then read as a real verdict.
  // Chain (all live-probed Sep 4 2026):
  //   Google Gemini → Groq Qwen3.8-27B (free, multi-image) → OpenRouter
  //   (gemini-2.5-flash-lite / gemma-3-12b) → NVIDIA NIM (single-image only:
  //   llama-3.2-vision rejects >1 image, which broke identity comparisons).
  if (hasImageInput(messages)) {
    const g = await callGoogle(payload);
    if (g) return g;
    const gq = await callGroqVision(payload);
    if (gq) return gq;
    const orv = await callOpenRouterVision(payload);
    if (orv) return orv;
    if (extractImageParts(messages).images.length <= 1) {
      const nv = await callNvidia(payload, 'vision');
      if (nv) return nv;
    }
    return json(
      { error: { message: 'No sovereign vision provider available', code: 'VISION_UNAVAILABLE' } },
      503,
    );
  }

  // Tool calling / streaming: OpenAI-compatible providers only.
  if (payload.tools || payload.stream) {
    const gr = await callGroq(payload);
    if (gr) return gr;
    // Streaming needs a raw SSE passthrough; NIM is only used for the
    // non-streaming tool path where a normalised body is acceptable.
    if (!payload.stream) {
      const nv = await callNvidia(payload, 'text');
      if (nv) return nv;
    }
    const or = await callOpenRouter(payload);
    if (or) return or;
    return json({ error: { message: 'No sovereign tool-capable provider available', code: 'SERVICE_UNAVAILABLE' } }, 503);
  }

  // Plain text.
  const gr = await callGroq(payload);
  if (gr) return gr;
  const g = await callGoogle(payload);
  if (g) return g;
  const co = await callCohere(payload);
  if (co) return co;
  const nv = await callNvidia(payload, 'text');
  if (nv) return nv;
  const or = await callOpenRouter(payload);
  if (or) return or;

  return json({ error: { message: 'All sovereign providers failed', code: 'SERVICE_UNAVAILABLE' } }, 503);


}

export default sovereignFetch;
