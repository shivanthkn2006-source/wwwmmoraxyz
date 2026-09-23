/**
 * NVIDIA NIM (build.nvidia.com) — OpenAI-compatible sovereign provider.
 * Used as an extra free/credit-backed tier in the search + inference cascades
 * so the pipeline keeps working when Groq / Google / OpenRouter run dry.
 */

// deno-lint-ignore no-explicit-any
declare const Deno: any;

export const NVIDIA_BASE = 'https://integrate.api.nvidia.com/v1';
/**
 * Chat + embedding defaults. Every id below answered HTTP 200 on this account in
 * the 2026-09-23 full-catalog sweep (82 models probed). Models the catalog has
 * dropped (meta/llama-3.3-70b-instruct, minimaxai/minimax-m3,
 * deepseek-ai/deepseek-v4-flash-0731) and the retired embedder
 * nvidia/nv-embedqa-e5-v5 (410 Gone) were removed — they can never answer again.
 */
export const NVIDIA_CHAT_MODEL = 'nvidia/nemotron-3-super-120b-a12b';
/** Embedding model; 2048-dim, padded/truncated by nvidiaEmbed to the caller width. */
export const NVIDIA_EMBED_MODEL = 'nvidia/nemotron-3-embed-1b';

/**
 * Role registry — ordered fallback chains built from the live sweep. Fast,
 * consistently-answering models lead each chain; models that queue for capacity
 * (nemotron-3-ultra-550b, kimi-k3, deepseek-v4.1-flash, glm-5.3) sit last so a
 * slow tier can never stall a feature, and 404-only ids are gone entirely.
 *
 * Verified round-trips: nemotron-3-super-120b-a12b 0.5-1.1s,
 * diffusiongemma-26b-a4b-it 0.6s, muse-glimmer-30b 1.8s,
 * ising-calibration-1.5-31b 0.9s, nemotron-3-nano-omni-reasoning 1.6s,
 * nemotron-3.5-content-safety 0.24s, riva-translate-4b-instruct-v2 0.35s,
 * llama-3.2-11b-vision-instruct 0.25s, nemotron-parse-2.0 0.15s,
 * nemotron-3-embed-1b 0.11s (2048 dims).
 */
export const NVIDIA_ROLES = {
  /** Deep thinking / hard reasoning (Zoe metacognition, riddles, planning). */
  deep_thinking: [
    'nvidia/nemotron-3-super-120b-a12b',
    'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning',
    'nvidia/ising-calibration-1.5-31b',
    'nvidia/nemotron-3-ultra-550b-a55b',
  ],
  /** Everyday conversational replies (Zoe chat, companion, DHF dialogue). */
  chat: [
    'nvidia/nemotron-3-super-120b-a12b',
    'meta/muse-glimmer-30b',
    'google/diffusiongemma-26b-a4b-it',
  ],
  /** Low-latency routing / classification (search intent, feed gates). */
  fast: [
    'google/diffusiongemma-26b-a4b-it',
    'nvidia/nemotron-3-super-120b-a12b',
    'meta/muse-glimmer-30b',
  ],
  /** Image / frame understanding — OCR, objects, mood (search + DHF indexing). */
  // NOTE: llama-3.2 vision accepts ONE image per prompt; callers with two
  // images (identity comparison) must use the Groq/OpenRouter tiers instead.
  vision: [
    'meta/llama-3.2-11b-vision-instruct',
    'nvidia/nemotron-parse-2.0',
    'meta/llama-3.2-90b-vision-instruct',
  ],
  /** Creative long-form copy (astrology cards, motivations, growth insights). */
  creative: [
    'meta/muse-glimmer-30b',
    'nvidia/nemotron-3-super-120b-a12b',
    'google/diffusiongemma-26b-a4b-it',
  ],
  /** Translation. */
  translate: ['nvidia/riva-translate-4b-instruct-v2', 'nvidia/nemotron-3-super-120b-a12b'],
  /** Safety / moderation of user content. */
  safety: ['nvidia/nemotron-3.5-content-safety', 'nvidia/nemotron-3-super-120b-a12b'],
} as const;

export type NvidiaRole = keyof typeof NVIDIA_ROLES;

/**
 * Models the catalog has retired (HTTP 410 "end of life"). Once a model answers
 * 410 it never recovers, so it is skipped for the lifetime of the isolate
 * instead of burning a request on every cascade.
 */
const retiredModels = new Set<string>();

export function isRetiredNvidiaModel(model: string): boolean {
  return retiredModels.has(model);
}

export function markNvidiaModelRetired(model: string): void {
  retiredModels.add(model);
}

export function nvidiaKey(): string | null {
  return Deno.env.get('NVIDIA_API_KEY') || null;
}


