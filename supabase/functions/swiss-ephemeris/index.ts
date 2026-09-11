// ═══════════════════════════════════════════════════════════════════════════
// SWISS EPHEMERIS (edge)
// The unbreakable maths barrier: Zoe never guesses celestial positions, she
// calls this function, which runs the real Swiss Ephemeris WASM build.
// ═══════════════════════════════════════════════════════════════════════════
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  getSwissPositions,
  swissHouses,
  swissAyanamsa,
  swissEngineMode,
} from '../_shared/swiss-ephemeris.ts';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

interface DateParts {
  year?: number; month?: number; day?: number; hour?: number; minute?: number;
}

function toDate(input: unknown): Date {
  if (!input) return new Date();
  if (typeof input === 'string' || typeof input === 'number') {
    const d = new Date(input);
    return Number.isFinite(d.getTime()) ? d : new Date();
  }
  const p = input as DateParts;
  if (typeof p.year === 'number' && typeof p.month === 'number' && typeof p.day === 'number') {
    const hour = typeof p.hour === 'number' ? p.hour : 12;
    const minute = typeof p.minute === 'number' ? p.minute : 0;
    return new Date(Date.UTC(p.year, p.month - 1, p.day, hour, minute, 0));
  }
  return new Date();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const authHeader = req.headers.get('authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) return json({ error: 'invalid session' }, 401);

    const body = await req.json().catch(() => ({}));
    const date = toDate(body?.date);
    const latitude = Number(body?.latitude);
    const longitude = Number(body?.longitude);

    const positions = await getSwissPositions(date);
    const houses =
      Number.isFinite(latitude) && Number.isFinite(longitude)
        ? await swissHouses(date, latitude, longitude, typeof body?.houseSystem === 'string' ? body.houseSystem : 'P')
        : null;

    return json({
      ok: true,
      utc: date.toISOString(),
      engine: swissEngineMode(),
      ayanamsa: await swissAyanamsa(date),
      exactPositions: positions,
      houses,
    });
  } catch (err) {
    return json({ ok: false, error: err instanceof Error ? err.message : 'ephemeris failed' }, 500);
  }
});
