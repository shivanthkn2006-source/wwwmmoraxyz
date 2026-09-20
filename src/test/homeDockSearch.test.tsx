// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MessageCircle, Settings } from 'lucide-react';
import HomeGlassDock from '@/components/home/HomeGlassDock';

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe('Home menu search and contained labels', () => {
  it('filters every menu destination and keeps its action wired', () => {
    const openSettings = vi.fn();
    render(
      <HomeGlassDock
        items={[
          { id: 'settings', label: 'Settings', icon: <Settings />, onSelect: openSettings },
          { id: 'messages', label: 'Messages', icon: <MessageCircle />, onSelect: vi.fn() },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open home menu' }));
    const search = screen.getByRole('searchbox', { name: 'Search home menu icons' });
    fireEvent.change(search, { target: { value: 'settings' } });

    const settings = screen.getByRole('menuitem', { name: 'Settings' });
    expect(screen.queryByRole('menuitem', { name: 'Messages' })).toBeNull();
    expect(settings.querySelector('.home-dock-label')?.textContent).toBe('Settings');
    expect(settings.querySelector('.home-dock-label')?.className).toContain('bottom-1');

    fireEvent.click(settings);
    expect(openSettings).toHaveBeenCalledOnce();
  });

  it('clears the search whenever the panel closes', () => {
    render(<HomeGlassDock items={[{ id: 'settings', label: 'Settings', icon: <Settings />, onSelect: vi.fn() }]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Open home menu' }));
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search home menu icons' }), { target: { value: 'missing' } });
    fireEvent.keyDown(window, { key: 'Escape' });
    fireEvent.click(screen.getByRole('button', { name: 'Open home menu' }));
    expect(screen.getByRole('searchbox', { name: 'Search home menu icons' })).toHaveValue('');
    expect(screen.getByRole('menuitem', { name: 'Settings' })).toBeTruthy();
  });
});