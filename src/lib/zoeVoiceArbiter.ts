/**
 * Zoe voice arbiter — one voice at a time, platform wide.
 *
 * Zoe is a single persona, so she must never talk over herself. Every surface
 * that can speak (search companion, card/growth narration, chat replies, …)
 * registers a stop handler here and claims the floor before speaking. Claiming
 * silences every other channel instantly.
 *
 * Priority rule: anything the user just triggered ("user" channels) outranks
 * ambient/autonomous narration. Ambient narration asks politely and simply
 * stays quiet while a user channel holds the floor.
 */

export type VoiceChannel = 'search' | 'chat' | 'narration' | 'notification' | 'assistant';

/** Channels driven by a direct user action — they always win the floor. */
const USER_CHANNELS: ReadonlySet<VoiceChannel> = new Set<VoiceChannel>(['search', 'chat', 'assistant']);

const stoppers = new Map<VoiceChannel, () => void>();
let holder: VoiceChannel | null = null;

/** Register how a channel silences itself when another channel takes over. */
export function registerVoiceChannel(channel: VoiceChannel, stop: () => void): () => void {
  stoppers.set(channel, stop);
  return () => {
    if (stoppers.get(channel) === stop) stoppers.delete(channel);
    if (holder === channel) holder = null;
  };
}

/** Which channel currently owns Zoe's voice, if any. */
export function currentVoiceChannel(): VoiceChannel | null {
  return holder;
}

/** True when a user-driven channel is speaking right now. */
export function isUserVoiceActive(): boolean {
  return holder !== null && USER_CHANNELS.has(holder);
}

/**
 * Take the voice floor.
 *
 * @param channel     who wants to speak
 * @param options.ambient  ambient/autonomous speech — declines instead of
 *                         interrupting a user-driven channel
 * @returns true when the channel may speak
 */
export function claimVoice(channel: VoiceChannel, options?: { ambient?: boolean }): boolean {
  if (options?.ambient && holder && holder !== channel && USER_CHANNELS.has(holder)) return false;

  for (const [other, stop] of stoppers) {
    if (other === channel) continue;
    try {
      stop();
    } catch {
      /* a broken stopper must never block the new speaker */
    }
  }
  holder = channel;
  return true;
}

/** Release the floor when a channel finishes or is silenced. */
export function releaseVoice(channel: VoiceChannel): void {
  if (holder === channel) holder = null;
}

/** Silence every channel (e.g. the user starts typing a new query). */
export function silenceAllVoices(): void {
  for (const stop of stoppers.values()) {
    try {
      stop();
    } catch {
      /* ignore */
    }
  }
  holder = null;
}
