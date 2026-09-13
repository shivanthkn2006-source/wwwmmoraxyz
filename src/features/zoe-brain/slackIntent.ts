/**
 * Slack questions asked in plain language.
 *
 * Zoe answers "what channels do we have", "what's new in #social" or
 * "search slack for X" from the live connected workspace through the
 * `zoe-slack` edge function (connector gateway), instead of stalling.
 * A failure is reported honestly — nothing is invented.
 */
import { supabase } from '@/integrations/supabase/client';

export type SlackIntent = 'slack_channels' | 'slack_history' | 'slack_search';

const mentionsSlack = (t: string) => /\bslack\b/i.test(t);

export function classifySlackIntent(input: string): SlackIntent | null {
  const t = (input || '').toLowerCase();
  // A hashtag alone is ordinary social language on this platform — only take the
  // turn when the member actually says "slack".
  if (!mentionsSlack(t)) return null;
  if (/\bchannels?\b/.test(t) && !/#[a-z0-9_-]{2,}/.test(t)) return 'slack_channels';
  if (/\b(search|find|look up|any mention)\b/.test(t)) return 'slack_search';
  if (/#[a-z0-9_-]{2,}/.test(t) || /\b(messages?|latest|recent|history|what'?s new)\b/.test(t)) return 'slack_history';
  return mentionsSlack(t) ? 'slack_channels' : null;
}

const channelNameFrom = (input: string): string | null =>
  input.match(/#([a-z0-9_-]{2,})/i)?.[1]?.toLowerCase() ?? null;

const call = async (body: Record<string, unknown>) => {
  const { data, error } = await supabase.functions.invoke('zoe-slack', { body });
  if (error) throw error;
  if (data?.ok === false) throw new Error(String(data.error ?? 'slack call failed'));
  return data;
};

export async function answerSlackQuestion(input: string): Promise<string> {
  const intent = classifySlackIntent(input);
  if (!intent) return '';

  try {
    if (intent === 'slack_search') {
      const query = input.replace(/.*\b(search|find|look up)\b/i, '').replace(/\bslack\b/gi, '').replace(/\bfor\b/i, '').trim();
      const data = await call({ action: 'search', query: query || input, limit: 10 });
      const raw = JSON.stringify(data.results ?? {});
      return raw.length > 40
        ? `Here's what Slack came back with for "${query || input}":\n\n${raw.slice(0, 1200)}`
        : `Slack had no matches for "${query || input}".`;
    }

    const channels = (await call({ action: 'channels', limit: 100 })).channels as
      | { id: string; name: string; members?: number }[]
      | undefined;

    if (intent === 'slack_channels' || !channels?.length) {
      if (!channels?.length) return 'Slack is connected, but I can\'t see any channels I\'ve been given access to yet.';
      return `Your Slack workspace has ${channels.length} channel${channels.length === 1 ? '' : 's'} I can reach: ${channels
        .map((c) => `#${c.name}`)
        .join(', ')}.`;
    }

    const wanted = channelNameFrom(input);
    const channel = channels.find((c) => c.name === wanted) ?? channels[0];
    const data = await call({ action: 'history', channel: channel.id, limit: 8 });
    const messages = (data.messages ?? []) as { text?: string; ts?: string }[];
    if (!messages.length) return `#${channel.name} is quiet — no recent messages.`;
    return `Latest in #${channel.name}:\n\n${messages
      .slice(0, 8)
      .map((m) => `• ${(m.text || '').slice(0, 220)}`)
      .join('\n')}`;
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    return `I couldn't reach Slack just now — ${detail}. The connection is set up; this looks like a permission or provider hiccup.`;
  }
}
