/**
 * Zoe's humor drops — headless generator. Writes one short two-voice comedy
 * skit per alchemical metal for the current slot. Idempotent: a slot that is
 * already filled is never regenerated, so repeated/cron calls cost nothing.
 */
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { nvidiaChat } from '../_shared/nvidia-provider.ts';

const URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// UTC minutes of day ≈ 07:00, 09:00, 10:40, 12:00, 14:50, 17:00, 19:00 IST.
const SLOTS_UTC = [90, 210, 310, 390, 560, 690, 810];

const METALS = {
  iron: 'Mars/Fire — stressed, impatient, high-energy. Fast banter, absurd situational comedy.',
  silver: 'Moon/Water — emotional, nostalgic, overwhelmed. Relatable, gentle self-deprecating humor.',
  lead: 'Saturn/Earth — exhausted, overworked. Dry, sarcastic workplace humor.',
  quicksilver: 'Mercury/Air — scattered, anxious, overthinking. Witty rapid-fire wordplay.',
} as const;
type Metal = keyof typeof METALS;

const FALLBACK: Record<Metal, { headline: string; lines: [string, string][] }> = {
  iron: { headline: 'ZERO TO RAGE IN 0.2 SECONDS', lines: [['A', 'Why are you glaring at the microwave?'], ['B', 'It said one minute. It has been one minute and four seconds.'], ['A', 'So… patience?'], ['B', 'Never heard of her.']] },
  silver: { headline: 'CRIED AT A DOG FOOD ADVERT', lines: [['A', 'Are you okay?'], ['B', 'A song from 2009 came on and now I miss people I never met.'], ['A', 'Want a hug?'], ['B', 'I want a hug and a time machine. The hug is fine.']] },
  lead: { headline: 'SPIRITUALLY ON 1% BATTERY', lines: [['A', 'Did you just sigh in lowercase?'], ['B', 'I am spiritually on one percent battery and my charger is in another dimension.'], ['A', 'You just need a coffee.'], ['B', 'I need a six-month nap and a lottery win. But yes, an iced latte works.']] },
  quicksilver: { headline: '47 TABS OPEN, ALL IN MY HEAD', lines: [['A', 'What are you thinking about?'], ['B', 'Yes.'], ['A', 'That is not an answer.'], ['B', 'It is fourteen answers. I just said them very fast.']] },
};

function currentSlot(now = new Date()): { date: string; slot: number } {
  const mins = now.getUTCHours() * 60 + now.getUTCMinutes();
  let slot = -1;
  SLOTS_UTC.forEach((m, i) => { if (mins >= m) slot = i; });
  const d = new Date(now);
  if (slot < 0) { d.setUTCDate(d.getUTCDate() - 1); slot = SLOTS_UTC.length - 1; }
  return { date: d.toISOString().slice(0, 10), slot };
}

function clean(s: unknown, max: number): string {
  return String(s ?? '').replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}]/gu, '').replace(/\s+/g, ' ').trim().slice(0, max);
}

async function writeSkit(metal: Metal): Promise<{ headline: string; lines: { speaker: 'A' | 'B'; text: string }[]; source: string }> {
  const raw = await nvidiaChat(
    `Write ONE original, clean, family-friendly two-person comedy skit for someone whose mood today is: ${METALS[metal]}
Return JSON only: {"headline":"<max 6 words, punchline-style>","lines":[{"speaker":"A","text":"..."},{"speaker":"B","text":"..."}]}
4 to 6 alternating lines, each under 120 characters. Voice A is energetic, voice B is deadpan. No emoji, no names of real people, no insults about groups.`,
    { systemPrompt: 'You are a sharp, kind stand-up writer. Output strict JSON.', temperature: 0.95, maxTokens: 1200, timeoutMs: 45_000 },
  );
  try {
    const m = raw?.replace(/<think>[\s\S]*?<\/think>/g, '').match(/\{[\s\S]*\}/);
    const parsed = m ? JSON.parse(m[0]) : null;
    const lines = (Array.isArray(parsed?.lines) ? parsed.lines : [])
      .map((l: any, i: number) => ({ speaker: (l?.speaker === 'B' || (l?.speaker !== 'A' && i % 2)) ? 'B' as const : 'A' as const, text: clean(l?.text, 160) }))
      .filter((l: { text: string }) => l.text.length > 0)
      .slice(0, 6);
    const headline = clean(parsed?.headline, 60).toUpperCase();
    if (lines.length >= 2 && headline) return { headline, lines, source: 'nvidia' };
  } catch { /* fall through */ }
  const f = FALLBACK[metal];
  return { headline: f.headline, lines: f.lines.map(([speaker, text]) => ({ speaker: speaker as 'A' | 'B', text })), source: 'fallback' };
}

