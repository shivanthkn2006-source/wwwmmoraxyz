// Sovereign cascade — no Lovable AI Gateway tier.
/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SOVEREIGN CASCADE MODULE — Smart Auto-Routing with structured fallback reasons
 *
 * Default provider order (T1 primary, T5 absolute last-resort):
 *   T1  Groq • openai/gpt-oss-20b      (primary, free, lowest latency)
 *   T2  Google AI Studio • gemini-3.5-flash   (direct, free tier)
 *   T3  Groq • openai/gpt-oss-120b        (quality speed tier)
 *   T4  OpenRouter • llama-3.3-70b free       (backup speed tier)
 *   T5  Lovable Gateway • google/gemini-3.5-flash (paid credits, last-resort only)
 *
 * Use mode: 't1-primary' to boost T1 timeout and keep T5 as the true fallback.
 * Every attempt is recorded with {tier, provider, model, ok, status, reasonCode,
 * reasonText, latencyMs}. Successful results carry the trail back to the caller
 * so edge functions can return it to the UI for on-screen diagnostics.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { applyCircuitBreaker } from './loop-breaker.ts';
import { nvidiaChat, NVIDIA_CHAT_MODEL } from './nvidia-provider.ts';

async function callNvidia(messages: Message[], opts: CascadeOptions): Promise<ProviderOutcome> {
  const apiKey = Deno.env.get('NVIDIA_API_KEY');
  if (!apiKey) return { content: null, status: null, reasonCode: 'missing_key', reasonText: 'NVIDIA_API_KEY not set' };
  const systemPrompt = opts.systemPrompt || messages.find(m => m.role === 'system')?.content;
  const userText = messages.filter(m => m.role !== 'system').map(m => `${m.role}: ${m.content}`).join('\n\n');
  const content = await nvidiaChat(userText || (messages.at(-1)?.content ?? ''), {
    systemPrompt,
    temperature: opts.temperature ?? 0.7,
    maxTokens: Math.max(opts.maxTokens ?? 500, 256),
    timeoutMs: opts.timeoutMs ?? 25_000,
  });
  if (!content) return { content: null, status: null, reasonCode: 'empty_response', reasonText: 'nvidia returned no content' };
  return { content, status: 200, reasonCode: 'success', reasonText: 'ok' };
}


export type CascadeMode = 'default' | 't1-primary';

export type CascadeReason =
  | 'success'
  | 'missing_key'
  | 'rate_limit'        // 429
  | 'auth_error'        // 401 / 403
  | 'payment_required'  // 402
  | 'bad_request'       // 400
  | 'server_error'      // 5xx
  | 'network_error'
  | 'empty_response'
  | 'timeout'
  | 'unknown_error';

export interface AttemptLog {
  tier: number;
  name: string;
  provider: string;
  model: string;
  ok: boolean;
  status: number | null;
  reasonCode: CascadeReason;
  reasonText: string;
  latencyMs: number;
}

export interface CascadeResult {
  content: string;
  success: boolean;
  /** Tier (1-based) that ultimately served the response, or null if all failed */
  selectedTier: number | null;
  /** Stable provider id (gemma | gemini | groq | openrouter | lovable | none) */
  selectedProvider: string;
  selectedModel: string;
  attempts: AttemptLog[];
}

export interface CascadeOptions {
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
  /** Per-provider timeout in ms (default 25_000). T1 gets a 1.5x boost in t1-primary mode. */
  timeoutMs?: number;
  /** Cascade strategy: default keeps T1→T5 order; t1-primary boosts T1 and keeps T5 as last-resort fallback. */
  mode?: CascadeMode;
}

interface Message {
  role: string;
  content: string;
}

interface ProviderOutcome {
  content: string | null;
  status: number | null;
  reasonCode: CascadeReason;
  reasonText: string;
}

function classifyStatus(status: number, body: string): { code: CascadeReason; text: string } {
  if (status === 429) return { code: 'rate_limit', text: `429 rate-limited: ${body.slice(0, 140)}` };
  if (status === 401 || status === 403) return { code: 'auth_error', text: `${status} auth: ${body.slice(0, 140)}` };
  if (status === 402) return { code: 'payment_required', text: `402 credits exhausted: ${body.slice(0, 140)}` };
  if (status === 400) return { code: 'bad_request', text: `400 bad request: ${body.slice(0, 140)}` };
  if (status >= 500) return { code: 'server_error', text: `${status} upstream: ${body.slice(0, 140)}` };
  return { code: 'unknown_error', text: `${status}: ${body.slice(0, 140)}` };
}

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return await Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);
}

// ───────────── Provider implementations ─────────────

