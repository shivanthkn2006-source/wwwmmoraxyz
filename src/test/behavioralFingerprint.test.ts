import { describe, it, expect, vi, beforeEach } from 'vitest';

const upsert = vi.fn(async (_row?: Record<string, unknown>) => ({ error: null }));
let currentUser: { id: string } | null = { id: 'user-1' };
let existingRow: Record<string, unknown> | null = null;

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getUser: async () => ({ data: { user: currentUser } }) },
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: existingRow, error: null }) }),
      }),
      upsert,
    }),
  },
}));

import {
  persistBehavioralFingerprint,
  isMeaningfulSample,
  blendEma,
  averagePause,
  type BehavioralFingerprintSample,
} from '@/services/behavioralFingerprintService';

const sample = (over: Partial<BehavioralFingerprintSample> = {}): BehavioralFingerprintSample => ({
  wordsPerMinute: 50,
  deletionCount: 2,
  pausesBetweenWords: [600, 1400],
  totalTypingDuration: 12000,
  characterCount: 60,
  wordCount: 12,
  hesitationLevel: 'low',
  inferredState: 'calm',
  confidenceScore: 0.6,
  ...over,
});

beforeEach(() => {
  upsert.mockClear();
  currentUser = { id: 'user-1' };
  existingRow = null;
});

describe('behavioural fingerprint persistence', () => {
  it('ignores trivial typing samples', async () => {
    const res = await persistBehavioralFingerprint(sample({ characterCount: 2 }));
    expect(res).toEqual({ persisted: false, reason: 'insignificant' });
    expect(upsert).not.toHaveBeenCalled();
  });

  it('skips anonymous visitors', async () => {
    currentUser = null;
    const res = await persistBehavioralFingerprint(sample());
    expect(res.reason).toBe('anonymous');
  });

  it('writes a first fingerprint with raw values', async () => {
    const res = await persistBehavioralFingerprint(sample());
    expect(res.persisted).toBe(true);
    const row = upsert.mock.calls[0][0] as Record<string, unknown>;
    expect(row.user_id).toBe('user-1');
    expect(row.avg_typing_speed).toBe(50);
    expect(row.reaction_time_avg_ms).toBe(1000);
    expect(row.fingerprint_version).toBe(1);
  });

  it('blends into the existing fingerprint instead of overwriting it', async () => {
    existingRow = { avg_typing_speed: 100, reaction_time_avg_ms: 2000, fingerprint_version: 4 };
    await persistBehavioralFingerprint(sample());
    const row = upsert.mock.calls[0][0] as Record<string, unknown>;
    expect(row.avg_typing_speed).toBe(85);
    expect(row.reaction_time_avg_ms).toBe(1700);
    expect(row.fingerprint_version).toBe(5);
  });

  it('exposes stable helper maths', () => {
    expect(isMeaningfulSample(sample({ totalTypingDuration: 100 }))).toBe(false);
    expect(blendEma(null, 42)).toBe(42);
    expect(averagePause([1000, 2000])).toBe(1500);
  });
});
