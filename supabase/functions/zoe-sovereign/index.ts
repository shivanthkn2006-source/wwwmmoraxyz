/**
 * Zoe Evolution Engine — parts 2-6 of the Sovereign spec, one endpoint.
 *  action "vision"   : camera frame → NVIDIA VLM → Google Vision → Groq vision → OpenRouter free vision
 *  action "research" : Poe research → SerpAPI Google → SerpAPI News → DuckDuckGo (keyless)
 *  action "think"    : dual-track brain — private draft + self-check, then spoken reply
 *                      (Groq → OpenRouter free → NVIDIA → Ollama)
 *  action "dispatch" : Sovereign action bus — whitelisted MMORA actions only
 *  action "selftest" : proves each cascade switches over (forces tier-1 failure)
 * Never uses Lovable, Microsoft/Azure, OpenAI or paid APIs.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { executeWithFallback, breakerState, type ProviderTask } from '../_shared/circuit-breaker.ts';
import { nvidiaVision, nvidiaChatByRole } from '../_shared/nvidia-provider.ts';
import { publicGuard } from '../_shared/public-guard.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const env = (k: string) => Deno.env.get(k) || '';
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

async function postJson(url: string, body: unknown, headers: Record<string, string> = {}, ms = 10_000) {
  const c = new AbortController(); const t = setTimeout(() => c.abort(), ms);
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body), signal: c.signal });
    if (!r.ok) throw new Error(`HTTP ${r.status} ${(await r.text()).slice(0, 120)}`);
    return await r.json();
  } finally { clearTimeout(t); }
}
async function getJson(url: string, ms = 8_000) {
  const c = new AbortController(); const t = setTimeout(() => c.abort(), ms);
  try { const r = await fetch(url, { signal: c.signal }); if (!r.ok) throw new Error(`HTTP ${r.status}`); return await r.json(); }
  finally { clearTimeout(t); }
}
async function firstModel(url: string, key: string, models: string[], build: (m: string) => unknown, ms = 15_000) {
  let last = 'no_model';
  for (const m of models) {
    try { const c = chatContent(await postJson(url, build(m), { Authorization: `Bearer ${key}` }, ms)); if (c) return c; } catch (e) { last = String((e as Error).message); }
  }
  throw new Error(last);
}
const chatContent = (d: any) => { const s = d?.choices?.[0]?.message?.content; return typeof s === 'string' && s.trim() ? s : null; };

// Chinese open models lead each list (Qwen, DeepSeek, Kimi, GLM); free tiers only.
const GROQ_TEXT = ['qwen/qwen3-32b', 'llama-3.1-8b-instant', 'moonshotai/kimi-k2-instruct-0905', 'moonshotai/kimi-k2-instruct', 'llama-3.3-70b-versatile'];
const OR_TEXT = ['deepseek/deepseek-chat-v3.1:free', 'qwen/qwen3-235b-a22b:free', 'z-ai/glm-4.5-air:free', 'moonshotai/kimi-k2:free', 'deepseek/deepseek-r1-0528:free'];
const GROQ_VISION = ['meta-llama/llama-4-scout-17b-16e-instruct', 'meta-llama/llama-4-maverick-17b-128e-instruct'];
// Direct Chinese providers (used after NVIDIA/Google/Groq/OpenRouter fail).
const SF_TEXT = ['Qwen/Qwen2.5-7B-Instruct', 'THUDM/glm-4-9b-chat', 'deepseek-ai/DeepSeek-V3'];
const SF_VISION = ['Qwen/Qwen2.5-VL-72B-Instruct', 'Qwen/Qwen2.5-VL-32B-Instruct', 'Qwen/Qwen2.5-VL-7B-Instruct', 'THUDM/GLM-4.1V-9B-Thinking', 'zai-org/GLM-4.5V'];
const ZP_TEXT = ['glm-4-flash', 'glm-4.5-flash', 'glm-4.7-flash', 'glm-4-flash-250414'];
const ZP_VISION = ['glm-4v-flash', 'glm-4.6v-flash', 'glm-4.1v-thinking-flash', 'glm-4.5v'];
// China and international hosts: a key only works on the site it was made on.
const SF_HOSTS = ['https://api.siliconflow.cn/v1/chat/completions', 'https://api.siliconflow.com/v1/chat/completions'];
const ZP_HOSTS = ['https://open.bigmodel.cn/api/paas/v4/chat/completions', 'https://api.z.ai/api/paas/v4/chat/completions'];
async function tryHosts<T>(hosts: string[], run: (u: string) => Promise<T>): Promise<T> {
  let last: unknown = null;
  for (const h of hosts) { try { return await run(h); } catch (e) { last = e; } }
  throw last ?? new Error('no_host');
}
const OR_VISION = ['qwen/qwen2.5-vl-72b-instruct:free', 'qwen/qwen2.5-vl-32b-instruct:free', 'moonshotai/kimi-vl-a3b-thinking:free', 'google/gemma-3-27b-it:free'];

// ─── Part 2: vision ─────────────────────────────────────────────────────────
const VISION_PROMPT = 'You are Zoe\'s eyes. Look at this camera frame of the member. Reply ONLY JSON: {"objects":[...],"attire":"what they wear, colours","scene":"short","mood":"neutral|happy|tired|sad|focused","lighting":"optimal|low|harsh","summary":"one friendly sentence"}';
function parseVision(raw: string) {
  const txt = (v: any): string => v == null ? '' : typeof v === 'string' ? v : Array.isArray(v) ? v.map(txt).filter(Boolean).join(', ')
    : typeof v === 'object' ? String(v.name ?? v.label ?? v.item ?? v.description ?? Object.values(v).map(txt).filter(Boolean).join(' ')) : String(v);
  const m = raw.match(/\{[\s\S]*\}/);
  try {
    const j = JSON.parse(m ? m[0] : raw);
    const objects = (Array.isArray(j.objects) ? j.objects : []).map(txt).filter(Boolean).slice(0, 12);
    const attire = txt(j.attire ?? j.clothing ?? j.outfit);
    const summary = txt(j.summary) || [attire && `You're wearing ${attire}.`, objects.length && `I can see ${objects.slice(0, 4).join(', ')}.`].filter(Boolean).join(' ');
    return { objects, attire, scene: txt(j.scene), mood: txt(j.mood) || 'neutral', lighting: txt(j.lighting) || 'optimal', summary };
  } catch { return { objects: [], attire: '', scene: '', mood: 'neutral', lighting: 'optimal', summary: raw.replace(/```\w*/g, '').slice(0, 300) }; }
}
function visionProviders(dataUrl: string, forceFail = false): ProviderTask<any>[] {
  const b64 = dataUrl.split(',')[1] ?? '';
  const vlm = (url: string, key: string, models: string[]) => () =>
    firstModel(url, key, models, (model) => ({ model, temperature: 0.2, max_tokens: 400, messages: [{ role: 'user', content: [{ type: 'text', text: VISION_PROMPT }, { type: 'image_url', image_url: { url: dataUrl } }] }] }));
  return [
    { name: 'nvidia-vision', execute: async () => { if (forceFail) throw new Error('forced'); if (!env('NVIDIA_API_KEY')) throw new Error('no_key'); const r = await nvidiaVision(dataUrl, VISION_PROMPT, { timeoutMs: 14000, maxTokens: 250 }); return r ? parseVision(r) : null; } },
    { name: 'google-vision', execute: async () => {
      const key = env('GOOGLE_API_KEY'); if (!key) throw new Error('no_key');
      const d = await postJson(`https://vision.googleapis.com/v1/images:annotate?key=${key}`, { requests: [{ image: { content: b64 }, features: [{ type: 'OBJECT_LOCALIZATION', maxResults: 10 }, { type: 'LABEL_DETECTION', maxResults: 10 }, { type: 'FACE_DETECTION', maxResults: 1 }] }] });
      const a = d?.responses?.[0]; if (!a || a.error) throw new Error(a?.error?.message ?? 'empty');
      const objects = [...(a.localizedObjectAnnotations ?? []).map((o: any) => o.name), ...(a.labelAnnotations ?? []).map((l: any) => l.description)].slice(0, 12);
      const f = a.faceAnnotations?.[0]; const lk = (v?: string) => v === 'LIKELY' || v === 'VERY_LIKELY';
      const mood = f ? (lk(f.joyLikelihood) ? 'happy' : lk(f.sorrowLikelihood) ? 'sad' : 'neutral') : 'neutral';
      return { objects, attire: objects.filter((o: string) => /shirt|cap|hat|jacket|dress|glasses|top|sleeve|collar|hood/i.test(o)).join(', '), scene: objects.slice(0, 3).join(', '), mood, lighting: f && lk(f.underExposedLikelihood) ? 'low' : 'optimal', summary: `I can see ${objects.slice(0, 4).join(', ')}.` };
    } },
    { name: 'groq-vision', execute: async () => { const k = env('GROQ_API_KEY'); if (!k) throw new Error('no_key'); const r = await vlm('https://api.groq.com/openai/v1/chat/completions', k, GROQ_VISION)(); return r ? parseVision(r) : null; } },
    { name: 'openrouter-free-vision', execute: async () => { const k = env('OPENROUTER_API_KEY'); if (!k) throw new Error('no_key'); const r = await vlm('https://openrouter.ai/api/v1/chat/completions', k, OR_VISION)(); return r ? parseVision(r) : null; } },
    { name: 'siliconflow-qwen-vl', execute: async () => { const k = env('SILICONFLOW_API_KEY'); if (!k) throw new Error('no_key'); const r = await tryHosts(SF_HOSTS, (u) => vlm(u, k, SF_VISION)()); return r ? parseVision(r) : null; } },
    { name: 'zhipu-glm4v', execute: async () => { const k = env('ZHIPU_API_KEY'); if (!k) throw new Error('no_key'); const r = await tryHosts(ZP_HOSTS, (u) => vlm(u, k, ZP_VISION)()); return r ? parseVision(r) : null; } },
  ];
}

