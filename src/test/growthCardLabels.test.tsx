/* @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CuratedInsightCard } from '@/components/growth/CuratedInsightCard';

describe('CuratedInsightCard plan labels', () => {
  it('shows category, delivery time, frequency, and selected focus context', () => {
    render(
      <CuratedInsightCard
        insight={{
          id: 'growth-1',
          slot: 'morning',
          local_date: '2026-08-28',
          title: 'Start with one decisive action',
          category: 'Career & Strategic Thinking',
          content: 'Choose one meaningful action.',
          actionable_step: null,
          created_at: '2026-08-28T07:00:00Z',
        }}
        focusAreas={['Career & Strategic Thinking', 'Deep Focus & Productivity', 'Purpose & Meaning']}
        deliveryFrequency={4}
      />,
    );

    expect(screen.getAllByText('Career & Strategic Thinking')).toHaveLength(2);
    expect(screen.getByText('Morning Focus · 07:00')).toBeTruthy();
    expect(screen.getByText('4 per day')).toBeTruthy();
    expect(screen.getByText('Deep Focus & Productivity')).toBeTruthy();
    expect(screen.getByText('+1 more')).toBeTruthy();
  });
});