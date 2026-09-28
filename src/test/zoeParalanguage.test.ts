import { describe, it, expect, vi } from 'vitest';
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
import { detectUserCues, applyParalanguage, isCacheable, describeTraits } from '@/lib/zoeParalanguage';
describe('paralanguage', () => {
  it('cues', () => {
    expect(detectUserCues('hmmm not sure')).toContain('hmm');
    expect(detectUserCues('hahaha that is funny')).toContain('laugh');
    expect(detectUserCues('lol')).toContain('laugh');
    expect(detectUserCues('um what')).toContain('filler');
    expect(detectUserCues('mhm')).toContain('backchannel');
    expect(detectUserCues('what is love')).toEqual([]);
  });
  it('tags', () => {
    expect(applyParalanguage('[PHYSICAL: Oof] that sounds hard.')).toBe('Oof, That sounds hard.');
    expect(applyParalanguage('[HESITATION: Hmm] let me think')).toBe('Hmm... Let me think');
    expect(applyParalanguage('[HESITATION: Hmm] again')).toBe('again');
    expect(applyParalanguage('plain answer')).toBe('plain answer');
  });
  it('cache rules', () => {
    expect(isCacheable('what is my sun sign meaning')).toBe(true);
    expect(isCacheable('tell me the weather today')).toBe(false);
    expect(isCacheable('hmm what is my sun sign')).toBe(false);
  });
  it('traits text', () => {
    expect(describeTraits({ cues: { laugh: 4 }, topics: { love: 3 } }, ['laugh'])).toMatch(/laugh/);
  });
});
