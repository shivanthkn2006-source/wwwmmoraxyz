/// <reference lib="webworker" />

import { parseZoeCallData } from './zoeCallData';

const scope: DedicatedWorkerGlobalScope = self as unknown as DedicatedWorkerGlobalScope;

scope.onmessage = (event: MessageEvent<unknown>) => {
  const envelope = parseZoeCallData(event.data);
  scope.postMessage(envelope
    ? { ok: true, envelope }
    : { ok: false, error: 'invalid_call_data' });
};

export {};