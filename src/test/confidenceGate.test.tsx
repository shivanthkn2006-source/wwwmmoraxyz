// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
afterEach(() => cleanup());
import {
  applyConfidenceGate,
  isLowConfidence,
  markUncertainSpans,
  CONFIDENCE_THRESHOLD,
  type Metacognition,
} from '@/utils/confidenceGate';
import { ConfidenceGatedMessage } from '@/components/zoe-infinity/ConfidenceGatedMessage';

const meta = (over: Partial<Metacognition> = {}): Metacognition => ({
  internalMonologue: [],
  confidence: 0.9,
  uncertainClaims: [],
  clarifyingQuestion: null,
  needsClarification: false,
  deepMode: false,
  ...over,
});

describe('confidence gate logic', () => {
  it('passes high-confidence answers through', () => {
    const r = applyConfidenceGate('Paris is the capital of France.', meta());
    expect(r.withheld).toBe(false);
    expect(r.spokenText).toContain('Paris');
  });

  it('withholds when confidence is below threshold', () => {
    const r = applyConfidenceGate('It was 1832.', meta({
      confidence: CONFIDENCE_THRESHOLD - 0.1,
      clarifyingQuestion: 'Which treaty do you mean?',
    }));
    expect(r.withheld).toBe(true);
    expect(r.spokenText).toBe('Which treaty do you mean?');
    expect(r.draftAnswer).toBe('It was 1832.');
  });

  it('withholds when uncertain claims exist even at high confidence', () => {
    const r = applyConfidenceGate('Revenue grew 40%.', meta({
      confidence: 0.95,
      uncertainClaims: ['grew 40%'],
      clarifyingQuestion: 'Which fiscal year?',
    }));
    expect(r.withheld).toBe(true);
  });

  it('does not withhold without a clarifying question (never goes silent)', () => {
    const r = applyConfidenceGate('Maybe.', meta({ confidence: 0.2 }));
    expect(r.withheld).toBe(false);
    expect(r.spokenText).toBe('Maybe.');
  });

  it('flags needsClarification', () => {
    expect(isLowConfidence(meta({ needsClarification: true }))).toBe(true);
    expect(isLowConfidence(meta())).toBe(false);
    expect(isLowConfidence(null)).toBe(false);
  });
});

describe('uncertain span marking', () => {
  it('splits text around a claim', () => {
    const segs = markUncertainSpans('Sales rose 12% last quarter.', ['rose 12%']);
    expect(segs.map((s) => s.uncertain)).toEqual([false, true, false]);
    expect(segs[1].text).toBe('rose 12%');
  });

  it('ignores claims not present in the text', () => {
    const segs = markUncertainSpans('Hello world', ['nope']);
    expect(segs).toEqual([{ text: 'Hello world', uncertain: false }]);
  });

  it('avoids overlapping ranges', () => {
    const segs = markUncertainSpans('alpha beta gamma', ['alpha beta', 'beta']);
    expect(segs.filter((s) => s.uncertain)).toHaveLength(1);
  });
});

describe('ConfidenceGatedMessage', () => {
  it('renders the clarifying question instead of the answer', () => {
    render(
      <ConfidenceGatedMessage
        message="The launch is on March 4."
        metacognition={meta({ confidence: 0.3, clarifyingQuestion: 'Which launch?' })}
      />
    );
    expect(screen.getByTestId('confidence-gate-withheld')).toBeTruthy();
    expect(screen.getByText('Which launch?')).toBeTruthy();
    expect(screen.queryByText('The launch is on March 4.')).toBeNull();
  });

  it('marks uncertain spans in confident answers', () => {
    render(
      <ConfidenceGatedMessage
        message="Revenue grew 40% this year."
        metacognition={meta({ uncertainClaims: ['grew 40%'], clarifyingQuestion: null })}
      />
    );
    expect(screen.getByTestId('uncertain-span').textContent).toBe('grew 40%');
  });

  it('renders plain text with no metacognition', () => {
    render(<ConfidenceGatedMessage message="Hi there." />);
    expect(screen.getByTestId('confidence-gate-answer').textContent).toBe('Hi there.');
  });
});
