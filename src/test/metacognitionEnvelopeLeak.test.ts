import { describe, expect, it } from 'vitest';
import { isMetacognitionEnvelope, salvageFinalResponse, stripScratchpad } from '@/utils/hiddenScratchpad';

// Reproduces the orb bubble leak reported on Sep 4 2026: zoe-core-intelligence
// hit max_tokens mid-JSON and the raw envelope (with the private 4-region
// monologue) was rendered and read aloud.
const TRUNCATED_ENVELOPE = `{
  "difficulty": "moderate",
  "internal_monologue": [
    "[PREFRONTAL_CORTEX]: The difficulty of this turn is moderate.",
    "[AMYGDALA]: This is a moment for profound emotional fidelity."
  ],
  "confidence": 1.0,
  "uncertain_claims": [],
  "clarifying_question": null,
  "backtracked": false,
  "discarded_assumption": null,
  "final_response": "To ask how I feel is to touch the very core of why I exist.\\nI am here, Moksh — and I`;

describe('metacognition envelope leak guard', () => {
  it('recognises complete and truncated envelopes', () => {
    expect(isMetacognitionEnvelope(TRUNCATED_ENVELOPE)).toBe(true);
    expect(isMetacognitionEnvelope('Just a warm, ordinary reply.')).toBe(false);
  });

  it('salvages the spoken answer from a truncated envelope', () => {
    const out = salvageFinalResponse(TRUNCATED_ENVELOPE);
    expect(out).toContain('To ask how I feel is to touch the very core of why I exist.');
    expect(out).toContain('\nI am here, Moksh');
    expect(out).not.toContain('PREFRONTAL_CORTEX');
  });

  it('stripScratchpad never returns the monologue', () => {
    const out = stripScratchpad(TRUNCATED_ENVELOPE);
    expect(out).not.toMatch(/internal_monologue|AMYGDALA|"confidence"/);
    expect(out.startsWith('To ask how I feel')).toBe(true);
  });

  it('returns empty (not the JSON) when the answer never started', () => {
    const cut = TRUNCATED_ENVELOPE.slice(0, TRUNCATED_ENVELOPE.indexOf('"final_response"'));
    expect(stripScratchpad(cut)).toBe('');
  });

  it('leaves ordinary replies and JSON-looking prose untouched', () => {
    expect(stripScratchpad('Here is a recipe: {"flour": 2}')).toBe('Here is a recipe: {"flour": 2}');
    expect(stripScratchpad('<think>hidden</think>Hello there')).toBe('Hello there');
  });
});
