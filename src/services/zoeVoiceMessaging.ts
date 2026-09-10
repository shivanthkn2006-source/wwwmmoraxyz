/**
 * SPOKEN MESSAGE DELIVERY
 * -----------------------
 * Turns "Zoe, send a message to Asha Soosan saying I'm on my way" into a real
 * row in `messages`, using the same table and shape the Messages page and the
 * orb messenger already use. Recipient lookup goes through the public-safe
 * profile view, so nothing private is exposed to the voice path.
 */
import { supabase } from '@/integrations/supabase/client';

export interface VoiceRecipient {
  user_id: string;
  username: string | null;
  display_name: string | null;
}

export type RecipientLookup =
  | { status: 'found'; recipient: VoiceRecipient }
  | { status: 'none' }
  | { status: 'ambiguous'; options: VoiceRecipient[] };

const clean = (value: string) => value.replace(/[^a-z0-9\s._-]/gi, ' ').replace(/\s+/g, ' ').trim();

export async function findRecipient(rawName: string, selfId?: string): Promise<RecipientLookup> {
  const name = clean(rawName);
  if (name.length < 2) return { status: 'none' };

  const { data, error } = await supabase
    .from('safe_public_profiles')
    .select('user_id, username, display_name')
    .or(`username.ilike.%${name}%,display_name.ilike.%${name}%`)
    .neq('user_id', selfId ?? '00000000-0000-0000-0000-000000000000')
    .limit(6);

  if (error || !data || data.length === 0) return { status: 'none' };

  const lower = name.toLowerCase();
  const exact = data.filter(
    (row) =>
      (row.display_name ?? '').toLowerCase() === lower || (row.username ?? '').toLowerCase() === lower,
  );
  if (exact.length === 1) return { status: 'found', recipient: exact[0] };
  if (data.length === 1) return { status: 'found', recipient: data[0] };
  return { status: 'ambiguous', options: data.slice(0, 3) };
}

export const recipientLabel = (recipient: VoiceRecipient) =>
  recipient.display_name || recipient.username || 'them';

/** Sends the message and returns the sentence Zoe should say back. */
export async function sendVoiceMessage(
  rawName: string,
  body: string,
  senderId?: string,
): Promise<{ sent: boolean; speak: string; recipient?: VoiceRecipient }> {
  const text = body.trim();
  if (!senderId) return { sent: false, speak: 'You need to be signed in before I can send that.' };
  if (!text) return { sent: false, speak: 'I did not catch the message. What should I say?' };

  const lookup = await findRecipient(rawName, senderId);
  if (lookup.status === 'none') {
    return { sent: false, speak: `I could not find anyone called ${rawName} on M'Mora.` };
  }
  if (lookup.status === 'ambiguous') {
    const names = lookup.options.map(recipientLabel).join(', ');
    return { sent: false, speak: `I found more than one match: ${names}. Which one do you mean?` };
  }

  const { error } = await supabase.from('messages').insert({
    sender_id: senderId,
    receiver_id: lookup.recipient.user_id,
    content: text,
    read: false,
    delivered: false,
  });

  if (error) {
    console.error('[ZoeVoiceMessaging] send failed', error);
    return { sent: false, speak: `I could not send that to ${recipientLabel(lookup.recipient)} just now.` };
  }

  return {
    sent: true,
    speak: `Sent to ${recipientLabel(lookup.recipient)}: ${text}`,
    recipient: lookup.recipient,
  };
}
