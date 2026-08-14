import { describe, it, expect } from 'vitest';
import {
  detectLoop,
  applyCircuitBreaker,
  similarity,
  CIRCUIT_BREAKER_INSTRUCTION,
} from '../../supabase/functions/_shared/loop-breaker';
import { SCRATCHPAD_INSTRUCTION } from '../../supabase/functions/_shared/grounded-tools';

const canned = "It's 28°C and sunny in Chennai today. Want the hourly forecast?";

describe('context-anchoring circuit breaker', () => {
  it('detects back-to-back repeated assistant replies', () => {
    expect(
      detectLoop([
        { role: 'user', content: 'hi' },
        { role: 'assistant', content: canned },
        { role: 'user', content: 'no, tell me about my day' },
        { role: 'assistant', content: canned },
      ]),
    ).toBe(true);
  });

  it('does not fire on normal, progressing conversation', () => {
    expect(
      detectLoop([
        { role: 'assistant', content: 'Where were you born?' },
        { role: 'assistant', content: 'Got it — Chennai. What did you love most about it?' },
      ]),
    ).toBe(false);
    expect(detectLoop([{ role: 'assistant', content: canned }])).toBe(false);
  });

  it('injects exactly one hidden system override', () => {
    const msgs = [
      { role: 'assistant', content: canned },
      { role: 'assistant', content: canned },
    ];
    const once = applyCircuitBreaker(msgs);
    expect(once).toHaveLength(3);
    expect(once[2]).toEqual({ role: 'system', content: CIRCUIT_BREAKER_INSTRUCTION });
    expect(applyCircuitBreaker(once)).toHaveLength(3);
    expect(msgs).toHaveLength(2); // input never mutated
  });

  it('similarity is markdown/punctuation tolerant', () => {
    expect(similarity('The **sky** is blue!', 'the sky is blue')).toBeGreaterThan(0.9);
    expect(similarity('the sky is blue', 'quantum physics is hard')).toBeLessThan(0.3);
  });
});

describe('negative-constraint scratchpad protocol', () => {
  it('forces a safe vocabulary list before answering', () => {
    expect(SCRATCHPAD_INSTRUCTION).toMatch(/NEGATIVE CONSTRAINTS/);
    expect(SCRATCHPAD_INSTRUCTION).toMatch(/10 highly relevant alternative words/);
    expect(SCRATCHPAD_INSTRUCTION).toMatch(/strictly forbidden from/i);
  });
});