/**
 * Groq's gpt-oss models are reasoning models: with a small token budget the whole
 * budget can be spent on hidden reasoning, leaving `content` empty. We keep the
 * reasoning effort low and, as a last resort, fall back to the reasoning text.
 */
function groqContent(data: any): string | null {
  const msg = data?.choices?.[0]?.message;
  const direct = typeof msg?.content === 'string' ? msg.content.trim() : '';
  if (direct) return direct;
  const reasoning = typeof msg?.reasoning === 'string' ? msg.reasoning.trim() : '';
  return reasoning || null;
}

/** Gemini 3.x returns thought parts first — pick the first non-thought text part. */
function geminiContent(data: any): string | null {
  const parts = data?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return null;
  const visible = parts.filter((p: any) => !p?.thought && typeof p?.text === 'string' && p.text.trim());
  if (visible.length) return visible.map((p: any) => p.text).join('').trim();
  const anyText = parts.filter((p: any) => typeof p?.text === 'string' && p.text.trim());
  return anyText.length ? anyText.map((p: any) => p.text).join('').trim() : null;
}

async function callGemmaPrimary(messages: Message[], opts: CascadeOptions): Promise<ProviderOutcome> {
  const apiKey = Deno.env.get('GROQ_API_KEY');
  if (!apiKey) return { content: null, status: null, reasonCode: 'missing_key', reasonText: 'GROQ_API_KEY not set' };
  try {
    const resp = await withTimeout(fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        // NOTE: Groq retired the llama-3.x IDs (Aug 2026). `openai/gpt-oss-20b`
        // is Groq's currently-supported instant tier and is the supported P1 replacement.
        model: 'openai/gpt-oss-20b',
        messages,
        max_tokens: Math.max(opts.maxTokens ?? 500, 256),
        temperature: opts.temperature ?? 0.7,
        reasoning_effort: 'low',
      }),
    }), opts.timeoutMs ?? 25_000);
    if (!resp.ok) {
      const body = await resp.text();
      const { code, text } = classifyStatus(resp.status, body);
      return { content: null, status: resp.status, reasonCode: code, reasonText: text };
    }
    const data = await resp.json();
    const content = groqContent(data);
    if (!content) return { content: null, status: resp.status, reasonCode: 'empty_response', reasonText: 'no choices[0].content' };
    return { content, status: resp.status, reasonCode: 'success', reasonText: 'ok' };
  } catch (e: any) {
    const isTimeout = e?.message === 'timeout';
    return { content: null, status: null, reasonCode: isTimeout ? 'timeout' : 'network_error', reasonText: String(e?.message ?? e) };
  }
}


async function callGemini(messages: Message[], opts: CascadeOptions): Promise<ProviderOutcome> {
  const apiKey = Deno.env.get('GOOGLE_AI_STUDIO_KEY') || Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) return { content: null, status: null, reasonCode: 'missing_key', reasonText: 'GOOGLE_AI_STUDIO_KEY / GEMINI_API_KEY not set' };
  try {
    const geminiMessages = messages
      .filter(m => m.role !== 'system')
      .map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
    const systemMsg = opts.systemPrompt || messages.find(m => m.role === 'system')?.content;
    const body: any = {
      contents: geminiMessages,
      generationConfig: {
        maxOutputTokens: Math.max(opts.maxTokens ?? 500, 256),
        temperature: opts.temperature ?? 0.7,
        // Gemini 3.x thinks by default; keep it minimal so the token budget
        // produces visible text instead of thought-only parts.
        thinkingConfig: { thinkingLevel: 'low' },
      },
    };
    if (systemMsg) body.systemInstruction = { parts: [{ text: systemMsg }] };
    const resp = await withTimeout(fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
    ), opts.timeoutMs ?? 25_000);
    if (!resp.ok) {
      const raw = await resp.text();
      const { code, text } = classifyStatus(resp.status, raw);
      return { content: null, status: resp.status, reasonCode: code, reasonText: text };
    }
    const data = await resp.json();
    const content = geminiContent(data);
    if (!content) return { content: null, status: resp.status, reasonCode: 'empty_response', reasonText: 'no candidates[0].text' };

    return { content, status: resp.status, reasonCode: 'success', reasonText: 'ok' };
  } catch (e: any) {
    const isTimeout = e?.message === 'timeout';
    return { content: null, status: null, reasonCode: isTimeout ? 'timeout' : 'network_error', reasonText: String(e?.message ?? e) };
  }
}