// ─── Part 3: Poe research ───────────────────────────────────────────────────
type Hit = { title: string; url: string; snippet: string };
function researchProviders(q: string, forceFail = false): ProviderTask<Hit[]>[] {
  const serp = (engine: string, pick: (d: any) => any[]) => async () => {
    if (forceFail && engine === 'google') throw new Error('forced');
    const k = env('SERPAPI_KEY'); if (!k) throw new Error('no_key');
    const d = await getJson(`https://serpapi.com/search.json?engine=${engine}&q=${encodeURIComponent(q)}&num=6&api_key=${encodeURIComponent(k)}`);
    const rows = pick(d).slice(0, 6).map((r: any) => ({ title: String(r.title ?? ''), url: String(r.link ?? ''), snippet: String(r.snippet ?? r.source?.name ?? '') })).filter((r: Hit) => r.title);
    return rows.length ? rows : null;
  };
  return [
    { name: 'serpapi-google', execute: serp('google', (d) => d?.organic_results ?? []) },
    { name: 'serpapi-news', execute: serp('google_news', (d) => d?.news_results ?? []) },
    { name: 'duckduckgo', execute: async () => {
      const d = await getJson(`https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_html=1&skip_disambig=1`);
      const rows: Hit[] = [];
      if (d?.AbstractText) rows.push({ title: d.Heading || q, url: d.AbstractURL || '', snippet: d.AbstractText });
      for (const t of (d?.RelatedTopics ?? []).slice(0, 5)) if (t?.Text) rows.push({ title: t.Text.slice(0, 80), url: t.FirstURL || '', snippet: t.Text });
      return rows.length ? rows : null;
    } },
    { name: 'wikipedia', execute: async () => {
      const d = await getJson(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(q)}&format=json&srlimit=5&origin=*`);
      const rows = (d?.query?.search ?? []).map((r: any) => ({ title: r.title, url: `https://en.wikipedia.org/wiki/${encodeURIComponent(r.title)}`, snippet: String(r.snippet).replace(/<[^>]+>/g, '') }));
      return rows.length ? rows : null;
    } },
  ];
}

