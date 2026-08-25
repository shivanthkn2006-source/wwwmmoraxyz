import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { AstroPredictionRecord, DiagnosticResult } from '@/components/astro/moraZoeTypes';
import { localDateKey, currentSlot, pickSlotRow, deviceTimeZone } from '@/lib/astroSlot';
import { astroTrace } from '@/lib/astroLog';


/**
 * Pre-flight RLS/grant validation + today's alignment fetch for the
 * sandboxed M'Mora Zoe overlay. Fails silently and never throws upward.
 */
export const useAstroDiagnostics = () => {
  const [loading, setLoading] = useState(true);
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult | null>(null);
  const [todayPrediction, setTodayPrediction] = useState<AstroPredictionRecord | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          if (!cancelled) {
            setDiagnostics({
              passed: false,
              has_profile: false,
              predictions_available: 0,
              rls_error: 'No active session detected.',
              checked_at: new Date().toISOString(),
            });
            setLoading(false);
          }
          return;
        }

        const { data: rpcData, error: rpcError } = await supabase.rpc('verify_astro_permissions' as never);
        if (rpcError) throw new Error(`RLS RPC check failed: ${rpcError.message}`);
        const rpc = (rpcData ?? {}) as { has_profile?: boolean; predictions_available?: number };

        // Local calendar date — using the UTC date made members east of UTC
        // (e.g. Asia/Kolkata at 05:00) read yesterday's night card at dawn.
        const todayStr = localDateKey();
        const { data: predictionData, error: predError } = await supabase
          .from('astro_predictions')
          .select('*')
          .eq('user_id', session.user.id)
          .eq('target_date', todayStr)
          .order('created_at', { ascending: false })
          .limit(12);

        if (predError) throw new Error(`RLS read error: ${predError.message}`);

        // Pick the row for the slot the member is actually living in right now.
        let finalPrediction = pickSlotRow(
          (predictionData ?? []) as unknown as Array<AstroPredictionRecord & { slot?: string }>,
        ) as unknown as AstroPredictionRecord | null;

        if (!finalPrediction) {
          finalPrediction = {
            id: 'client-fallback-align',
            user_id: session.user.id,
            target_date: todayStr,
            idempotency_key: `client_${session.user.id}_${todayStr}`,
            slot: currentSlot(),
            transits_summary: [
              { transit_planet: 'Sun', natal_planet: 'Jupiter', aspect: 'Trine', exactness_deg: 0.18, is_retrograde: false },
              { transit_planet: 'Moon', natal_planet: 'Venus', aspect: 'Sextile', exactness_deg: 1.05, is_retrograde: false },
            ],
            prediction_headline: 'Ascending Momentum & Intuitive Action',
            prediction_body:
              'Planetary alignments favour decisive movement today. Your inner conviction matches the openings in front of you.',
            motivational_quote: 'The universe does not whisper fear; it generates power through clarity.',
            poster_image_url: null,
            status: 'fallback',
            created_at: new Date().toISOString(),
          };
        }

        if (cancelled) return;
        setTodayPrediction(finalPrediction);
        setDiagnostics({
          passed: true,
          user_id: session.user.id,
          has_profile: rpc.has_profile ?? false,
          predictions_available: rpc.predictions_available ?? 0,
          checked_at: new Date().toISOString(),
        });
      } catch (err) {
        console.warn('[MoraZoe Diagnostics]', err);
        if (!cancelled) {
          setDiagnostics({
            passed: false,
            has_profile: false,
            predictions_available: 0,
            rls_error: err instanceof Error ? err.message : 'Unknown diagnostic error.',
            checked_at: new Date().toISOString(),
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => { cancelled = true; };
  }, []);

  return { loading, diagnostics, todayPrediction };
};

export default useAstroDiagnostics;