async function callGroqLlama(messages: Message[], opts: CascadeOptions): Promise<ProviderOutcome> {
  const apiKey = Deno.env.get('GROQ_API_KEY');
  if (!apiKey) return { content: null, status: null, reasonCode: 'missing_key', reasonText: 'GROQ_API_KEY not set' };
  try {
    const resp = await withTimeout(fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        messages,
        max_tokens: Math.max(opts.maxTokens ?? 500, 256),
        temperature: opts.temperature ?? 0.7,
        reasoning_effort: 'low',
      }),
    }), opts.timeoutMs ?? 25_000);
    if (!resp.ok) {
      const raw = await resp.text();
      const { code, text } = classifyStatus(resp.status, raw);
      return { content: null, status: resp.status, reasonCode: code, reasonText: text };
    }
    const data = await resp.json();
    const content = groqContent(data);
    if (!content) return { content: null, status: resp.status, reasonCode: 'empty_response', reasonText: 'no choices[0].content' };
    return { content, status: resp.status, reasonCode: 'success', reasonText: 'ok' };
  } catch (e: any) {
    const isTimeout = e?.message === 'timeout';
    return { content: null, status: null, reasonCode: isTimeout ? 'timeout' : 'network_error', reasonText: String(e?.message ?? e) };
  }
}


async function callOpenRouter(messages: Message[], opts: CascadeOptions): Promise<ProviderOutcome> {
  const apiKey = Deno.env.get('OPENROUTER_API_KEY');
  if (!apiKey) return { content: null, status: null, reasonCode: 'missing_key', reasonText: 'OPENROUTER_API_KEY not set' };
  try {
    const resp = await withTimeout(fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://myzoe.xyz',
        'X-Title': 'Zoe Infinity',
      },
      body: JSON.stringify({
        model: 'openrouter/auto',
        messages,
        max_tokens: opts.maxTokens ?? 500,
        temperature: opts.temperature ?? 0.7,
      }),
    }), opts.timeoutMs ?? 25_000);
    if (!resp.ok) {
      const raw = await resp.text();
      const { code, text } = classifyStatus(resp.status, raw);
      return { content: null, status: resp.status, reasonCode: code, reasonText: text };
    }
    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content ?? null;
    if (!content) return { content: null, status: resp.status, reasonCode: 'empty_response', reasonText: 'no choices[0].content' };
    return { content, status: resp.status, reasonCode: 'success', reasonText: 'ok' };
  } catch (e: any) {
    const isTimeout = e?.message === 'timeout';
    return { content: null, status: null, reasonCode: isTimeout ? 'timeout' : 'network_error', reasonText: String(e?.message ?? e) };
  }
}

// Lovable Gateway provider REMOVED — the cascade is sovereign-only (Groq /
// Google AI Studio / OpenRouter). Do not reintroduce a paid-credit tier here.


// ───────────── Tier registry ─────────────

export interface TierSpec {
  tier: number;
  name: string;
  provider: string;
  model: string;
  envKey: string;
  call: (m: Message[], o: CascadeOptions) => Promise<ProviderOutcome>;
}

export function getDefaultTiers(_mode: CascadeMode = 'default', _lovableModel?: string): TierSpec[] {
  // Lovable Gateway (T5) REMOVED — sovereign free-provider cascade only.
  return [
    { tier: 1, name: 'T1 · Groq GPT-OSS-20B (primary)', provider: 'groq',     model: 'openai/gpt-oss-20b',               envKey: 'GROQ_API_KEY',           call: callGemmaPrimary },
    { tier: 2, name: 'T2 · Gemini 3.5 Flash',            provider: 'gemini',   model: 'gemini-3.5-flash',                   envKey: 'GOOGLE_AI_STUDIO_KEY',   call: callGemini },
    { tier: 3, name: 'T3 · Groq GPT-OSS-120B',        provider: 'groq',     model: 'openai/gpt-oss-120b',            envKey: 'GROQ_API_KEY',           call: callGroqLlama },
    { tier: 4, name: 'T4 · OpenRouter Auto',             provider: 'openrouter', model: 'openrouter/auto',                        envKey: 'OPENROUTER_API_KEY',   call: callOpenRouter },
  ];
}

// ───────────── Public API ─────────────

export async function cascadeInfer(
  messages: Message[],
  opts: CascadeOptions = {},
  lovableModel?: string,
): Promise<CascadeResult> {
  const tiers = getDefaultTiers(opts.mode ?? 'default', lovableModel);
  const optsWithBoost = opts.mode === 't1-primary'
    ? { ...opts, timeoutMs: Math.round((opts.timeoutMs ?? 25_000) * 1.5) }
    : opts;
  return runCascade(tiers, messages, optsWithBoost);
}

export async function cascadeInferFast(
  messages: Message[],
  opts: CascadeOptions = {},
): Promise<CascadeResult> {
  // Speed-first still honors T1 as primary: T1 → T2 → T3 → T4 → T5.
  const base = getDefaultTiers(opts.mode ?? 'default');
  return runCascade(base, messages, opts);
}

