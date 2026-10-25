/* @vitest-environment jsdom */
import React, { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import PostsGrid from '@/components/PostsGrid';
import ImageViewer from '@/components/ImageViewer';
import ChatUserCard from '@/components/ChatUserCard';

vi.mock('@/hooks/useEventGlow', () => ({ useEventGlow: () => false, getAvatarGlowClass: () => '' }));
vi.mock('@/components/StatusIconBadge', () => ({ default: () => null }));
afterEach(cleanup);

describe('social keyboard actions', () => {
 it('opens the chosen post without changing its identity', () => {
  const open = vi.fn();
  const post = { id: 'chosen-post', user_id: 'author', content: 'Garden', media_url: null, media_type: null, likes_count: 0, comments_count: 0, created_at: '2026-10-25' };
  render(<PostsGrid posts={[post]} onPostClick={open} />);
  fireEvent.click(screen.getByRole('button', { name: 'Open post Garden' }));
  expect(open).toHaveBeenCalledWith(post);
 });
 it('keeps conversation and profile actions separate', () => {
  const open = vi.fn();
  render(<MemoryRouter><ChatUserCard user={{ user_id: 'member-a', display_name: 'Ari', username: 'ari' } as React.ComponentProps<typeof ChatUserCard>['user']} onClick={open} /></MemoryRouter>);
  fireEvent.click(screen.getByRole('link', { name: 'View Ari’s profile' }));
  expect(open).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Open conversation with Ari' }));
  expect(open).toHaveBeenCalledWith('member-a');
 });
  it('keeps conversation details painted above the hover layer', () => {
  render(<MemoryRouter><ChatUserCard user={{ user_id: 'member-a', display_name: 'Ari', username: 'ari', last_message: { content: 'See you soon', created_at: '2026-10-25' } } as React.ComponentProps<typeof ChatUserCard>['user']} onClick={vi.fn()} /></MemoryRouter>);
  const overlay = screen.getByRole('button', { name: 'Open conversation with Ari' });
  expect(overlay.className).toContain('absolute');
  const details = screen.getByText('Ari').closest('div.pointer-events-none');
  expect(details?.className).toContain('relative');
  expect(details?.className).toContain('z-10');
 });
 it('closes the image viewer with Escape', () => {
  function Harness() { const [open, setOpen] = useState(true); return open ? <ImageViewer imageUrl="data:image/png;base64," alt="Garden photo" onClose={() => setOpen(false)} /> : null; }
  render(<Harness />);
  expect(screen.getByRole('dialog', { name: 'Garden photo' })).toBeTruthy();
  fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
  expect(screen.queryByRole('dialog')).toBeNull();
 });
});
