export const ZOE_CALL_DATA_VERSION = 1 as const;
export const MAX_ZOE_CALL_DATA_BYTES = 16_384;

export interface ZoeCallDataEnvelope {
  version: typeof ZOE_CALL_DATA_VERSION;
  type: string;
  sentAt: number;
  payload: Record<string, unknown>;
}

export function createZoeCallDataEnvelope(
  type: string,
  payload: Record<string, unknown>,
): ZoeCallDataEnvelope {
  return {
    version: ZOE_CALL_DATA_VERSION,
    type: type.trim() || 'message',
    sentAt: Date.now(),
    payload,
  };
}

export function parseZoeCallData(raw: unknown): ZoeCallDataEnvelope | null {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > MAX_ZOE_CALL_DATA_BYTES) return null;
  try {
    const value = JSON.parse(raw) as Partial<ZoeCallDataEnvelope>;
    if (
      value.version !== ZOE_CALL_DATA_VERSION
      || typeof value.type !== 'string'
      || value.type.length === 0
      || typeof value.sentAt !== 'number'
      || !value.payload
      || typeof value.payload !== 'object'
      || Array.isArray(value.payload)
    ) return null;
    return value as ZoeCallDataEnvelope;
  } catch {
    return null;
  }
}