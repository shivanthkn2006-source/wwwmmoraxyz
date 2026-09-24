import { useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

/** Once a day after sign-in: Zoe tells the member when a planet or life period changed. */
export function useZoeSkyShift() {
  const { user } = useAuth();
  useEffect(() => {
    if (!user?.id) return;
    const key = `mmora.skyShift.${user.id}.${new Date().toISOString().slice(0, 10)}`;
    if (localStorage.getItem(key)) return;
    const t = window.setTimeout(async () => {
      const { data } = await supabase.functions.invoke('zoe-life-projection', { body: { action: 'sky-shift' } });
      localStorage.setItem(key, '1');
      if (data?.shifted && data?.message && !data?.alreadyNotified) {
        toast('Zoe: the sky changed today', {
          description: data.message,
          duration: 12000,
          action: { label: 'See my timeline', onClick: () => { window.location.href = '/life-projection'; } },
        });
      }
    }, 6000);
    return () => window.clearTimeout(t);
  }, [user?.id]);
}

export function ZoeSkyShiftMount() { useZoeSkyShift(); return null; }