// ─── Part 4: dual-track brain ───────────────────────────────────────────────
function llmProviders(system: string, user: string, forceFail = false): ProviderTask<string>[] {
  const oai = (url: string, key: string, models: string[]) => () => firstModel(url, key, models, (model) => ({ model, temperature: 0.4, max_tokens: 700, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }));
  return [
    { name: 'groq', execute: async () => { if (forceFail) throw new Error('forced'); const k = env('GROQ_API_KEY'); if (!k) throw new Error('no_key'); return oai('https://api.groq.com/openai/v1/chat/completions', k, GROQ_TEXT)(); } },
    { name: 'openrouter-free', execute: async () => { const k = env('OPENROUTER_API_KEY'); if (!k) throw new Error('no_key'); return oai('https://openrouter.ai/api/v1/chat/completions', k, OR_TEXT)(); } },
    { name: 'nvidia', execute: async () => (await nvidiaChatByRole('chat', user, { systemPrompt: system, maxTokens: 700, timeoutMs: 15_000 }))?.content ?? null },
    { name: 'siliconflow', execute: async () => { const k = env('SILICONFLOW_API_KEY'); if (!k) throw new Error('no_key'); return tryHosts(SF_HOSTS, (u) => oai(u, k, SF_TEXT)()); } },
    { name: 'zhipu', execute: async () => { const k = env('ZHIPU_API_KEY'); if (!k) throw new Error('no_key'); return tryHosts(ZP_HOSTS, (u) => oai(u, k, ZP_TEXT)()); } },
    { name: 'ollama', execute: async () => { const e = env('OLLAMA_ENDPOINT'); if (!e) throw new Error('no_key'); const d = await postJson(`${e.replace(/\/$/, '')}/api/chat`, { model: 'llama3.1', stream: false, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }, {}, 20_000); return d?.message?.content ?? null; } },
  ];
}

