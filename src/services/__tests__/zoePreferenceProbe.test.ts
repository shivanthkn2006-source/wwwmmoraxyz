// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke: vi.fn().mockResolvedValue({ data: { facts: [] }, error: null }) } },
}));

import { maybePreferenceProbe, pickProbeTopic, PROBE_TOPICS, resetPreferenceProbe } from '@/services/zoePreferenceProbe';

const REPLY = 'The weather in Kochi is warm and humid today, around thirty degrees.';

describe('preference probe', () => {
  beforeEach(() => {
    resetPreferenceProbe();
    localStorage.clear();
  });

  it('never asks on the opening turn', () => {
    expect(maybePreferenceProbe({ turnIndex: 0, replyText: REPLY })).toBeNull();
  });

  it('asks about allergies first once the conversation is running', async () => {
    maybePreferenceProbe({ turnIndex: 4, replyText: REPLY }); // warms the cache
    await new Promise((r) => setTimeout(r, 0));
    const question = maybePreferenceProbe({ turnIndex: 4, replyText: REPLY });
    expect(question).toContain('allergic');
  });

  it('asks at most once per conversation', async () => {
    maybePreferenceProbe({ turnIndex: 4, replyText: REPLY });
    await new Promise((r) => setTimeout(r, 0));
    expect(maybePreferenceProbe({ turnIndex: 4, replyText: REPLY })).not.toBeNull();
    expect(maybePreferenceProbe({ turnIndex: 6, replyText: REPLY })).toBeNull();
  });

  it('never stacks onto a reply that already asks something', async () => {
    maybePreferenceProbe({ turnIndex: 4, replyText: REPLY });
    await new Promise((r) => setTimeout(r, 0));
    expect(maybePreferenceProbe({ turnIndex: 4, replyText: 'How did that go?' })).toBeNull();
  });

  it('skips topics the person has already answered', () => {
    const known = new Set(['health:allergies', 'food:likes']);
    expect(pickProbeTopic(known)?.factKey).toBe('dislikes');
    expect(pickProbeTopic(new Set(PROBE_TOPICS.map((t) => `${t.category}:${t.factKey}`)))).toBeNull();
  });
});
