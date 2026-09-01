// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from 'vitest';
import {
  SHARE_TARGET_LABELS,
  WEB_SHARE_TARGETS,
  buildAllShareUrls,
  buildShareUrl,
  isOpenableShareUrl,
  openShare,
  type ShareTarget,
} from '@/lib/shareTargets';

const payload = {
  text: 'Marcus Aurelius on starting the day with intent',
  url: 'https://mmora.xyz/post/abc123',
  hashtags: ['#Stoicism', 'daily growth'],
};

describe('shareTargets', () => {
  afterEach(() => vi.restoreAllMocks());

  it('produces an openable URL for every target', () => {
    const all = buildAllShareUrls(payload);
    (Object.keys(SHARE_TARGET_LABELS) as ShareTarget[]).forEach((target) => {
      expect(isOpenableShareUrl(all[target]), `${target} share URL`).toBe(true);
    });
  });

  it('builds an X intent carrying text, url and cleaned hashtags', () => {
    const url = new URL(buildShareUrl('x', payload) as string);
    expect(url.origin + url.pathname).toBe('https://x.com/intent/post');
    expect(url.searchParams.get('text')).toContain('Marcus Aurelius');
    expect(url.searchParams.get('url')).toBe(payload.url);
    expect(url.searchParams.get('hashtags')).toBe('Stoicism,dailygrowth');
  });

  it('keeps the X text inside the 280 character budget', () => {
    const long = 'a'.repeat(600);
    const url = new URL(buildShareUrl('x', { text: long, url: payload.url }) as string);
    expect((url.searchParams.get('text') ?? '').length).toBeLessThanOrEqual(280);
  });

  it('encodes the target URL for link-only platforms', () => {
    expect(buildShareUrl('facebook', payload)).toBe(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(payload.url)}`,
    );
    expect(buildShareUrl('linkedin', payload)).toContain(encodeURIComponent(payload.url));
  });

  it('returns null for link-only platforms without a URL', () => {
    expect(buildShareUrl('facebook', { text: 'no link' })).toBeNull();
    expect(buildShareUrl('linkedin', { text: 'no link' })).toBeNull();
  });

  it('still shares text-only payloads on text platforms', () => {
    WEB_SHARE_TARGETS.filter((t) => !['facebook', 'linkedin'].includes(t)).forEach((target) => {
      expect(isOpenableShareUrl(buildShareUrl(target, { text: 'hello world' })), target).toBe(true);
    });
  });

  it('combines text and url for WhatsApp and Telegram', () => {
    expect(decodeURIComponent(buildShareUrl('whatsapp', payload) as string)).toContain(payload.url);
    const telegram = new URL(buildShareUrl('telegram', payload) as string);
    expect(telegram.searchParams.get('url')).toBe(payload.url);
    expect(telegram.searchParams.get('text')).toBe(payload.text);
  });

  it('builds a mailto link for email', () => {
    const email = buildShareUrl('email', payload) as string;
    expect(email.startsWith('mailto:?')).toBe(true);
    expect(decodeURIComponent(email)).toContain(payload.url);
  });

  it('rejects non-openable values', () => {
    expect(isOpenableShareUrl(null)).toBe(false);
    expect(isOpenableShareUrl('javascript:alert(1)')).toBe(false);
    expect(isOpenableShareUrl('tiktok://create')).toBe(false);
  });

  it('opens a new tab with noopener for a valid target', () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    const used = openShare('x', payload);
    expect(used).toContain('https://x.com/intent/post');
    expect(open).toHaveBeenCalledWith(used, '_blank', 'noopener,noreferrer');
  });

  it('does not open anything when the target cannot be built', () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    expect(openShare('facebook', { text: 'no link' })).toBeNull();
    expect(open).not.toHaveBeenCalled();
  });
});
