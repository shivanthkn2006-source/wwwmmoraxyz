import { supabase } from '@/integrations/supabase/client';

/**
 * One shared way to get a short-lived Deepgram voice session. After a failure
 * we wait 2 minutes before asking again, so a broken key can't trigger a retry storm.
 */
let blockedUntil = 0;
let lastError = '';
let inflight: Promise<{ token: string; email: string | null }> | null = null;

export async function getZoeAgentToken(): Promise<{ token: string; email: string | null }> {
  if (Date.now() < blockedUntil) throw new Error(lastError || 'Zoe voice is temporarily unavailable.');
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const { data, error } = await supabase.functions.invoke('zoe-agent-token', { body: {} });
      if (error || !data?.token) {
        lastError = data?.error || error?.message || 'Zoe could not get a voice session.';
        blockedUntil = Date.now() + 120_000;
        throw new Error(lastError);
      }
      return { token: data.token as string, email: (data.email as string | null) ?? null };
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}
