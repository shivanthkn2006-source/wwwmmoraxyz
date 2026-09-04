/**
 * ZOE BIOMETRIC RECOMMENDATIONS
 *
 * Turns the member's REAL device sensor history (heart rate, motion, battery,
 * network, location) into Zoe's next suggestion. Runs under the caller's JWT so
 * a member only ever grounds a recommendation in their own rows.
 *
 * Evidence order:
 *   1. recent `behavioral_events` rows written by `dhfSensorIngest` (category `biometric`)
 *   2. recent `user_route_history` coordinates (movement radius)
 *   3. the member's latest DHF headline for narrative continuity
 *
 * The suggestion is produced by the sovereign AI stack (own provider keys) and,
 * if no provider is available, by a deterministic rule engine over the same
 * numbers — never by inventing sensor values.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { sovereignFetch, sovereignKey } from '../_shared/sovereign-ai.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

interface SensorMeta {
  capturedAt?: string;
  heartRateBpm?: number | null;
  motionMagnitude?: number | null;
  motionSamples?: number;
  battery?: { level?: number; charging?: boolean } | null;
  network?: { effectiveType?: string | null; rtt?: number | null } | null;
  location?: { lat?: number; lng?: number } | null;
}

interface Signals {
  samples: number;
  heartRate: { latest: number | null; avg: number | null; trend: number | null };
  motion: { latest: number | null; avg: number | null };
  battery: { level: number | null; charging: boolean | null };
  network: string | null;
  movementKm: number | null;
  lastCapturedAt: string | null;
  missing: string[];
}

const avg = (nums: number[]) => (nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null);

function haversineKm(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLon = ((b[1] - a[1]) * Math.PI) / 180;
  const lat1 = (a[0] * Math.PI) / 180;
  const lat2 = (b[0] * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function buildSignals(events: SensorMeta[], route: { location_lat: number; location_lng: number }[]): Signals {
  const hr = events.map((e) => e.heartRateBpm).filter((v): v is number => typeof v === 'number');
  const motion = events.map((e) => e.motionMagnitude).filter((v): v is number => typeof v === 'number');
  const latestBattery = events.find((e) => e.battery && typeof e.battery.level === 'number')?.battery ?? null;
  const network = events.find((e) => e.network?.effectiveType)?.network?.effectiveType ?? null;

  let movementKm: number | null = null;
  const coords = route
    .filter((r) => typeof r.location_lat === 'number' && typeof r.location_lng === 'number')
    .map((r) => [r.location_lat, r.location_lng] as [number, number]);
  if (coords.length > 1) {
    movementKm = 0;
    for (let i = 1; i < coords.length; i++) movementKm += haversineKm(coords[i - 1], coords[i]);
    movementKm = Number(movementKm.toFixed(2));
  }

  const missing: string[] = [];
  if (!hr.length) missing.push('heart rate (no paired monitor)');
  if (!motion.length) missing.push('motion');
  if (!latestBattery) missing.push('battery');
  if (movementKm === null) missing.push('location trail');

  const trend =
    hr.length >= 4 ? Number(((avg(hr.slice(0, 2)) ?? 0) - (avg(hr.slice(-2)) ?? 0)).toFixed(1)) : null;

  return {
    samples: events.length,
    heartRate: { latest: hr[0] ?? null, avg: hr.length ? Number((avg(hr) ?? 0).toFixed(1)) : null, trend },
    motion: { latest: motion[0] ?? null, avg: motion.length ? Number((avg(motion) ?? 0).toFixed(2)) : null },
    battery: {
      level: typeof latestBattery?.level === 'number' ? Number((latestBattery.level * 100).toFixed(0)) : null,
      charging: typeof latestBattery?.charging === 'boolean' ? latestBattery.charging : null,
    },
    network,
    movementKm,
    lastCapturedAt: events[0]?.capturedAt ?? null,
    missing,
  };
}

/** Honest rule engine over the real numbers — used when no AI provider answers. */
function deterministic(signals: Signals, headline: string | null): string {
  if (!signals.samples) {
    return 'No device readings yet — capture a sensor snapshot so Zoe can tune suggestions to your body, not just your posts.';
  }
  const parts: string[] = [];
  const hr = signals.heartRate.latest;
  if (hr !== null && hr >= 100) parts.push(`Your heart rate is elevated (${hr} bpm) — take a five-minute downshift before anything demanding`);
  else if (hr !== null && hr <= 55) parts.push(`Your resting heart rate is low (${hr} bpm) — this is a good window for focused deep work`);

  if (signals.motion.avg !== null && signals.motion.avg < 9.9) parts.push('motion readings show you are mostly still — stand and move for two minutes');
  else if (signals.motion.avg !== null && signals.motion.avg > 11) parts.push('you have been moving a lot — hydrate and log how it felt');

  if (signals.movementKm !== null && signals.movementKm > 1) parts.push(`you covered about ${signals.movementKm} km recently`);
  if (signals.battery.level !== null && signals.battery.level < 20 && !signals.battery.charging) parts.push(`battery at ${signals.battery.level}% — plug in before your next session`);

  if (!parts.length) parts.push('your readings are steady — hold your current rhythm and capture another snapshot in a few hours');
  const tail = headline ? ` Tie it back to "${headline.slice(0, 60)}".` : '';
  return `${parts.join('; ')}.${tail}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);

  const url = Deno.env.get('SUPABASE_URL')!;
  const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
  const db = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });

  try {
    const { data: userData } = await db.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) return json({ error: 'Unauthorized' }, 401);

    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const persist = body.persist !== false;

    const [events, route, dhf] = await Promise.all([
      db
        .from('behavioral_events')
        .select('created_at, metadata')
        .eq('user_id', userId)
        .eq('event_category', 'biometric')
        .order('created_at', { ascending: false })
        .limit(20),
      db
        .from('user_route_history')
        .select('location_lat, location_lng')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20),
      db
        .from('dhf_daily_posts')
        .select('headline')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1),
    ]);

    const metas: SensorMeta[] = (events.data ?? []).map((row: { created_at: string; metadata: unknown }) => ({
      capturedAt: (row.metadata as SensorMeta)?.capturedAt ?? row.created_at,
      ...((row.metadata as SensorMeta) ?? {}),
    }));
    const signals = buildSignals(metas, (route.data ?? []) as { location_lat: number; location_lng: number }[]);
    const headline = (dhf.data?.[0]?.headline as string | undefined) ?? null;

    let recommendation = deterministic(signals, headline);
    let model = 'deterministic-rules';

    const aiKey = sovereignKey();
    if (aiKey && signals.samples > 0) {
      try {
        const res = await sovereignFetch('sovereign://chat/completions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${aiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              {
                role: 'system',
                content:
                  'You are Zoe. Turn the member\'s REAL device sensor readings into one concrete, kind next step (max 45 words). Only reference numbers that appear in the data. If a sensor is listed as missing, do not speculate about it.',
              },
              {
                role: 'user',
                content: `Sensor signals: ${JSON.stringify(signals)}\nLatest DHF headline: ${headline ?? 'none'}`,
              },
            ],
            temperature: 0.4,
            max_tokens: 200,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          const text = String(data?.choices?.[0]?.message?.content ?? '').trim();
          if (text) {
            recommendation = text;
            model = 'google/gemini-2.5-flash';
          }
        }
      } catch (e) {
        console.warn('[zoe-biometric-recommend] AI failed, using rules:', (e as Error)?.message);
      }
    }

    let recordId: string | null = null;
    if (persist) {
      const { data: inserted, error } = await db
        .from('zoe_biometric_recommendations')
        .insert({
          user_id: userId,
          recommendation,
          signals: signals as unknown as Record<string, unknown>,
          model,
          sample_count: signals.samples,
        })
        .select('id')
        .maybeSingle();
      if (error) console.warn('[zoe-biometric-recommend] persist failed:', error.message);
      recordId = inserted?.id ?? null;
    }

    return json({ ok: true, recommendation, signals, model, id: recordId });
  } catch (e) {
    console.error('[zoe-biometric-recommend]', e);
    return json({ error: String((e as Error)?.message ?? e).slice(0, 300) }, 500);
  }
});
