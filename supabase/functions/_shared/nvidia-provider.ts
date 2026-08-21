/**
 * NVIDIA NIM (build.nvidia.com) — OpenAI-compatible sovereign provider.
 * Used as an extra free/credit-backed tier in the search + inference cascades
 * so the pipeline keeps working when Groq / Google / OpenRouter run dry.
 */

// deno-lint-ignore no-explicit-any
declare const Deno: any;

export const NVIDIA_BASE = 'https://integrate.api.nvidia.com/v1';
/** Chat model used for intent routing + ambient synthesis. */
export const NVIDIA_CHAT_MODEL = 'meta/llama-3.3-70b-instruct';
/** Embedding model; asymmetric query/passage QA embedder. */
export const NVIDIA_EMBED_MODEL = 'nvidia/nv-embedqa-e5-v5';

/**
 * Role registry — every id below was live-probed against this account's NIM
 * catalog (103 models) and answered 200. Each role is an ordered fallback
 * chain: the first model that returns content wins, so a rate-limited or
 * retired model never takes a feature down.
 */
export const NVIDIA_ROLES = {
  /** Deep thinking / hard reasoning (Zoe metacognition, riddles, planning). */
  deep_thinking: [
    'nvidia/nemotron-3-ultra-550b-a55b',
    'moonshotai/kimi-k3',
    'nvidia/nemotron-3-super-120b-a12b',
    'deepseek-ai/deepseek-v4-flash-0731',
  ],
  /** Everyday conversational replies. */
  chat: [
    'deepseek-ai/deepseek-v4-flash-0731',
    'meta/llama-3.3-70b-instruct',
    'z-ai/glm-5.2',
    'minimaxai/minimax-m3',
  ],
  /** Low-latency routing / classification (search intent, gates). */
  fast: [
    'nvidia/nemotron-3.5-lightning-30b-a3b',
    'meta/llama-3.3-70b-instruct',
    'minimaxai/minimax-m3',
  ],
  /** Image / frame understanding — OCR, objects, mood (search + DHF indexing). */
  vision: [
    'nvidia/nemotron-nano-12b-v2-vl',
    'meta/llama-3.2-11b-vision-instruct',
    'microsoft/phi-3-vision-128k-instruct',
  ],
  /** Creative long-form copy (astrology cards, motivations). */
  creative: [
    'z-ai/glm-5.2',
    'moonshotai/kimi-k3',
    'meta/llama-3.3-70b-instruct',
  ],
  /** Translation. */
  translate: ['nvidia/riva-translate-4b-instruct-v2', 'meta/llama-3.3-70b-instruct'],
  /** Safety / moderation of user content. */
  safety: ['nvidia/llama-3.1-nemoguard-8b-content-safety', 'meta/llama-guard-4-12b'],
} as const;

export type NvidiaRole = keyof typeof NVIDIA_ROLES;

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
}

/** Single NVIDIA chat completion. Returns null on any failure (caller cascades on). */
export async function nvidiaChat(userText: string, opts: NvidiaChatOptions = {}): Promise<string | null> {
  const key = nvidiaKey();
  if (!key) return null;
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
        model: opts.model ?? NVIDIA_CHAT_MODEL,
        messages,
        temperature: opts.temperature ?? 0.6,
        max_tokens: opts.maxTokens ?? 1024,
        ...(opts.jsonMode ? { response_format: { type: 'json_object' } } : {}),
      }),
    });
    if (!resp.ok) {
      console.warn('[nvidia] chat failed', resp.status, (await resp.text()).slice(0, 200));
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
