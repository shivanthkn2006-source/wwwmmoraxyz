/**
 * One sign-in greeting: Zoe reads new notifications, unread messages and the
 * newest DHF card together, once per sign-in session (after the first tap,
 * because browsers block audio before it). Speaks only through speakAsZoe
 * (Deepgram, 'chat' channel) so it can never overlap other Zoe voices.
 */
import { supabase } from '@/integrations/supabase/client';

const NOTIF_WORDS: Record<string, string> = {
  like: 'like', post_like: 'like', comment: 'comment', post_comment: 'comment',
  friend_request: 'friend request', follow: 'new follower', tag: 'tag', post_tag: 'tag',
  message: 'message', comment_like: 'comment like', comment_reply: 'reply',
};

function plural(n: number, word: string) { return `${n} ${word}${n === 1 ? '' : 's'}`; }

export async function buildSignInGreeting(userId: string): Promise<string> {
  const [profile, notifs, msgs, dhf] = await Promise.all([
    supabase.from('profiles').select('display_name').eq('user_id', userId).maybeSingle(),
    supabase.from('notifications').select('type', { count: 'exact' }).eq('user_id', userId).eq('read', false).limit(50),
    supabase.from('messages').select('sender_id', { count: 'exact' }).eq('receiver_id', userId).eq('read', false).limit(50),
    supabase.from('dhf_daily_posts').select('headline,short_summary').eq('user_id', userId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
  ]);

  const hour = new Date().getHours();
  const hello = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const name = (profile.data?.display_name || '').split(' ')[0];
  const parts: string[] = [`${hello}${name ? ` ${name}` : ''}.`];

  const nCount = notifs.count ?? 0;
  if (nCount > 0) {
    const tally = new Map<string, number>();
    for (const row of notifs.data ?? []) {
      const word = NOTIF_WORDS[String(row.type)] ?? 'update';
      tally.set(word, (tally.get(word) ?? 0) + 1);
    }
    const detail = [...tally.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([w, n]) => plural(n, w)).join(', ');
    parts.push(`You have ${plural(nCount, 'new notification')}${detail ? `: ${detail}` : ''}.`);
  }

  const mCount = msgs.count ?? 0;
  if (mCount > 0) {
    const senders = [...new Set((msgs.data ?? []).map((m) => m.sender_id))].slice(0, 3);
    let names = '';
    if (senders.length) {
      const { data } = await supabase.from('profiles').select('display_name').in('user_id', senders);
      names = (data ?? []).map((p) => p.display_name).filter(Boolean).join(', ');
    }
    parts.push(`You have ${plural(mCount, 'unread message')}${names ? ` from ${names}` : ''}.`);
  }

  if (dhf.data?.headline) {
    parts.push(`Your newest DHF card: ${dhf.data.headline}. ${dhf.data.short_summary ?? ''}`.trim());
  }
  if (nCount === 0 && mCount === 0 && !dhf.data) parts.push("You're all caught up.");
  return parts.join(' ');
}

export function greetingKey(userId: string) { return `zoe-signin-greeting:${userId}`; }
