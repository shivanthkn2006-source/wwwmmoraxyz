// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { buildAnnouncementSpeech, isZoeAnnouncementsEnabled, setZoeAnnouncementsEnabled } from '@/lib/zoeAnnouncements';

describe('zoe announcements', () => {
  beforeEach(() => window.localStorage.clear());

  it('is enabled by default and can be toggled', () => {
    expect(isZoeAnnouncementsEnabled()).toBe(true);
    setZoeAnnouncementsEnabled(false);
    expect(isZoeAnnouncementsEnabled()).toBe(false);
    setZoeAnnouncementsEnabled(true);
    expect(isZoeAnnouncementsEnabled()).toBe(true);
  });

  it('drops the timestamp segment and keeps human parts', () => {
    const text = buildAnnouncementSpeech('New like', '31 Aug 2026 · 07:12 · Home feed · from Asha · liked your post');
    expect(text).toBe('New like. Home feed. from Asha. liked your post.');
  });

  it('falls back to the title alone', () => {
    expect(buildAnnouncementSpeech('New message')).toBe('New message.');
  });
});
