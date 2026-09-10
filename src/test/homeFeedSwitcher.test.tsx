/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HomeFeedSwitcher } from '@/components/home/HomeFeedSwitcher';

const options = [
  { id: 'global', label: 'Global' },
  { id: 'personal', label: 'Friends' },
  { id: 'mosaic', label: 'Mosaic' },
  { id: 'selfiecity', label: 'Selfie City' },
];

describe('HomeFeedSwitcher', () => {
  afterEach(cleanup);

  it('starts as one unobtrusive Global control and expands the existing feeds', () => {
    const onChange = vi.fn();
    render(<HomeFeedSwitcher options={options} value="global" onChange={onChange} />);

    const global = screen.getByRole('tab', { name: 'Global' });
    expect(global.getAttribute('aria-expanded')).toBe('false');
    const friends = screen.getByRole('tab', { name: 'Friends', hidden: true });
    expect(friends.parentElement?.getAttribute('aria-hidden')).toBe('true');

    fireEvent.click(global);
    expect(onChange).toHaveBeenCalledWith('global');
    expect(global.getAttribute('aria-expanded')).toBe('true');
    expect(friends.parentElement?.getAttribute('aria-hidden')).toBe('false');
  });

  it('selects existing feeds without changing Home business logic', () => {
    const onChange = vi.fn();
    render(<HomeFeedSwitcher options={options} value="global" onChange={onChange} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Global' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Mosaic' }));
    expect(onChange).toHaveBeenLastCalledWith('mosaic');
  });
});