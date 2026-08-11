import { describe, it, expect } from 'vitest';
import {
  evaluateMath,
  formatNumber,
  executeGroundedTool,
  precomputeGroundedFacts,
  groundedFactsBlock,
  stripScratchpad,
  extractScratchpad,
} from '../../supabase/functions/_shared/grounded-tools';
import { stripScratchpad as clientStrip, hasScratchpad } from '@/utils/hiddenScratchpad';

describe('evaluateMath (deterministic grounding)', () => {
  it('respects operator precedence and parentheses', () => {
    expect(evaluateMath('3 + 2 * 4')).toBe(11);
    expect(evaluateMath('(3 + 2) * 4')).toBe(20);
    expect(evaluateMath('2 ^ 3 ^ 2')).toBe(512);
  });

  it('handles unary signs, functions and separators', () => {
    expect(evaluateMath('-5 + 10')).toBe(5);
    expect(evaluateMath('sqrt(16) * 2')).toBe(8);
    expect(evaluateMath('1,250 / 5')).toBe(250);
    expect(evaluateMath('10 divided by 4')).toBe(2.5);
  });

  it('rejects unsafe or malformed input instead of guessing', () => {
    expect(() => evaluateMath('fetch("/x")')).toThrow();
    expect(() => evaluateMath('5 / 0')).toThrow(/zero/i);
    expect(() => evaluateMath('(3 + 2')).toThrow(/parenthes/i);
    expect(() => evaluateMath('')).toThrow();
  });

  it('formats float noise cleanly', () => {
    expect(formatNumber(evaluateMath('0.1 + 0.2'))).toBe('0.3');
  });
});

describe('tool execution loop contract', () => {
  it('math_calculator returns a structured fact', () => {
    expect(executeGroundedTool('math_calculator', { expression: '17 * 3' })).toMatchObject({
      ok: true,
      value: 51,
      display: '51',
    });
  });

  it('logic_checker corrects a wrong claim', () => {
    const r = executeGroundedTool('logic_checker', { expression: '12 * 12', claimed_value: 132 }) as any;
    expect(r.claim_is_true).toBe(false);
    expect(r.instruction).toContain('144');
  });

  it('never throws — errors come back as data', () => {
    const r = executeGroundedTool('math_calculator', { expression: 'rm -rf /' }) as any;
    expect(r.ok).toBe(false);
    expect(typeof r.error).toBe('string');
  });
});

describe('pre-compute grounding net', () => {
  it('solves arithmetic found in natural language', () => {
    const facts = precomputeGroundedFacts('If I buy 3 * 249 items and add 15 + 6 shipping, what is the total?');
    expect(facts.map((f) => (f.result as any).display)).toEqual(['747', '21']);
    expect(groundedFactsBlock(facts)).toContain('3 * 249 = 747');
  });

  it('stays empty when there is nothing to compute', () => {
    expect(precomputeGroundedFacts('tell me a story about the sea')).toEqual([]);
    expect(groundedFactsBlock([])).toBe('');
  });
});

describe('hidden scratchpad', () => {
  const reply = 'Hi!\n<scratchpad>mug moves to pantry, so 3+2=5</scratchpad>\nThe mug is in the pantry.';

  it('hides reasoning from the user on both server and client', () => {
    expect(stripScratchpad(reply)).toBe('Hi!\nThe mug is in the pantry.');
    expect(clientStrip(reply)).toBe('Hi!\nThe mug is in the pantry.');
    expect(hasScratchpad(reply)).toBe(true);
  });

  it('drops truncated/unclosed scratchpads', () => {
    expect(stripScratchpad('Answer soon.\n<scratchpad>step 1 ...')).toBe('Answer soon.');
    expect(clientStrip('<think>half a thought')).toBe('');
  });

  it('keeps the hidden reasoning available for the CoT panel', () => {
    expect(extractScratchpad(reply)).toEqual(['mug moves to pantry, so 3+2=5']);
  });
});
