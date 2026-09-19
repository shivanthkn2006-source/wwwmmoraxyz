/// <reference lib="webworker" />

import { parseZoeCallData } from './zoeCallData';
import {
  WORDS_ONLY_ENVELOPE_TYPE,
  WORDS_ONLY_MODE_ENVELOPE_TYPE,
  sanitizeCallWords,
} from './wordsOnlyMode';

const scope: DedicatedWorkerGlobalScope = self as unknown as DedicatedWorkerGlobalScope;

scope.onmessage = (event: MessageEvent<unknown>) => {
  const envelope = parseZoeCallData(event.data);
  if (!envelope) {
    scope.postMessage({ ok: false, error: 'invalid_call_data' });
    return;
  }

  if (envelope.type === WORDS_ONLY_ENVELOPE_TYPE) {
    const text = sanitizeCallWords(envelope.payload.text);
    scope.postMessage(text
      ? { ok: true, envelope, words: { text, at: envelope.sentAt } }
      : { ok: false, error: 'invalid_words' });
    return;
  }

  if (envelope.type === WORDS_ONLY_MODE_ENVELOPE_TYPE) {
    scope.postMessage({ ok: true, envelope, wordsMode: envelope.payload.active === true });
    return;
  }

  scope.postMessage({ ok: true, envelope });
};

export {};
