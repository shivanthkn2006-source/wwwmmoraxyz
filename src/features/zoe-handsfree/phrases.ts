// Shared hands-free phrase matching for Zoe Infinity wake/stop commands.

export const ZOE_WAKE_PHRASES = [
  'hey zoe', 'hey zoey', 'hi zoe', 'hello zoe', 'ok zoe', 'okay zoe', 'yo zoe',
  'zoe you there', 'zoe are you there', 'you there zoe', 'zoey you there',
  'zoe listen', 'listen zoe', 'zoe wake up', 'wake up zoe', 'zoe come here',
  'zoe hello', 'zoe can you hear me', 'zoe talk to me', 'zoe activate',
  'activate zoe', 'zoe online', 'zoe respond', 'zoe', 'zoey',
];

export const SMITH_WAKE_PHRASES = [
  'hey smith', 'hi smith', 'hello smith', 'ok smith', 'okay smith', 'yo smith',
  'smith you there', 'smith are you there', 'you there smith', 'smith listen',
  'listen smith', 'smith wake up', 'wake up smith', 'smith come here',
  'smith hello', 'smith can you hear me', 'smith talk to me', 'smith activate',
  'activate smith', 'smith online', 'smith respond', 'mr smith', 'mister smith',
  'hey mr smith', 'hey mister smith', 'mr smith are you there',
  'mister smith are you there', 'agent smith', 'hey agent smith',
  'agent smith are you there', 'smiths', 'hey smiths', 'smyth', 'hey smyth',
  'smith',
];

export const HANDS_FREE_STOP_PHRASES = [
  'stop', 'quiet', 'sleep', 'cancel', 'pause', 'end', 'exit', 'dismiss', 'be quiet', 'shut up',
  'zoe stop', 'stop zoe', 'zoe end', 'end zoe', 'zoe pause', 'pause zoe',
  'zoe quiet', 'zoe silent', 'zoe sleep', 'go to sleep zoe', 'zoe exit',
  'zoe close', 'zoe dismiss', 'zoe cancel', 'zoe shut up', 'zoe be quiet',
  'zoey stop', 'zoey end', 'stop zoey',
  'smith stop', 'stop smith', 'smith end', 'end smith', 'smith pause',
  'pause smith', 'smith quiet', 'smith silent', 'smith sleep', 'go to sleep smith',
  'smith exit', 'smith close', 'smith dismiss', 'smith cancel', 'smith shut up',
  'smith be quiet', 'mr smith stop', 'mister smith stop', 'agent smith stop',
  'smiths stop', 'stop smiths',
];

export const HANDS_FREE_WAKE_PHRASES = [...ZOE_WAKE_PHRASES, ...SMITH_WAKE_PHRASES];

export const ALL_HANDS_FREE_PHRASES = [...HANDS_FREE_STOP_PHRASES, ...HANDS_FREE_WAKE_PHRASES];

export function normalizeVoicePhrase(value: string): string {
  return value
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function transcriptIncludesPhrase(transcript: string, phrase: string): boolean {
  const normalizedTranscript = normalizeVoicePhrase(transcript);
  const normalizedPhrase = normalizeVoicePhrase(phrase);
  if (!normalizedTranscript || !normalizedPhrase) return false;
  return new RegExp(`(?:^|\\s)${escapeRegExp(normalizedPhrase)}(?:\\s|$)`).test(normalizedTranscript);
}

export function findHandsFreePhrase(transcript: string, phrases: string[]): string | null {
  const sorted = phrases.slice().sort((a, b) => normalizeVoicePhrase(b).length - normalizeVoicePhrase(a).length);
  return sorted.find((phrase) => transcriptIncludesPhrase(transcript, phrase)) ?? null;
}
