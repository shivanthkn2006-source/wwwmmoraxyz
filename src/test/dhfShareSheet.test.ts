import { describe, expect, it } from 'vitest';
import { CLIPBOARD_SHARE_TARGETS, buildShareCaption } from '@/components/dhf/DhfShareSheet';
import { WEB_SHARE_TARGETS, buildShareUrl, isOpenableShareUrl } from '@/lib/shareTargets';

const payload = {
  text: 'Marcus Aurelius on starting the day',
  url: 'https://mmora.xyz/dhf/essay/abc',
  hashtags: ['#Stoicism', 'Daily Compass'],
};

describe('DHF share sheet', () => {
  it('builds a caption carrying text, link and cleaned hashtags', () => {
    const caption = buildShareCaption(payload);
    expect(caption).toContain('Marcus Aurelius');
    expect(caption).toContain(payload.url);
    expect(caption).toContain('#Stoicism');
    expect(caption).toContain('#DailyCompass');
  });

  it('drops missing pieces without leaving blank lines', () => {
    expect(buildShareCaption({ text: 'just text' })).toBe('just text');
  });

  it('offers every web target as an openable link', () => {
    WEB_SHARE_TARGETS.forEach((target) => {
      expect(isOpenableShareUrl(buildShareUrl(target, payload)), target).toBe(true);
    });
  });

  it('sends YouTube, TikTok and Instagram down the clipboard path', () => {
    expect(CLIPBOARD_SHARE_TARGETS).toEqual(['youtube', 'tiktok', 'instagram']);
    CLIPBOARD_SHARE_TARGETS.forEach((target) => {
      expect(isOpenableShareUrl(buildShareUrl(target, payload)), target).toBe(true);
    });
  });
});
