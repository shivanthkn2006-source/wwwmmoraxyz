// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import HomeGlassDock from '@/components/home/HomeGlassDock';
import ZoeCallsIcon from '@/components/icons/ZoeCallsIcon';

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

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

  it('keeps a working Home destination inside the open panel', () => {
    const onHomeSelect = vi.fn();
    render(<HomeGlassDock items={[]} onHomeSelect={onHomeSelect} />);
    fireEvent.click(screen.getByRole('button', { name: 'Open home menu' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Home feed' }));
    expect(onHomeSelect).toHaveBeenCalledOnce();
  });

  it('renders a frequently used action beside the closed Home trigger', () => {
    const onSelect = vi.fn();
    window.localStorage.setItem('mmora:home-dock-usage:v1', JSON.stringify({ calls: { count: 2, last: Date.now() } }));
    render(<HomeGlassDock items={[{ id: 'calls', label: 'Audio & video calls', icon: <ZoeCallsIcon />, onSelect }]} onHomeSelect={() => {}} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Audio & video calls' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Open home menu' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Audio & video calls' }));
    expect(onSelect).toHaveBeenCalledOnce();
  });

  it('keeps every used menu reachable without limiting the rail to four', () => {
    const selections = Array.from({ length: 10 }, () => vi.fn());
    const usage = Object.fromEntries(selections.map((_, index) => [`menu-${index}`, { count: index + 1, last: Date.now() }]));
    window.localStorage.setItem('mmora:home-dock-usage:v1', JSON.stringify(usage));
    render(<HomeGlassDock items={selections.map((onSelect, index) => ({
      id: `menu-${index}`, label: `Menu ${index}`, icon: <span>{index}</span>, onSelect,
    }))} />);
    expect(screen.getAllByRole('button')).toHaveLength(11);
    fireEvent.click(screen.getByRole('button', { name: 'Menu 0' }));
    fireEvent.click(screen.getByRole('button', { name: 'Menu 9' }));
    expect(selections[0]).toHaveBeenCalledOnce();
    expect(selections[9]).toHaveBeenCalledOnce();
  });
});
