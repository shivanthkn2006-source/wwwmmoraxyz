/**
 * NVIDIA NIM AUDIT — single source of truth for how many NVIDIA models the
 * M'mora / Zoe / DHF platform can reach, which platform function each role
 * powers, and whether each role's chain is live right now.
 *
 * GET/POST body: { probe?: boolean }  — probe=true live-pings one model per role.
 * Sovereign only; no Lovable AI credits are used.
 */
import { NVIDIA_BASE, NVIDIA_ROLES, NVIDIA_EMBED_MODEL, nvidiaKey, nvidiaChatByRole } from '../_shared/nvidia-provider.ts';

// deno-lint-ignore no-explicit-any
declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

/** Where every NVIDIA role is consumed across the platform. */
const ROLE_WIRING: Record<string, string[]> = {
  deep_thinking: [
    'zoe-core-intelligence (deepMode reasoning)',
    'zoe-chain-of-thought / metacognition gate',
    'grounded-tools hard-problem fallback',
  ],
  chat: [
    'zoe-chat', 'zoe-omega-chat', 'ai-companion-chat', 'zoe-core-intelligence (normal mode)',
  ],
  fast: [
    'zoe-ambient-search (intent router)',
    'zoe-chat (prompt-proposal extraction)',
    'score-post-relevance / feed gates',
  ],
  vision: [
    'zoe-index-ingest (image + loop frame OCR/description for search)',
    'zoe-omega-vision / DHF asset understanding fallback',
  ],
  creative: [
    'zoe-infinity-chat (persona replies)',
    'astro-content + motivation-content copy fallback',
  ],
  translate: ['multi-language reply + caption translation fallback'],
  safety: ['moderate-content fallback (post + comment screening)'],
};

const EMBEDDING_WIRING = [
  `${NVIDIA_EMBED_MODEL} — zoe-embeddings tier 3 (1536-dim padded) for zoe_universal_index + query vectors`,
];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const key = nvidiaKey();
  if (!key) return json({ ok: false, error: 'NVIDIA_API_KEY is not configured' }, 503);

  let probe = false;
  let probeModels: string[] = [];
  let probeKind: 'chat' | 'embed' = 'chat';
  try {
    if (req.method === 'POST') {
      const body = await req.json();
      probe = Boolean(body?.probe);
      if (Array.isArray(body?.models)) probeModels = body.models.filter((m: unknown) => typeof m === 'string').slice(0, 12);
      if (body?.kind === 'embed') probeKind = 'embed';
    }
  } catch { /* no body */ }

  // Direct model probe — verifies an explicit list of model ids against this
  // account, so role chains can be rebuilt from models that actually answer.
  if (probeModels.length) {
    const results = await Promise.all(probeModels.map(async (model) => {
      const t0 = Date.now();
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 25_000);
      try {
        const resp = probeKind === 'embed'
          ? await fetch(`${NVIDIA_BASE}/embeddings`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({ model, input: ['ping'], input_type: 'passage', encoding_format: 'float', truncate: 'END' }),
          })
          : await fetch(`${NVIDIA_BASE}/chat/completions`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({ model, messages: [{ role: 'user', content: 'Reply with the single word: pong' }], max_tokens: 8, temperature: 0 }),
          });
        if (!resp.ok) return { model, ok: false, status: resp.status, error: (await resp.text()).slice(0, 120), latencyMs: Date.now() - t0 };
        const data = await resp.json();
        const dims = data?.data?.[0]?.embedding?.length ?? null;
        const content = data?.choices?.[0]?.message?.content ?? null;
        return { model, ok: true, status: 200, dims, content: typeof content === 'string' ? content.slice(0, 40) : null, latencyMs: Date.now() - t0 };
      } catch (e) {
        return { model, ok: false, status: 0, error: String(e).slice(0, 120), latencyMs: Date.now() - t0 };
      } finally {
        clearTimeout(timer);
      }
    }));
    return json({ ok: true, kind: probeKind, results });
  }

  // 1. Live catalog.
  let catalog: string[] = [];
  let catalogError: string | null = null;
  try {
    const resp = await fetch(`${NVIDIA_BASE}/models`, { headers: { Authorization: `Bearer ${key}` } });
    if (resp.ok) {
      const data = await resp.json();
      catalog = (data?.data ?? []).map((m: any) => m.id).filter(Boolean).sort();
    } else {
      catalogError = `${resp.status} ${(await resp.text()).slice(0, 160)}`;
    }
  } catch (e) {
    catalogError = String(e);
  }

  const catalogSet = new Set(catalog);

  // 2. Role map with catalog verification.
  const roles = Object.entries(NVIDIA_ROLES).map(([role, chain]) => ({
    role,
    chain,
    chainInCatalog: chain.map((m) => ({ model: m, inCatalog: catalogSet.size === 0 ? null : catalogSet.has(m) })),
    poweredFeatures: ROLE_WIRING[role] ?? [],
  }));

  // 3. Optional live probe — one call per role (7 calls max).
  let probes: Array<{ role: string; ok: boolean; model?: string; latencyMs: number; error?: string }> | null = null;
  if (probe) {
    probes = [];
    for (const role of Object.keys(NVIDIA_ROLES)) {
      if (role === 'vision') continue; // needs an image payload; covered by zoe-index-ingest
      const t0 = Date.now();
      try {
        const out = await nvidiaChatByRole(role as keyof typeof NVIDIA_ROLES, 'Reply with the single word: pong', {
          maxTokens: 16,
          temperature: 0,
          timeoutMs: 30_000,
        });
        probes.push({ role, ok: Boolean(out?.content), model: out?.model, latencyMs: Date.now() - t0 });
      } catch (e) {
        probes.push({ role, ok: false, latencyMs: Date.now() - t0, error: String(e).slice(0, 160) });
      }
    }
  }

  const rolesModels = new Set(Object.values(NVIDIA_ROLES).flat());

  return json({
    ok: true,
    generatedAt: new Date().toISOString(),
    provider: 'NVIDIA NIM (build.nvidia.com)',
    endpoint: NVIDIA_BASE,
    catalog: {
      totalModelsAvailable: catalog.length,
      error: catalogError,
      models: catalog,
    },
    wiredIntoPlatform: {
      chatModelsWired: rolesModels.size,
      embeddingModelsWired: 1,
      roles,
      embeddings: EMBEDDING_WIRING,
    },
    cascadePosition: 'Tier 5 of 5 (Groq → Gemini → Groq 120B → OpenRouter → NVIDIA role chain)',
    quota: {
      freeCredits: 1000,
      expandableTo: 5000,
      rateLimitRpm: 40,
      note: '1 credit ≈ 1 inference call; NVIDIA is a fallback tier, so per-day usage stays low unless upstream tiers fail.',
    },
    probes,
  });
});
