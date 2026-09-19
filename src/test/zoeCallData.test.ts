import { describe, expect, it, vi } from 'vitest';
import {
  createZoeCallDataEnvelope,
  MAX_ZOE_CALL_DATA_BYTES,
  parseZoeCallData,
} from '@/features/calls/zoeCallData';

describe('Zoe call data envelopes', () => {
  it('creates and parses a bounded versioned message', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1234);
    const envelope = createZoeCallDataEnvelope('caption', { text: 'hello' });
    expect(parseZoeCallData(JSON.stringify(envelope))).toEqual(envelope);
    vi.restoreAllMocks();
  });

  it('rejects malformed and oversized messages', () => {
    expect(parseZoeCallData('{bad')).toBeNull();
    expect(parseZoeCallData('x'.repeat(MAX_ZOE_CALL_DATA_BYTES + 1))).toBeNull();
    expect(parseZoeCallData(JSON.stringify({ version: 2, type: 'caption', sentAt: 1, payload: {} }))).toBeNull();
  });
});