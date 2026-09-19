// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import HomeGlassDock from '@/components/home/HomeGlassDock';
import ZoeCallsIcon from '@/components/icons/ZoeCallsIcon';

afterEach(cleanup);

describe('Calls Home menu action', () => {
  it('is visible, named, and wired when the Home menu opens', () => {
    const onSelect = vi.fn();
    render(
      <HomeGlassDock
        items={[{
          id: 'calls',
          label: 'Audio & video calls',
          icon: <ZoeCallsIcon data-testid="zoe-calls-icon" />,
          onSelect,
        }]}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open home menu' }));
    const calls = screen.getByRole('menuitem', { name: 'Audio & video calls' });
    expect(screen.getByTestId('zoe-calls-icon')).toBeTruthy();
    fireEvent.click(calls);
    expect(onSelect).toHaveBeenCalledOnce();
  });
});