async function paintSkit(db: ReturnType<typeof createClient>, row: { id: string; metal: string; headline: string; lines: { text: string }[] }): Promise<void> {
  const key = Deno.env.get('LOVABLE_API_KEY');
  if (!key) return;
  const scene = row.lines.map((l) => l.text).join(' ').slice(0, 600);
  const prompt = `Bright, funny cartoon illustration that literally depicts this comedy skit. Title: "${row.headline}". Scene: ${scene}. Show the exact situation and characters described, expressive faces, warm cinematic colours, no text, no letters, no logos, no watermarks. Square.`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 40_000);
  try {
    const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST', signal: ctrl.signal,
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'google/gemini-2.5-flash-image', messages: [{ role: 'user', content: prompt }], modalities: ['image', 'text'] }),
    });
    if (!res.ok) return;
    const out = await res.json();
    const dataUrl: string | undefined = out?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    const m = dataUrl?.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!m) return;
    const bytes = Uint8Array.from(atob(m[2]), (c) => c.charCodeAt(0));
    const path = `${row.id}.${m[1].split('/')[1]}`;
    const up = await db.storage.from('humor-images').upload(path, bytes, { contentType: m[1], upsert: true });
    if (up.error) return;
    const signed = await db.storage.from('humor-images').createSignedUrl(path, 60 * 60 * 24 * 365);
    if (signed.data?.signedUrl) await db.from('humor_drops').update({ image_url: signed.data.signedUrl }).eq('id', row.id);
  } catch { /* picture is optional */ } finally { clearTimeout(t); }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  try {
    const db = createClient(URL, SERVICE, { auth: { persistSession: false } });
    const { date, slot } = currentSlot();
    const { data: existing } = await db.from('humor_drops').select('metal').eq('drop_date', date).eq('slot', slot);
    const have = new Set((existing ?? []).map((r: { metal: string }) => r.metal));
    const missing = (Object.keys(METALS) as Metal[]).filter((m) => !have.has(m));
    const paintMissing = async () => {
      const { data: bare } = await db.from('humor_drops').select('id, metal, headline, lines').eq('drop_date', date).is('image_url', null).limit(4);
      await Promise.all((bare ?? []).map((r) => paintSkit(db, r as never)));
      return (bare ?? []).length;
    };
    if (missing.length === 0) return json({ ok: true, date, slot, generated: 0, painted: await paintMissing() });

    const skits = await Promise.all(missing.map(async (metal) => ({ metal, ...(await writeSkit(metal)) })));
    const { error } = await db.from('humor_drops').upsert(
      skits.map((s) => ({ drop_date: date, slot, metal: s.metal, headline: s.headline, lines: s.lines, source: s.source })),
      { onConflict: 'drop_date,slot,metal', ignoreDuplicates: true },
    );
    if (error) return json({ ok: false, error: error.message }, 500);
    const painted = await paintMissing();
    return json({ ok: true, date, slot, generated: skits.length, painted, sources: skits.map((s) => s.source) });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : 'failed' }, 500);
  }
});
