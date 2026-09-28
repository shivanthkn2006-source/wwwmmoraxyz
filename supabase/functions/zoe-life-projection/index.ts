// Zoe life projection + daily sky-shift notice. Zero-token, deterministic.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { getPrecisePositions } from '../_shared/ephemeris-precision.ts';
import { projectLifeTimeline, deterministicForecast, FORECAST_OPENING, FORECAST_CLOSING, type LifeArea } from '../_shared/life-forecast.ts';
import type { AstroBirthProfile } from '../_shared/astro-grounding.ts';

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const SLOW = ['Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Rahu', 'Ketu'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const token = (req.headers.get('Authorization') || '').replace('Bearer ', '');
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: u } = await admin.auth.getUser(token);
    const user = u?.user;
    if (!user) return json({ error: 'sign in required' }, 401);
    const body = await req.json().catch(() => ({}));
    const action = body?.action === 'sky-shift' ? 'sky-shift' : body?.action === 'report' ? 'report' : 'timeline';
    if (action === 'report') return json(await buildReport(admin, user, String(body?.timezone || '')));
    const months = Math.min(60, Math.max(3, Number(body?.months) || 24));

    const { data: birth } = await admin.from('astro_profiles')
      .select('birth_date, birth_time, birth_timezone, birth_latitude, birth_longitude')
      .eq('user_id', user.id).maybeSingle();

    if (action === 'timeline') {
      if (!birth?.birth_date) return json({ hasBirth: false, periods: [] });
      const periods = projectLifeTimeline(birth as AstroBirthProfile, months);
      const today = new Date().toISOString().slice(0, 10);
      const { data: card } = await admin.from('dhf_daily_posts')
        .select('headline, short_summary, category').eq('user_id', user.id).eq('post_date', today)
        .order('slot_time', { ascending: false }).limit(1).maybeSingle();
      return json({ hasBirth: true, periods, todayCard: card ?? null, opening: FORECAST_OPENING, closing: FORECAST_CLOSING });
    }

    // sky-shift: which planets changed Vedic sign since yesterday — once per day per member.
    const now = new Date();
    const day = now.toISOString().slice(0, 10);
    const { data: existing } = await admin.from('notifications').select('id, context_data')
      .eq('user_id', user.id).eq('type', 'zoe_sky_shift').gte('created_at', `${day}T00:00:00Z`).limit(1).maybeSingle();
    if (existing) return json({ shifted: true, alreadyNotified: true, ...(existing.context_data as object) });

    const t = getPrecisePositions(now);
    const y = getPrecisePositions(new Date(now.getTime() - 86400000));
    const shifts = SLOW.filter((b) => (t as any)[b] && (t as any)[b].siderealSign !== (y as any)[b].siderealSign)
      .map((b) => ({ planet: b, from: (y as any)[b].siderealSign, to: (t as any)[b].siderealSign }));
    let dashaChange: string | null = null;
    if (birth?.birth_date) {
      const p = projectLifeTimeline(birth as AstroBirthProfile, 1, 'Asia/Kolkata', new Date(now.getTime() - 86400000));
      const next = p.find((x) => x.start === day);
      if (next) dashaChange = `Your life period moves into ${next.maha}–${next.antar} today.`;
    }
    const moon = (t as any).Moon?.siderealSign;
    if (!shifts.length && !dashaChange) return json({ shifted: false, moon });

    const message = [
      dashaChange,
      ...shifts.map((s) => `${s.planet} moved from ${s.from} into ${s.to} today.`),
      'Your DHF cards have been updated — ask me what it means for your career, money, love or family.',
    ].filter(Boolean).join(' ');
    const context = { message, shifts, dashaChange, day, moon };
    await admin.from('notifications').insert({
      user_id: user.id, from_user_id: user.id, type: 'zoe_sky_shift', read: false,
      priority: 2, suggestion_type: 'planetary_change', context_data: context,
      expires_at: new Date(now.getTime() + 2 * 86400000).toISOString(),
    });
    return json({ shifted: true, ...context });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});

const DAY = 86_400_000;
async function geocode(place: string): Promise<{ lat: number; lon: number } | null> {
  if (!place) return null;
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(place)}`,
      { headers: { 'User-Agent': 'MMora/1.0 (life-report)' }, signal: AbortSignal.timeout(6000) });
    const j = await r.json();
    return j?.[0] ? { lat: Number(j[0].lat), lon: Number(j[0].lon) } : null;
  } catch { return null; }
}

// Build + save the member's life report from their profile birth details. Zero tokens.
async function buildReport(admin: any, user: any, tz: string) {
  const { data: prof } = await admin.from('profiles')
    .select('display_name, gender, birth_date, date_of_birth, birth_time, birth_place, city').eq('user_id', user.id).maybeSingle();
  const birthDate = prof?.birth_date || prof?.date_of_birth;
  if (!birthDate) return { saved: false, reason: 'no_birth_date' };
  const { data: existing } = await admin.from('astro_profiles').select('*').eq('user_id', user.id).maybeSingle();
  const zone = tz || existing?.birth_timezone || 'Asia/Kolkata';
  const geo = (await geocode(prof?.birth_place || '')) ?? (existing ? { lat: existing.birth_latitude, lon: existing.birth_longitude } : { lat: 0, lon: 0 });
  const birth = {
    user_id: user.id, birth_date: String(birthDate).slice(0, 10),
    birth_time: (prof?.birth_time || '12:00').slice(0, 5), birth_timezone: zone,
    birth_latitude: geo.lat, birth_longitude: geo.lon, display_timezone: zone, is_enabled: true,
  };
  await admin.from('astro_profiles').upsert(birth, { onConflict: 'user_id' });
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const win = (kind: any, s: Date, e: Date, label: string) => ({ kind, start: s, end: e, label });
  const tomorrow = win('date', new Date(start.getTime() + DAY), new Date(start.getTime() + 2 * DAY), 'tomorrow');
  const nextMonth = win('month', new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)), new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 2, 1)), 'next month');
  const nextYear = win('year', new Date(Date.UTC(now.getUTCFullYear() + 1, 0, 1)), new Date(Date.UTC(now.getUTCFullYear() + 2, 0, 1)), 'next year');
  const year = win('year', start, new Date(start.getTime() + 365 * DAY), 'the next twelve months');
  const clean = (t: string) => t.replace(/\s*\((stronger|mixed) signal\)/g, '').replace(/Want me to go deeper[^?]*\?/, '').trim();
  const f = (areas: LifeArea[], w: any) => clean(deterministicForecast(birth as any, { areas, window: w, explicitTime: true } as any, zone));
  const sections = {
    tomorrow: f([], tomorrow), next_month: f([], nextMonth), next_year: f([], nextYear),
    career: f(['career'], year), love: f(['love'], year), personal: f(['personal'], year),
    family: f(['family'], year), money: f(['money'], year), health: f(['health'], year),
  };
  const snapshot = { name: prof?.display_name ?? null, gender: prof?.gender ?? null, ...birth, birth_place: prof?.birth_place ?? null };
  const { error } = await admin.from('zoe_life_reports').upsert({
    user_id: user.id, sections, birth_snapshot: snapshot, engine: 'vimshottari-dasha+swiss-ephemeris', generated_at: now.toISOString(),
  }, { onConflict: 'user_id' });
  if (error) return { saved: false, reason: error.message };
  const { data: role } = await admin.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin').maybeSingle();
  return { saved: true, sections: Object.keys(sections), ...(role ? { engine: 'vimshottari-dasha+swiss-ephemeris', geocoded: geo } : {}) };
}
