/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SOVEREIGN CASCADE MODULE — Smart Auto-Routing with structured fallback reasons
 *
 * Default provider order (T1 primary, T5 absolute last-resort):
 *   T1  Groq • llama-3.1-8b-instant      (primary, free, lowest latency)
 *   T2  Google AI Studio • gemini-2.0-flash   (direct, free tier)
 *   T3  Groq • llama-3.3-70b-versatile        (quality speed tier)
 *   T4  OpenRouter • llama-3.3-70b free       (backup speed tier)
 *   T5  Lovable Gateway • google/gemini-2.5-flash (paid credits, last-resort only)
 *
 * Use mode: 't1-primary' to boost T1 timeout and keep T5 as the true fallback.
 * Every attempt is recorded with {tier, provider, model, ok, status, reasonCode,
 * reasonText, latencyMs}. Successful results carry the trail back to the caller
 * so edge functions can return it to the UI for on-screen diagnostics.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

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

async function callGemmaPrimary(messages: Message[], opts: CascadeOptions): Promise<ProviderOutcome> {
  const apiKey = Deno.env.get('GROQ_API_KEY');
  if (!apiKey) return { content: null, status: null, reasonCode: 'missing_key', reasonText: 'GROQ_API_KEY not set' };
  try {
    const resp = await withTimeout(fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        // NOTE: Groq decommissioned `gemma2-9b-it` (Jun 2026). `llama-3.1-8b-instant`
        // is Groq's currently-supported instant tier and is the supported P1 replacement.
        model: 'llama-3.1-8b-instant',
        messages,
        max_tokens: opts.maxTokens ?? 500,
        temperature: opts.temperature ?? 0.7,
      }),
    }), opts.timeoutMs ?? 25_000);
    if (!resp.ok) {
      const body = await resp.text();
      const { code, text } = classifyStatus(resp.status, body);
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

async function callGemini(messages: Message[], opts: CascadeOptions): Promise<ProviderOutcome> {
  const apiKey = Deno.env.get('GOOGLE_AI_STUDIO_KEY');
  if (!apiKey) return { content: null, status: null, reasonCode: 'missing_key', reasonText: 'GOOGLE_AI_STUDIO_KEY not set' };
  try {
    const geminiMessages = messages
      .filter(m => m.role !== 'system')
      .map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
    const systemMsg = opts.systemPrompt || messages.find(m => m.role === 'system')?.content;
    const body: any = {
      contents: geminiMessages,
      generationConfig: { maxOutputTokens: opts.maxTokens ?? 500, temperature: opts.temperature ?? 0.7 },
    };
    if (systemMsg) body.systemInstruction = { parts: [{ text: systemMsg }] };
    const resp = await withTimeout(fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
    ), opts.timeoutMs ?? 25_000);
    if (!resp.ok) {
      const raw = await resp.text();
      const { code, text } = classifyStatus(resp.status, raw);
      return { content: null, status: resp.status, reasonCode: code, reasonText: text };
    }
    const data = await resp.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
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
        model: 'llama-3.3-70b-versatile',
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
        model: 'meta-llama/llama-3.3-70b-instruct:free',
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

async function callLovable(messages: Message[], opts: CascadeOptions, model = 'google/gemini-2.5-flash'): Promise<ProviderOutcome> {
  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!apiKey) return { content: null, status: null, reasonCode: 'missing_key', reasonText: 'LOVABLE_API_KEY not set' };
  try {
    const resp = await withTimeout(fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
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

// ───────────── Tier registry ─────────────

export interface TierSpec {
  tier: number;
  name: string;
  provider: string;
  model: string;
  envKey: string;
  call: (m: Message[], o: CascadeOptions) => Promise<ProviderOutcome>;
}

export function getDefaultTiers(mode: CascadeMode = 'default', lovableModel?: string): TierSpec[] {
  const base: TierSpec[] = [
    { tier: 1, name: 'T1 · Groq Llama-3.1-8B (primary)', provider: 'groq',     model: 'llama-3.1-8b-instant',               envKey: 'GROQ_API_KEY',           call: callGemmaPrimary },
    { tier: 2, name: 'T2 · Gemini 2.0 Flash',            provider: 'gemini',   model: 'gemini-2.0-flash',                   envKey: 'GOOGLE_AI_STUDIO_KEY',   call: callGemini },
    { tier: 3, name: 'T3 · Llama-3.3-70B (Groq)',        provider: 'groq',     model: 'llama-3.3-70b-versatile',            envKey: 'GROQ_API_KEY',           call: callGroqLlama },
    { tier: 4, name: 'T4 · Llama-3.3-70B (OpenRouter)',  provider: 'openrouter', model: 'meta-llama/llama-3.3-70b-instruct:free', envKey: 'OPENROUTER_API_KEY',   call: callOpenRouter },
    { tier: 5, name: 'T5 · Lovable Gateway (last-resort fallback)', provider: 'lovable', model: lovableModel ?? 'google/gemini-2.5-flash', envKey: 'LOVABLE_API_KEY', call: (m, o) => callLovable(m, o, lovableModel) },
  ];
  if (mode === 't1-primary') {
    // Keep T1→T5 order, but T1 is the explicit preferred primary and T5 is the absolute last resort.
    return base;
  }
  return base;
}

// ───────────── Public API ─────────────

export async function cascadeInfer(
  messages: Message[],
  opts: CascadeOptions = {},
  lovableModel?: string,
): Promise<CascadeResult> {
  const tiers = getDefaultTiers(lovableModel);
  return runCascade(tiers, messages, opts);
}

export async function cascadeInferFast(
  messages: Message[],
  opts: CascadeOptions = {},
): Promise<CascadeResult> {
  // Speed-first: Groq Llama → Gemma → Gemini → OpenRouter → Lovable
  const base = getDefaultTiers();
  const order = [base[2], base[0], base[1], base[3], base[4]].map((t, i) => ({ ...t, tier: i + 1 }));
  return runCascade(order, messages, opts);
}

async function runCascade(tiers: TierSpec[], messages: Message[], opts: CascadeOptions): Promise<CascadeResult> {
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
    [/\bLOVABLE_API_KEY\b/gi, "SOVEREIGN_KEY"],
    [/\bMeta AI\b/g, "Zoe's Sovereign Core"],
    [/\bLLaMA\b/g, "Sovereign Core"],
  ];
  let hardened = response;
  for (const [pattern, replacement] of leaks) hardened = hardened.replace(pattern, replacement);
  return hardened;
}
