/* @vitest-environment jsdom */
import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const authUser = { id: 'user-a' };

vi.mock('@/lib/auth', () => ({ useAuth: () => ({ user: authUser }) }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => vi.fn() };
});
vi.mock('@/hooks/useEventGlow', () => ({ useEventGlow: () => false, getAvatarGlowClass: () => '' }));
vi.mock('@/hooks/usePrivateTimelines', () => ({ usePrivateTimelines: () => ({ timelines: [], loading: false }) }));
vi.mock('@/hooks/useFollow', () => ({ useFollow: () => ({ isFollowing: false, toggleFollow: vi.fn(), canFollow: false }) }));
vi.mock('@/hooks/usePersistentMediaSound', () => ({ usePersistentMediaSound: () => ({ soundEnabled: false, setSoundEnabled: vi.fn() }) }));
vi.mock('@/lib/zoePlatformContext', () => ({ setZoeActivePostContext: vi.fn() }));
vi.mock('@/lib/feedEventDiagnostics', () => ({ logFeedEvent: vi.fn() }));
vi.mock('@/components/home/AuthorPreviewRail', () => ({ default: () => null }));
vi.mock('@/components/CommentSection', () => ({ default: () => null }));
vi.mock('@/components/ImageViewer', () => ({ default: () => null }));
vi.mock('@/integrations/supabase/client', () => {
  const chain = new Proxy({}, { get: () => vi.fn(() => chain) });
  return {
    supabase: {
      from: vi.fn(() => chain),
      channel: vi.fn(() => chain),
      removeChannel: vi.fn(),
      storage: { from: vi.fn(() => chain) },
    },
  };
});

import PostCard from '@/components/PostCard';
import NewContentBadge from '@/components/NewContentBadge';
import { __resetFeedPlaybackMemory, hasPlayedFeedMedia } from '@/lib/feedPlayback';

vi.mock('@/hooks/useGrowthFlags', () => ({ useGrowthFlags: () => ({ isEnabled: () => true, loading: false }) }));

const CompletionHarness = () => {
  const [isNew, setIsNew] = useState(true);
  return (
    <div data-testid="completion-card" data-new={isNew ? 'true' : 'false'}>
      {isNew && <NewContentBadge onViewed={() => setIsNew(false)} />}
      <PostCard
        post={{
          id: 'video-post', user_id: 'creator', content: 'A loop',
          media_url: 'https://example.com/loop.mp4', media_type: 'video',
          likes_count: 0, comments_count: 0, created_at: new Date().toISOString(),
        }}
        onUpdate={vi.fn()}
        onMediaCompleted={() => setIsNew(false)}
      />
    </div>
  );
};

describe('PostCard completion contract', () => {
  beforeEach(() => {
    localStorage.clear();
    __resetFeedPlaybackMemory();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => null);
    vi.stubGlobal('IntersectionObserver', class {
      observe() {}
      disconnect() {}
      unobserve() {}
      takeRecords() { return []; }
      root = null;
      rootMargin = '';
      thresholds = [];
    });
  });

  it('persists play-once and tells the feed to remove this post New marker', () => {
    render(<CompletionHarness />);

    expect(screen.getByTestId('completion-card').getAttribute('data-new')).toBe('true');
    expect(screen.getByTestId('new-content-badge')).toBeTruthy();

    fireEvent.ended(screen.getByTestId('post-video'));

    expect(hasPlayedFeedMedia('user-a', 'video-post')).toBe(true);
    expect(screen.getByTestId('completion-card').getAttribute('data-new')).toBe('false');
    expect(screen.queryByTestId('new-content-badge')).toBeNull();
  });
});