export interface NvidiaChatOptions {
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
  timeoutMs?: number;
  model?: string;
  /** Internal: set once a 429/503 retry has already been spent. */
  __retried?: boolean;
}

/** Single NVIDIA chat completion. Returns null on any failure (caller cascades on). */
export async function nvidiaChat(userText: string, opts: NvidiaChatOptions = {}): Promise<string | null> {
  const key = nvidiaKey();
  if (!key) return null;
  const requestedModel = opts.model ?? NVIDIA_CHAT_MODEL;
  if (retiredModels.has(requestedModel)) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 25_000);
  try {
    const messages: Array<{ role: string; content: string }> = [];
    if (opts.systemPrompt) messages.push({ role: 'system', content: opts.systemPrompt });
    messages.push({ role: 'user', content: userText });

    const resp = await fetch(`${NVIDIA_BASE}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model: requestedModel,
        messages,
        temperature: opts.temperature ?? 0.6,
        max_tokens: opts.maxTokens ?? 1024,
        ...(opts.jsonMode ? { response_format: { type: 'json_object' } } : {}),
      }),
    });
    if (!resp.ok) {
      if (resp.status === 410 || resp.status === 404) markNvidiaModelRetired(requestedModel);
      const detail = (await resp.text()).slice(0, 200);
      console.warn('[nvidia] chat failed', resp.status, requestedModel, detail);
      // Shared NIM capacity answers 429/503 in bursts and clears within a second.
      // One short retry keeps a healthy model in play instead of dropping a tier.
      if ((resp.status === 429 || resp.status === 503) && !opts.__retried) {
        await new Promise((resolve) => setTimeout(resolve, 900));
        return nvidiaChat(userText, { ...opts, model: requestedModel, __retried: true });
      }
      return null;
    }
    const data = await resp.json();
    const content = data?.choices?.[0]?.message?.content;
    return typeof content === 'string' && content.trim() ? content : null;
  } catch (e) {
    console.warn('[nvidia] chat threw', e);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * NVIDIA embeddings. `dims` lets the caller match the stored vector width;
 * NIM embedders return a fixed width, so the vector is truncated / zero-padded
 * to `dims` when it does not match, keeping the DB column valid.
 */
export async function nvidiaEmbed(
  text: string,
  dims: number,
  inputType: 'query' | 'passage' = 'passage',
): Promise<number[] | null> {
  const key = nvidiaKey();
  if (!key) return null;
  try {
    const resp = await fetch(`${NVIDIA_BASE}/embeddings`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: NVIDIA_EMBED_MODEL,
        input: [text],
        input_type: inputType,
        encoding_format: 'float',
        truncate: 'END',
      }),
    });
    if (!resp.ok) {
      console.warn('[nvidia] embed failed', resp.status, (await resp.text()).slice(0, 200));
      return null;
    }
    const data = await resp.json();
    const values = data?.data?.[0]?.embedding;
    if (!Array.isArray(values) || values.length === 0) return null;
    if (values.length === dims) return values;
    if (values.length > dims) return values.slice(0, dims);
    return [...values, ...new Array(dims - values.length).fill(0)];
  } catch (e) {
    console.warn('[nvidia] embed threw', e);
    return null;
  }
}

/**
 * Role-aware chat: walks the role's fallback chain until one model answers.
 * Returns `{ content, model }` so callers can log which NIM actually served.
 */
export async function nvidiaChatByRole(
  role: NvidiaRole,
  userText: string,
  opts: NvidiaChatOptions = {},
): Promise<{ content: string; model: string } | null> {
  for (const model of NVIDIA_ROLES[role]) {
    if (retiredModels.has(model)) continue;
    const content = await nvidiaChat(userText, { ...opts, model });
    if (content) return { content, model };
  }
  return null;
}

/**
 * Vision pass over a base64 image using the NIM VLM chain.
 * `dataUrl` must be a full `data:image/...;base64,...` string.
 */
export async function nvidiaVision(
  dataUrl: string,
  prompt: string,
  opts: { maxTokens?: number; timeoutMs?: number } = {},
): Promise<string | null> {
  const key = nvidiaKey();
  if (!key) return null;
  for (const model of NVIDIA_ROLES.vision) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 45_000);
    try {
      const resp = await fetch(`${NVIDIA_BASE}/chat/completions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          messages: [{
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: dataUrl } },
            ],
          }],
          temperature: 0.2,
          max_tokens: opts.maxTokens ?? 512,
        }),
      });
      if (!resp.ok) {
        console.warn('[nvidia] vision failed', model, resp.status);
        continue;
      }
      const data = await resp.json();
      const content = data?.choices?.[0]?.message?.content;
      if (typeof content === 'string' && content.trim()) return content;
    } catch (e) {
      console.warn('[nvidia] vision threw', model, e);
    } finally {
      clearTimeout(timer);
    }
  }
  return null;
}
