import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Captures the exact payload sent to the model so we can prove the
 * personalisation wiring end to end: assigned angle, title avoid-list,
 * birth resonance and figure avoidance all have to reach the prompt.
 */
const calls: Array<Record<string, any>> = [];

vi.mock('../../supabase/functions/_shared/sovereign-ai.ts', () => ({
  sovereignFetch: vi.fn(async (_url: string, init: any) => {
    const body = JSON.parse(init.body);
    const userMsg = body.messages.find((m: any) => m.role === 'user').content;
    calls.push(JSON.parse(userMsg.slice(userMsg.indexOf('{'), userMsg.lastIndexOf('}') + 1)));
    return {
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{
          message: {
            content: JSON.stringify({
              title: 'A Distinct Headline',
              content: 'Body copy for the card.',
              category: 'Purpose & Meaning',
              actionable_step: 'Do the small thing now.',
            }),
          },
        }],
      }),
    };
  }),
}));

const { generateInsight } = await import('../../supabase/functions/_shared/growth-content');

beforeEach(() => { calls.length = 0; });

const base = {
  slot: 'afternoon' as const,
  localDate: '2026-09-01',
  focusAreas: ['Purpose & Meaning'],
  seed: 'user-x_2026-09-01_afternoon',
};

describe('growth insight prompt wiring', () => {
  it('always sends a concrete angle for the day', async () => {
    await generateInsight({ ...base, style: 'actionable', birthDate: '1977-08-16' });
    expect(calls[0].assigned_angle).toBeTruthy();
    expect(typeof calls[0].assigned_angle).toBe('string');
  });

  it('passes the member age through so the model can match life stage', async () => {
    await generateInsight({ ...base, style: 'actionable', birthDate: '1977-08-16' });
    expect(calls[0].member_age).toBeGreaterThan(40);
  });

  it('names a figure only for biographical cards', async () => {
    await generateInsight({ ...base, style: 'biographical', birthDate: '1977-08-16' });
    expect(calls[0].assigned_figure).toBeTruthy();
    expect(calls[0].known_for).toBeTruthy();

    calls.length = 0;
    await generateInsight({ ...base, style: 'philosophical', birthDate: '1977-08-16' });
    expect(calls[0].assigned_figure).toBeUndefined();
  });

  it('forwards the headline avoid-list that fixes repeated titles', async () => {
    await generateInsight({
      ...base,
      style: 'actionable',
      birthDate: '1977-08-16',
      avoidTitles: ['Midday Focus Reset', 'Morning Focus Ritual'],
    });
    expect(calls[0].avoid_titles).toContain('Midday Focus Reset');
  });

  it('never lists the assigned figure in its own avoid list', async () => {
    const first = await generateInsight({ ...base, style: 'biographical', birthDate: '1977-08-16' });
    const name = first.figure!.name;
    calls.length = 0;
    await generateInsight({
      ...base,
      style: 'biographical',
      birthDate: '1977-08-16',
      avoidFigures: [name, 'Benjamin Franklin'],
    });
    expect(calls[0].avoid_figures ?? []).not.toContain(calls[0].assigned_figure);
  });

  it('surfaces a birth resonance fact when the member shares the figure birth month', async () => {
    // Sweep birth months; at least one must produce a resonance line, proving
    // the connection is computed rather than always dropped.
    let found = 0;
    for (let m = 1; m <= 12; m++) {
      calls.length = 0;
      await generateInsight({
        ...base,
        style: 'biographical',
        birthDate: `1977-${String(m).padStart(2, '0')}-16`,
        seed: `resonance_${m}`,
      });
      if (calls[0].birth_resonance) found++;
    }
    expect(found).toBeGreaterThan(0);
  });

  it('returns the parsed card from the model rather than a vault fallback', async () => {
    const res = await generateInsight({ ...base, style: 'actionable', birthDate: '1977-08-16' });
    expect(res.content.source).toBe('llm');
    expect(res.content.title).toBe('A Distinct Headline');
    expect(res.error).toBeUndefined();
  });
});
