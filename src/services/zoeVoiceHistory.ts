/**
 * ZOE VOICE HISTORY
 * =================
 * Everything spoken through the Zoe Audio / hands-free path is written to the
 * same conversation table the orb chat reads (`ai_companion_messages`,
 * variant `zoe_classic`). That is what makes a spoken conversation show up in
 * the orb history exactly like a typed one.
 *
 * Deduped in-memory so a line that is both spoken and recorded by a caller
 * never lands twice.
 */
import { supabase } from '@/integrations/supabase/client';

type Role = 'user' | 'assistant';

const recent: Array<{ role: Role; text: string; at: number }> = [];
const DEDUPE_MS = 8000;

function isDuplicate(role: Role, text: string): boolean {
  const now = Date.now();
  while (recent.length && now - recent[0].at > DEDUPE_MS) recent.shift();
  if (recent.some((r) => r.role === role && r.text === text)) return true;
  recent.push({ role, text, at: now });
  return false;
}

/** Persist one spoken turn into the orb conversation history. */
export async function recordVoiceTurn(role: Role, text: string, userId?: string): Promise<void> {
  const content = (text || '').trim();
  if (!content) return;
  if (isDuplicate(role, content)) return;

  try {
    let id = userId;
    if (!id) {
      const { data } = await supabase.auth.getSession();
      id = data.session?.user?.id;
    }
    if (!id) return;

    await supabase.from('ai_companion_messages').insert({
      user_id: id,
      role,
      variant: 'zoe_classic',
      content,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
  } catch (err) {
    console.warn('[ZoeVoiceHistory] could not save spoken turn', err);
  }
}

export default recordVoiceTurn;
