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
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } finally { clearTimeout(t); }
}
async function getJson(url: string, ms = 8_000) {
  const c = new AbortController(); const t = setTimeout(() => c.abort(), ms);
  try { const r = await fetch(url, { signal: c.signal }); if (!r.ok) throw new Error(`HTTP ${r.status}`); return await r.json(); }
  finally { clearTimeout(t); }
}
const chatContent = (d: any) => { const s = d?.choices?.[0]?.message?.content; return typeof s === 'string' && s.trim() ? s : null; };

// ─── Part 2: vision ─────────────────────────────────────────────────────────
const VISION_PROMPT = 'You are Zoe\'s eyes. Look at this camera frame of the member. Reply ONLY JSON: {"objects":[...],"attire":"what they wear, colours","scene":"short","mood":"neutral|happy|tired|sad|focused","lighting":"optimal|low|harsh","summary":"one friendly sentence"}';
function parseVision(raw: string) {
  const m = raw.match(/\{[\s\S]*\}/);
  try { const j = JSON.parse(m ? m[0] : raw); return { objects: Array.isArray(j.objects) ? j.objects.slice(0, 12).map(String) : [], attire: String(j.attire ?? ''), scene: String(j.scene ?? ''), mood: String(j.mood ?? 'neutral'), lighting: String(j.lighting ?? 'optimal'), summary: String(j.summary ?? '') }; }
  catch { return { objects: [], attire: '', scene: '', mood: 'neutral', lighting: 'optimal', summary: raw.slice(0, 300) }; }
}
function visionProviders(dataUrl: string, forceFail = false): ProviderTask<any>[] {
  const b64 = dataUrl.split(',')[1] ?? '';
  const vlm = (url: string, key: string, model: string) => async () =>
    chatContent(await postJson(url, { model, temperature: 0.2, max_tokens: 400, messages: [{ role: 'user', content: [{ type: 'text', text: VISION_PROMPT }, { type: 'image_url', image_url: { url: dataUrl } }] }] }, { Authorization: `Bearer ${key}` }));
  return [
    { name: 'nvidia-vision', execute: async () => { if (forceFail) throw new Error('forced'); if (!env('NVIDIA_API_KEY')) throw new Error('no_key'); const r = await nvidiaVision(dataUrl, VISION_PROMPT, { timeoutMs: 9000, maxTokens: 400 }); return r ? parseVision(r) : null; } },
    { name: 'google-vision', execute: async () => {
      const key = env('GOOGLE_API_KEY'); if (!key) throw new Error('no_key');
      const d = await postJson(`https://vision.googleapis.com/v1/images:annotate?key=${key}`, { requests: [{ image: { content: b64 }, features: [{ type: 'OBJECT_LOCALIZATION', maxResults: 10 }, { type: 'LABEL_DETECTION', maxResults: 10 }, { type: 'FACE_DETECTION', maxResults: 1 }] }] });
      const a = d?.responses?.[0]; if (!a || a.error) throw new Error(a?.error?.message ?? 'empty');
      const objects = [...(a.localizedObjectAnnotations ?? []).map((o: any) => o.name), ...(a.labelAnnotations ?? []).map((l: any) => l.description)].slice(0, 12);
      const f = a.faceAnnotations?.[0]; const lk = (v?: string) => v === 'LIKELY' || v === 'VERY_LIKELY';
      const mood = f ? (lk(f.joyLikelihood) ? 'happy' : lk(f.sorrowLikelihood) ? 'sad' : 'neutral') : 'neutral';
      return { objects, attire: objects.filter((o: string) => /shirt|cap|hat|jacket|dress|glasses|top|sleeve|collar|hood/i.test(o)).join(', '), scene: objects.slice(0, 3).join(', '), mood, lighting: f && lk(f.underExposedLikelihood) ? 'low' : 'optimal', summary: `I can see ${objects.slice(0, 4).join(', ')}.` };
    } },
    { name: 'groq-vision', execute: async () => { const k = env('GROQ_API_KEY'); if (!k) throw new Error('no_key'); const r = await vlm('https://api.groq.com/openai/v1/chat/completions', k, 'meta-llama/llama-4-scout-17b-16e-instruct')(); return r ? parseVision(r) : null; } },
    { name: 'openrouter-free-vision', execute: async () => { const k = env('OPENROUTER_API_KEY'); if (!k) throw new Error('no_key'); const r = await vlm('https://openrouter.ai/api/v1/chat/completions', k, 'google/gemma-3-27b-it:free')(); return r ? parseVision(r) : null; } },
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
  const oai = (url: string, key: string, model: string) => async () => chatContent(await postJson(url, { model, temperature: 0.4, max_tokens: 700, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }, { Authorization: `Bearer ${key}` }, 15_000));
  return [
    { name: 'groq', execute: async () => { if (forceFail) throw new Error('forced'); const k = env('GROQ_API_KEY'); if (!k) throw new Error('no_key'); return oai('https://api.groq.com/openai/v1/chat/completions', k, 'llama-3.3-70b-versatile')(); } },
    { name: 'openrouter-free', execute: async () => { const k = env('OPENROUTER_API_KEY'); if (!k) throw new Error('no_key'); return oai('https://openrouter.ai/api/v1/chat/completions', k, 'deepseek/deepseek-chat-v3-0324:free')(); } },
    { name: 'nvidia', execute: async () => (await nvidiaChatByRole('chat', user, { systemPrompt: system, maxTokens: 700, timeoutMs: 15_000 }))?.content ?? null },
    { name: 'ollama', execute: async () => { const e = env('OLLAMA_ENDPOINT'); if (!e) throw new Error('no_key'); const d = await postJson(`${e.replace(/\/$/, '')}/api/chat`, { model: 'llama3.1', stream: false, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }, {}, 20_000); return d?.message?.content ?? null; } },
  ];
}

// ─── Part 5: sovereign action bus (whitelist only, never destructive) ───────
const ACTIONS: Record<string, { label: string; path?: string }> = {
  open_home: { label: 'Open Home', path: '/home' },
  open_dhf_calendar: { label: 'Open DHF calendar', path: '/dhf-calendar' },
  open_life_projection: { label: 'Open life projection', path: '/life-projection' },
  open_notifications: { label: 'Open notifications', path: '/notifications' },
  open_calls: { label: 'Open calls', path: '/calls' },
  open_lol: { label: "Open Zoe's LOL", path: '/zoes-lol' },
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
      const pass = (x: any) => x.trace[0]?.status === 'failed' && x.ok;
      return json({ vision: { pass: pass(v), provider: v.provider, trace: v.trace }, research: { pass: pass(r), provider: r.provider, trace: r.trace }, brain: { pass: pass(l), provider: l.provider, trace: l.trace }, dispatch: { pass: detectAction('open my dhf calendar') === 'open_dhf_calendar' && !ACTIONS['delete_account'] }, breaker: breakerState() });
    }
    return json({ error: 'unknown_action' }, 400);
  } catch (e) {
    return json({ success: false, error: String((e as Error)?.message ?? e) }, 500);
  }
});
