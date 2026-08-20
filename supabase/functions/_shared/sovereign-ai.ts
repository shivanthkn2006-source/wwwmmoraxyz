/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SOVEREIGN AI SHIM — drop-in replacement for the Lovable AI Gateway
 *
 * `sovereignFetch(url, init)` is signature-compatible with `fetch()` against
 * https://ai.gateway.lovable.dev/v1/... but routes every request to the
 * project's OWN provider keys. No Lovable credits are ever consumed.
 *
 * Routing:
 *   text            → Groq → Google AI Studio → OpenRouter
 *   tools/functions → Groq → OpenRouter        (OpenAI-compatible tool calling)
 *   vision (images in messages) → Google AI Studio (gemini) → OpenRouter
 *   image generation/edit       → Pollinations → Google AI Studio image model
 *   streaming       → Groq SSE passthrough (OpenAI-compatible)
 *
 * Responses are normalised to the OpenAI chat-completions shape so existing
 * call sites keep working unchanged.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const GOOGLE_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

export const SOVEREIGN_PROVIDERS = ['groq', 'google-ai-studio', 'openrouter', 'pollinations'] as const;

/** Truthy when at least one sovereign provider key is configured. */
export function sovereignKey(): string | undefined {
  return (
    Deno.env.get('GROQ_API_KEY') ||
    Deno.env.get('GOOGLE_AI_STUDIO_KEY') ||
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
const GOOGLE_TEXT = 'gemini-3.6-flash';
const GOOGLE_PRO = 'gemini-3.1-pro-preview';
const OPENROUTER_TEXT = 'meta-llama/llama-3.3-70b-instruct';

function isProTier(model: string): boolean {
  const m = (model || '').toLowerCase();
  return m.includes('pro') || m.includes('gpt-5') || m.includes('opus') || m.includes('sonnet');
}

function groqModelFor(model: string): string {
  const m = (model || '').toLowerCase();
  if (m.includes('lite') || m.includes('nano') || m.includes('instant')) return GROQ_TEXT_FAST;
  return isProTier(m) ? GROQ_TEXT_QUALITY : GROQ_TEXT_FAST;
}

function googleModelFor(model: string): string {
  return isProTier(model) ? GOOGLE_PRO : GOOGLE_TEXT;
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

async function callGoogle(payload: any): Promise<Response | null> {
  const key = Deno.env.get('GOOGLE_AI_STUDIO_KEY');
  if (!key) return null;

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

  const model = googleModelFor(payload.model);
  const resp = await fetch(`${GOOGLE_BASE}/${model}:generateContent?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    console.warn('[sovereign-ai] google failed', resp.status, (await resp.text()).slice(0, 200));
    return null;
  }
  const data = await resp.json();
  const text = data.candidates?.[0]?.content?.parts?.map((p: any) => p.text).filter(Boolean).join('') ?? '';
  if (!text) return null;
  const usage = data.usageMetadata
    ? {
        prompt_tokens: data.usageMetadata.promptTokenCount ?? 0,
        completion_tokens: data.usageMetadata.candidatesTokenCount ?? 0,
        total_tokens: data.usageMetadata.totalTokenCount ?? 0,
      }
    : undefined;
  return json(chatShape(text, model, undefined, usage));
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

async function handleImageRequest(payload: any, openaiImagesEndpoint: boolean): Promise<Response> {
  const messages: AnyMsg[] = payload.messages || [];
  const { text, images } = messages.length
    ? extractImageParts(messages)
    : { text: payload.prompt || '', images: [] as string[] };

  // Editing an existing image needs a multimodal model; generation can use Pollinations.
  let dataUrl: string | null = null;
  if (images.length) {
    dataUrl = await googleImage(text || 'Edit this image', images);
    if (!dataUrl) dataUrl = await pollinationsImage(text || 'image');
  } else {
    dataUrl = await pollinationsImage(text || 'image');
    if (!dataUrl) dataUrl = await googleImage(text || 'image', []);
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

  // Vision requests: Google first (native multimodal), then text-only fallbacks.
  if (hasImageInput(messages)) {
    const g = await callGoogle(payload);
    if (g) return g;
    const gr = await callGroq(payload);
    if (gr) return gr;
    const or = await callOpenRouter(payload);
    if (or) return or;
    return json({ error: { message: 'No sovereign vision provider available', code: 'SERVICE_UNAVAILABLE' } }, 503);
  }

  // Tool calling / streaming: OpenAI-compatible providers only.
  if (payload.tools || payload.stream) {
    const gr = await callGroq(payload);
    if (gr) return gr;
    const or = await callOpenRouter(payload);
    if (or) return or;
    return json({ error: { message: 'No sovereign tool-capable provider available', code: 'SERVICE_UNAVAILABLE' } }, 503);
  }

  // Plain text.
  const gr = await callGroq(payload);
  if (gr) return gr;
  const g = await callGoogle(payload);
  if (g) return g;
  const or = await callOpenRouter(payload);
  if (or) return or;

  return json({ error: { message: 'All sovereign providers failed', code: 'SERVICE_UNAVAILABLE' } }, 503);
}

export default sovereignFetch;
