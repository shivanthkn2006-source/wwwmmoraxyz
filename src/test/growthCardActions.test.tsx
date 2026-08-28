/* @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CuratedInsightCard from '@/components/growth/CuratedInsightCard';

const insight = {
  id: 'growth-action-test',
  slot: 'night' as const,
  title: "Franklin's 15-Minute Focus",
  category: 'Career & Strategic Thinking',
  content: 'Benjamin Franklin used short, deliberate planning sessions.',
  actionable_step: null,
  created_at: '2026-08-28T19:30:00Z',
};

describe('CuratedInsightCard actions', () => {
  it('fires the info and save actions without triggering the card action', () => {
    const onOpenDetails = vi.fn();
    const onToggleSave = vi.fn();
    const onCardClick = vi.fn();

    render(
      <CuratedInsightCard
        insight={insight}
        onOpenDetails={onOpenDetails}
        onToggleSave={onToggleSave}
        onCardClick={onCardClick}
      />,
    );

    const info = screen.getByRole('button', { name: 'How this insight was made' });
    const save = screen.getByRole('button', { name: 'Save this insight' });
    expect(info.className).not.toContain('border');
    expect(save.className).not.toContain('border');

    fireEvent.click(info);
    fireEvent.click(save);

    expect(onOpenDetails).toHaveBeenCalledWith(insight);
    expect(onToggleSave).toHaveBeenCalledWith(insight.id);
    expect(onCardClick).not.toHaveBeenCalled();
  });
});