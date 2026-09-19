/**
 * Zoe's in-call thinking. Deterministic, dependency-free and cheap so it can run
 * inside the call-scoped worker on a 4 GB phone without touching the main thread
 * (no model calls, no allocation-heavy loops, bounded input).
 */

import type { CallWordsEntry } from './wordsOnlyMode';

export const ZOE_THINK_REQUEST = 'zoe-think' as const;
export const MAX_ZOE_WHISPER_PROMPTS = 3;
const MAX_CONSIDERED_ENTRIES = 12;

export interface ZoeCallWhisper {
  /** Short line shown as a subtitle during the call. */
  headline: string;
  /** Up to three suggested things to say or do next. */
  prompts: string[];
  /** Detected topic used to build the whisper. */
  topic: 'music' | 'chart' | 'plans' | 'wellbeing' | 'connection' | 'general';
  at: number;
}

interface TopicRule {
  topic: ZoeCallWhisper['topic'];
  words: string[];
  headline: string;
  prompts: string[];
}

const TOPIC_RULES: TopicRule[] = [
  {
    topic: 'music',
    words: ['song', 'music', 'track', 'playlist', 'album', 'mood song', 'listen'],
    headline: 'You are talking about music.',
    prompts: ['Play my mood song', 'Share this playlist', 'Recommend tracks for us'],
  },
  {
    topic: 'chart',
    words: ['chart', 'planet', 'horoscope', 'astrology', 'moon', 'birth'],
    headline: 'Your birth chart came up.',
    prompts: ['Open my birth chart', "Today's planetary mood", 'Recommend tracks for my birth chart'],
  },
  {
    topic: 'plans',
    words: ['tomorrow', 'meet', 'plan', 'travel', 'trip', 'time', 'schedule'],
    headline: 'You are making plans.',
    prompts: ['Set a reminder', 'Share the details in chat', 'Check the travel page'],
  },
  {
    topic: 'wellbeing',
    words: ['tired', 'sleep', 'stress', 'health', 'sick', 'pain', 'worried'],
    headline: 'Take it gently.',
    prompts: ['Ask how they are resting', 'Offer to call back later', 'Suggest a calming track'],
  },
  {
    topic: 'connection',
    words: ['hear', 'breaking', 'frozen', 'lag', 'signal', 'network', 'cut'],
    headline: 'The connection sounds rough.',
    prompts: ['Switch to words only', 'Turn the camera off', 'Move closer to Wi-Fi'],
  },
];

const FALLBACK: Omit<ZoeCallWhisper, 'at'> = {
  headline: 'Zoe is listening quietly.',
  prompts: ['Ask an open question', 'Share what happened today'],
  topic: 'general',
};

/** Builds Zoe's whisper from the most recent spoken or typed lines in a call. */
export function buildZoeCallWhisper(entries: CallWordsEntry[], now = Date.now()): ZoeCallWhisper {
  const recent = entries.slice(-MAX_CONSIDERED_ENTRIES);
  const haystack = recent.map(entry => entry.text.toLowerCase()).join(' ');

  let best: TopicRule | null = null;
  let bestScore = 0;
  for (const rule of TOPIC_RULES) {
    let score = 0;
    for (const word of rule.words) {
      if (haystack.includes(word)) score += 1;
    }
    if (score > bestScore) {
      best = rule;
      bestScore = score;
    }
  }

  const chosen = best ?? FALLBACK;
  return {
    headline: chosen.headline,
    prompts: chosen.prompts.slice(0, MAX_ZOE_WHISPER_PROMPTS),
    topic: chosen.topic,
    at: now,
  };
}

export interface ZoeThinkRequest {
  kind: typeof ZOE_THINK_REQUEST;
  transcript: CallWordsEntry[];
}

export const isZoeThinkRequest = (value: unknown): value is ZoeThinkRequest =>
  !!value
  && typeof value === 'object'
  && (value as ZoeThinkRequest).kind === ZOE_THINK_REQUEST
  && Array.isArray((value as ZoeThinkRequest).transcript);