// ─── Part 5: sovereign action bus (whitelist only, never destructive) ───────
const ACTIONS: Record<string, { label: string; path?: string }> = {
  open_home: { label: 'Open Home', path: '/home' },
  open_dhf_calendar: { label: 'Open DHF calendar', path: '/dhf-calendar' },
  open_life_projection: { label: 'Open life projection', path: '/life-projection' },
  open_notifications: { label: 'Open notifications', path: '/notification-history' },
  open_calls: { label: 'Open calls', path: '/calls' },
  open_lol: { label: "Open Zoe's LOL", path: '/zoe-lol' },
  vision_off: { label: 'Turn Zoe vision off' },
  vision_on: { label: 'Turn Zoe vision on' },
  mute_voice: { label: 'Mute Zoe voice' },
};
function detectAction(text: string): string | null {
  const t = text.toLowerCase();
  if (/\b(open|show|go to|take me to)\b/.test(t)) {
    if (/dhf|calendar/.test(t)) return 'open_dhf_calendar';
    if (/life|projection|forecast/.test(t)) return 'open_life_projection';
    if (/notification/.test(t)) return 'open_notifications';
    if (/\bcalls?\b/.test(t)) return 'open_calls';
    if (/\blol\b|jokes?/.test(t)) return 'open_lol';
    if (/\bhome\b/.test(t)) return 'open_home';
  }
  if (/\b(mute|be quiet|stop talking)\b/.test(t)) return 'mute_voice';
  return null;
}

