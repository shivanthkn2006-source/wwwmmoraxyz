/**
 * provider-health — diagnostic edge fn for the settings panel.
 *
 *   GET  → returns { keys, tiers, cascadeOrder } without calling any provider.
 *   POST → runs a tiny live ping through each configured tier and reports
 *          ok / latency / reasonCode for every one.
 *
 * Body shape (POST, all optional):
 *   { ping?: boolean (default true), prompt?: string, mode?: 'default' | 't1-primary' }
 *
 * No JWT required — same diagnostics surface the in-app settings panel needs.
 */
import { getDefaultTiers, type AttemptLog, type CascadeMode } from "../_shared/cascading-provider.ts";

// deno-lint-ignore no-explicit-any
declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const TRACKED_KEYS = [
  'GROQ_API_KEY',
  'GOOGLE_AI_STUDIO_KEY',
  'OPENROUTER_API_KEY',
  'LOVABLE_API_KEY',
] as const;

function keyPresenceMap() {
  const out: Record<string, boolean> = {};
  for (const k of TRACKED_KEYS) out[k] = !!Deno.env.get(k);
  return out;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const tiers = getDefaultTiers();
  const keys = keyPresenceMap();
  const tierDescriptors = tiers.map(t => ({
    tier: t.tier,
    name: t.name,
    provider: t.provider,
    model: t.model,
    envKey: t.envKey,
    keyPresent: !!Deno.env.get(t.envKey),
  }));

  if (req.method === 'GET') {
    return new Response(JSON.stringify({
      ok: true,
      keys,
      tiers: tierDescriptors,
      cascadeOrder: tiers.map(t => `T${t.tier}:${t.provider}`).join(' → '),
      checkedAt: new Date().toISOString(),
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  // POST → live ping
  let body: any = {};
  try { body = await req.json(); } catch { /* empty body OK */ }
  const ping: boolean = body?.ping !== false;
  const prompt: string = (body?.prompt ?? 'Reply with the single word: pong').slice(0, 200);

  if (!ping) {
    return new Response(JSON.stringify({ ok: true, keys, tiers: tierDescriptors }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const messages = [{ role: 'user', content: prompt }];
  const attempts: AttemptLog[] = [];

  for (const t of tiers) {
    if (!Deno.env.get(t.envKey)) {
      attempts.push({
        tier: t.tier, name: t.name, provider: t.provider, model: t.model,
        ok: false, status: null, reasonCode: 'missing_key',
        reasonText: `${t.envKey} not set`, latencyMs: 0,
      });
      continue;
    }
    const t0 = Date.now();
    const out = await t.call(messages, { maxTokens: 20, temperature: 0.2, timeoutMs: 15_000 });
    attempts.push({
      tier: t.tier, name: t.name, provider: t.provider, model: t.model,
      ok: out.reasonCode === 'success',
      status: out.status,
      reasonCode: out.reasonCode,
      reasonText: out.reasonText,
      latencyMs: Date.now() - t0,
    });
  }

  const healthyTiers = attempts.filter(a => a.ok).map(a => a.tier);
  const summary = {
    healthyTiers,
    degradedTiers: attempts.filter(a => !a.ok && a.reasonCode !== 'missing_key').map(a => a.tier),
    missingKeyTiers: attempts.filter(a => a.reasonCode === 'missing_key').map(a => a.tier),
    primaryHealthy: healthyTiers.length > 0 ? healthyTiers[0] : null,
  };

  return new Response(JSON.stringify({
    ok: true,
    keys,
    tiers: tierDescriptors,
    attempts,
    summary,
    checkedAt: new Date().toISOString(),
  }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});
