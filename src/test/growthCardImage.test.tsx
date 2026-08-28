/* @vitest-environment jsdom */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import CuratedInsightCard from '@/components/growth/CuratedInsightCard';

describe('CuratedInsightCard image', () => {
  it('renders a Pollinations illustration inside the card', () => {
    render(
      <CuratedInsightCard
        insight={{
          id: 'abc',
          slot: 'night' as never,
          title: 'Wind down with intent',
          category: 'Mindset',
          content: 'Reflect on one win.',
          actionable_step: null,
          created_at: new Date().toISOString(),
        }}
      />,
    );
    const img = screen.getByAltText(/Illustration for Wind down with intent/i) as HTMLImageElement;
    expect(img.src).toContain('image.pollinations.ai/prompt/');
    expect(img.src).toContain('seed=');
    expect(decodeURIComponent(img.src)).toContain('Reflect on one win.');
    expect(decodeURIComponent(img.src)).toContain('no human faces');
  });
});