async function think(message: string, vision: any, research: Hit[] | null, name: string, forceFail = false) {
  const ctx = [vision ? `CAMERA NOW: ${JSON.stringify(vision)}` : 'CAMERA: not available', research?.length ? `RESEARCH:\n${research.map((r) => `- ${r.title}: ${r.snippet} (${r.url})`).join('\n')}` : ''].join('\n');
  // Track 1 — private inner monologue (never spoken)
  const inner = await executeWithFallback(llmProviders('You are Zoe\'s private inner monologue. In <=5 bullet points: what does the member really need, what facts from context apply, what could be wrong in a naive answer. Never invent camera details not in context.', `${ctx}\nMEMBER (${name}): ${message}`, forceFail));
  // Track 2 — spoken reply, checked against the draft
  const spoken = await executeWithFallback(llmProviders(`You are Zoe, warm and direct. Speak to ${name} in 1-3 short sentences. Use the private notes; only mention camera details that are in context; if camera unavailable, say you can't see right now.`, `${ctx}\nPRIVATE NOTES:\n${inner.value ?? '(none)'}\nMEMBER: ${message}`, forceFail));
  return { inner, spoken };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  const guard = await publicGuard(req, { name: 'zoe-sovereign', limit: 30, windowSeconds: 60 });
  if (guard.response) return guard.response;
  try {
    const auth = req.headers.get('Authorization') ?? '';
    const sb = createClient(env('SUPABASE_URL'), env('SUPABASE_ANON_KEY'), { global: { headers: { Authorization: auth } } });
    const { data: u } = await sb.auth.getUser();
    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? '');
    if (!u?.user && action !== 'selftest') return json({ error: 'unauthorized' }, 401);
    const name = String(body.name ?? u?.user?.user_metadata?.full_name ?? 'friend').split(' ')[0];

    if (action === 'vision') {
      const frame = String(body.frame ?? '');
      if (!frame.startsWith('data:image/') || frame.length > 2_500_000) return json({ error: 'bad_frame' }, 400);
      const r = await executeWithFallback(visionProviders(frame), 12_000);
      return json({ success: r.ok, analysis: r.value, provider: r.provider, trace: r.trace });
    }
    if (action === 'research') {
      const q = String(body.query ?? '').slice(0, 300); if (!q) return json({ error: 'no_query' }, 400);
      const r = await executeWithFallback(researchProviders(q), 9_000);
      return json({ success: r.ok, results: r.value ?? [], provider: r.provider, trace: r.trace });
    }
    if (action === 'think') {
      const msg = String(body.message ?? '').slice(0, 2000); if (!msg) return json({ error: 'no_message' }, 400);
      const needsResearch = /\b(latest|today|news|current|who is|what is|price|score|weather|when is)\b/i.test(msg);
      const research = needsResearch ? (await executeWithFallback(researchProviders(msg), 9_000)).value : null;
      const { inner, spoken } = await think(msg, body.vision ?? null, research, name);
      const suggested = detectAction(msg);
      return json({ success: spoken.ok, reply: spoken.value, provider: spoken.provider, inner_used: inner.ok, research_used: !!research?.length, action: suggested ? { id: suggested, ...ACTIONS[suggested] } : null, trace: { inner: inner.trace, spoken: spoken.trace } });
    }
    if (action === 'review') {
      // Thinking layer: private check of a draft before it is spoken. Never shown.
      const msg = String(body.message ?? '').slice(0, 2000); const draft = String(body.draft ?? '').slice(0, 4000);
      if (!msg || !draft) return json({ error: 'missing' }, 400);
      const research = String(body.research ?? '').slice(0, 3000);
      // Race every text provider; the first real answer wins (checking must be fast).
      const tasks = llmProviders(
        'You privately check Zoe\'s draft reply. If it is accurate, kind and answers the member, reply exactly APPROVED. Otherwise reply ONLY with the corrected reply in the same language, voice and length, no preamble. Never add facts not in the draft or research.',
        `MEMBER: ${msg}\n${research ? `RESEARCH:\n${research}\n` : ''}DRAFT: ${draft}`);
      const trace: any[] = [];
      const r = await Promise.any(tasks.map(async (t) => {
        const t0 = Date.now();
        try { const v = await t.execute(); if (!v) throw new Error('empty'); trace.push({ provider: t.name, status: 'ok', ms: Date.now() - t0 }); return { ok: true, value: v, provider: t.name, trace }; }
        catch (e) { trace.push({ provider: t.name, status: 'failed', ms: Date.now() - t0, error: String((e as Error).message).slice(0, 120) }); throw e; }
      }).concat([new Promise((_, j) => setTimeout(() => j(new Error('timeout')), 10_000))])).catch(() => ({ ok: false, value: null, provider: null, trace }));
      const out = String(r.value ?? '').trim();
      if (!r.ok || !out) return json({ success: false, provider: r.provider, trace: r.trace });
      const approved = /^approved\.?$/i.test(out);
      return json({ success: true, changed: !approved, reply: approved ? draft : out, provider: r.provider, trace: r.trace });
    }
    if (action === 'keycheck') {
      const tiny = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
      const out: Record<string, string> = {};
      for (const t of [...visionProviders(tiny), ...llmProviders('Reply OK.', 'ping')]) {
        try { const v = await Promise.race([t.execute(), new Promise((_, j) => setTimeout(() => j(new Error('timeout')), 15000))]); out[t.name] = v ? 'ok' : 'empty'; }
        catch (e) { out[t.name] = String((e as Error).message).slice(0, 160); }
      }
      return json(out);
    }
    if (action === 'dispatch') {
      const id = String(body.id ?? ''); const a = ACTIONS[id];
      if (!a) return json({ success: false, error: 'action_not_allowed' }, 400);
      return json({ success: true, action: { id, ...a } });
    }
    if (action === 'selftest') {
      // Part 6: tier 1 is forced to fail; a pass means the next tier answered.
      const tiny = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
      const [v, r, l] = await Promise.all([
        executeWithFallback(visionProviders(tiny, true), 12_000),
        executeWithFallback(researchProviders('Deepgram text to speech', true), 9_000),
        executeWithFallback(llmProviders('Reply with the single word OK.', 'ping', true), 15_000),
      ]);
      const realQ = String(body.query ?? '');
      const real = realQ ? await executeWithFallback(researchProviders(realQ), 9_000) : null;
      const pass = (x: any) => x.trace[0]?.status === 'failed' && x.ok;
      return json({ vision: { pass: pass(v), provider: v.provider, trace: v.trace }, research: { pass: pass(r), provider: r.provider, trace: r.trace }, brain: { pass: pass(l), provider: l.provider, trace: l.trace }, real_question: real ? { query: realQ, provider: real.provider, top: (real.value ?? []).slice(0, 3) } : null, dispatch: { pass: detectAction('open my dhf calendar') === 'open_dhf_calendar' && !ACTIONS['delete_account'] }, breaker: breakerState() });
    }
    return json({ error: 'unknown_action' }, 400);
  } catch (e) {
    return json({ success: false, error: String((e as Error)?.message ?? e) }, 500);
  }
});