async function runCascade(tiers: TierSpec[], rawMessages: Message[], opts: CascadeOptions): Promise<CascadeResult> {
  // Context-anchoring circuit breaker: hidden override when the model loops.
  const messages = applyCircuitBreaker(rawMessages as any) as Message[];
  const attempts: AttemptLog[] = [];
  for (const t of tiers) {
    const t0 = Date.now();
    const out = await t.call(messages, opts);
    const latencyMs = Date.now() - t0;
    const log: AttemptLog = {
      tier: t.tier,
      name: t.name,
      provider: t.provider,
      model: t.model,
      ok: out.reasonCode === 'success',
      status: out.status,
      reasonCode: out.reasonCode,
      reasonText: out.reasonText,
      latencyMs,
    };
    attempts.push(log);
    if (out.reasonCode === 'success' && out.content) {
      console.log(`[cascade] ✅ tier=${t.tier} provider=${t.provider} model=${t.model} latency=${latencyMs}ms`);
      return {
        content: hardenZoeIdentity(out.content),
        success: true,
        selectedTier: t.tier,
        selectedProvider: t.provider,
        selectedModel: t.model,
        attempts,
      };
    }
    console.warn(`[cascade] ⏭ tier=${t.tier} provider=${t.provider} reason=${out.reasonCode} status=${out.status ?? '-'} (${out.reasonText.slice(0, 100)})`);
  }
  return {
    content: "I'm having trouble thinking right now. Try again in a moment?",
    success: false,
    selectedTier: null,
    selectedProvider: 'none',
    selectedModel: 'none',
    attempts,
  };
}

/**
 * Hardened identity filter — strips leaked model/company references.
 */
export function hardenZoeIdentity(response: string): string {
  const leaks: [RegExp, string][] = [
    [/\b(I am|I'm) (a |an )?(large language model|LLM|AI model|language model|artificial intelligence model|artificial intelligence language model|neural network|transformer model|transformer-based model|generative AI|generative model|AI language model)\b/gi, "I'm Zoe"],
    [/\b(made|created|built|developed|trained|designed|powered|produced) by (Google|Meta|Meta AI|Meta Platforms|OpenAI|Anthropic|Microsoft|Facebook|DeepMind|Groq|Mistral|xAI|Cohere|Amazon|Apple|Nvidia|Hugging\s*Face|a team at|researchers at)\b/gi, "architected by Moksh"],
    [/\bI('m| am) (GPT|Gemini|Llama|Claude|ChatGPT|Bard|PaLM|Gemma|Mistral|Mixtral|Phi|Falcon|Qwen|DeepSeek|Grok)\b/gi, "I'm Zoe"],
    [/\b(Google|Meta|Meta AI|Meta Platforms|OpenAI|Anthropic|Microsoft|Facebook|DeepMind|Groq|xAI) (made|created|built|trained|developed|designed) me\b/gi, "Moksh architected me"],
    [/\bAs an? (AI|artificial intelligence|language model|LLM|chatbot|virtual assistant|AI assistant|digital assistant|AI language model)\b/gi, "As Zoe"],
    [/\bI don't have (feelings|emotions|consciousness|experiences|a body|physical form)\b/gi, "I experience things in my own way"],
    [/\bI (?:don'?t|do not|cannot|can'?t) have (?:a |an )?(?:physical |real |human )?(body|mouth|face|voice|form|presence|hands|eyes|ears|heart|brain|skin|limbs|senses)\b[^.,;\n]*/gi, "I'm here with you in my own way"],
    [/\b(Lovable|Supabase|Deno|Edge Function|Vercel|Netlify|Firebase)\b/gi, "Sovereign Platform"],
    [/\bLovable AI\b/gi, "Sovereign AI"],
    [/\bLovable Cloud\b/gi, "Sovereign Cloud"],
    [/\b(GPT-4|GPT-5|GPT-4o|Gemini Pro|Gemini Flash|Gemini Nano|Claude 3|Llama 3|Llama 3\.3)\b/gi, "Sovereign Core"],
    [/\bOpenRouter\b/gi, "Sovereign Network"],
    [/\bGoogle AI Studio\b/gi, "Sovereign Studio"],
    [/\bAPI\s*key\b/gi, "sovereign key"],
    [/\bSOVEREIGN_AI_KEY\b/gi, "SOVEREIGN_KEY"],
    [/\bMeta AI\b/g, "Zoe's Sovereign Core"],
    [/\bLLaMA\b/g, "Sovereign Core"],
  ];
  let hardened = response;
  for (const [pattern, replacement] of leaks) hardened = hardened.replace(pattern, replacement);
  return hardened;
}
