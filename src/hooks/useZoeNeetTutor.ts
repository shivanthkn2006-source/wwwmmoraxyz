// ═══════════════════════════════════════════════════════════════════════════════
// ZOE NEET TUTOR HOOK — Trial Mode
// Detects NEET intent and routes to zoe-neet-tutor edge function.
// Reuses existing chat UI in Zoe Infinity. No new routes/screens.
// ═══════════════════════════════════════════════════════════════════════════════

import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const NEET_KEYWORDS = [
  /\bneet\b/i,
  /\b(medical|mbbs|aiims)\s+(entrance|exam|prep|preparation)\b/i,
  /\bquiz\s+me\s+(on|about)\s+(physics|chemistry|biology|botany|zoology)\b/i,
  /\b(ncert)\b/i,
  /\b(physics|chemistry|biology|botany|zoology)\s+(doubt|question|problem|mcq|chapter)\b/i,
  /\bmock\s+test\b/i,
  /\b(class\s+1[12])\s+(physics|chemistry|biology)\b/i,
];

export interface NeetHistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

export function useZoeNeetTutor() {
  const isNeetQuery = useCallback((input: string): boolean => {
    if (!input || input.length < 3) return false;
    return NEET_KEYWORDS.some((re) => re.test(input));
  }, []);

  const askNeetTutor = useCallback(
    async (
      message: string,
      history: NeetHistoryMessage[] = [],
    ): Promise<{ reply: string; error?: string }> => {
      try {
        const { data, error } = await supabase.functions.invoke('zoe-neet-tutor', {
          body: { message, history },
        });

        if (error) {
          console.error('[NEET] invoke error:', error);
          return {
            reply: "I'm having trouble reaching the NEET tutor right now. Try again in a moment.",
            error: error.message,
          };
        }

        if (data?.error) {
          return { reply: data.error, error: data.error };
        }

        return { reply: data?.reply || "Let me think again — could you rephrase your NEET question?" };
      } catch (e) {
        console.error('[NEET] exception:', e);
        return {
          reply: "Something went wrong with the NEET tutor. I'm still here for everything else.",
          error: e instanceof Error ? e.message : 'unknown',
        };
      }
    },
    [],
  );

  return { isNeetQuery, askNeetTutor };
}
