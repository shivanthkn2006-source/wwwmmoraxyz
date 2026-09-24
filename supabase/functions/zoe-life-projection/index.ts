// Zoe life projection + daily sky-shift notice. Zero-token, deterministic.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { getPrecisePositions } from '../_shared/ephemeris-precision.ts';
import { projectLifeTimeline, FORECAST_OPENING, FORECAST_CLOSING } from '../_shared/life-forecast.ts';
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
    const action = body?.action === 'sky-shift' ? 'sky-shift' : 'timeline';
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
