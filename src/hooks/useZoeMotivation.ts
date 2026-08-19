import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { resolvePosterUrl } from '@/lib/astroPoster';

export interface ZoeMotivation {
  id: string;
  target_date: string;
  theme: string;
  headline: string;
  body: string;
  action_step: string;
  quote: string;
  poster_path: string | null;
}

const localDate = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/**
 * Today's plain-language daily motivation for the signed-in member.
 * Works for EVERY member — no birth data required. If today's record does not
 * exist yet, the isolated engine is asked to create it on the spot.
 */
export function useZoeMotivation() {
  const [motivation, setMotivation] = useState<ZoeMotivation | null>(null);
  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const uid = session?.user?.id;
        if (!uid) { if (!cancelled) { setLoading(false); } return; }
        if (!cancelled) setUserId(uid);

        const today = localDate();
        const read = async () => {
          const { data } = await supabase
            .from('zoe_daily_motivations' as never)
            .select('*')
            .eq('user_id', uid)
            .eq('target_date', today)
            .limit(1);
          return ((data as unknown as ZoeMotivation[]) ?? [])[0] ?? null;
        };

        let row = await read();

        if (!row || !row.poster_path) {
          try {
            await supabase.functions.invoke('zoe-motivation', {
              body: {
                action: 'ensure',
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              },
            });
            row = (await read()) ?? row;
          } catch (err) {
            console.warn('[ZoeMotivation] ensure failed', err);
          }
        }

        if (cancelled) return;
        setMotivation(row);
        setPosterUrl(await resolvePosterUrl(row?.poster_path));
      } catch (err) {
        console.warn('[ZoeMotivation] load failed', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();
    return () => { cancelled = true; };
  }, []);

  return { motivation, posterUrl, userId, loading };
}

export default useZoeMotivation;
