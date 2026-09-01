/**
 * SHARE TARGETS — the one place that knows how to hand a piece of M'Mora
 * content to an outside platform.
 *
 * Every surface (post cards, the share bridge, DHF video cards) builds its
 * links here so a broken share can only ever be broken in one file. Each
 * builder returns a fully-encoded absolute URL, or a documented app deep link
 * for platforms that have no web share intent (TikTok, Instagram).
 */

export type ShareTarget =
  | 'x'
  | 'facebook'
  | 'linkedin'
  | 'whatsapp'
  | 'telegram'
  | 'reddit'
  | 'email'
  | 'tiktok'
  | 'instagram'
  | 'youtube';

export interface SharePayload {
  /** Human-readable text: the headline or caption. */
  text: string;
  /** Absolute URL to the shared content. Optional for text-only shares. */
  url?: string;
  /** Optional hashtags, without the leading '#'. */
  hashtags?: string[];
}

/** Platforms that open a real web share dialog (vs. an app deep link). */
export const WEB_SHARE_TARGETS: ShareTarget[] = [
  'x',
  'facebook',
  'linkedin',
  'whatsapp',
  'telegram',
  'reddit',
  'email',
];

export const SHARE_TARGET_LABELS: Record<ShareTarget, string> = {
  x: 'X',
  facebook: 'Facebook',
  linkedin: 'LinkedIn',
  whatsapp: 'WhatsApp',
  telegram: 'Telegram',
  reddit: 'Reddit',
  email: 'Email',
  tiktok: 'TikTok',
  instagram: 'Instagram',
  youtube: 'YouTube',
};

const clean = (value: string | undefined): string => (value ?? '').replace(/\s+/g, ' ').trim();

/** X caps a post at 280 chars; trim the text so the intent never truncates oddly. */
const trimForX = (text: string, url?: string): string => {
  const budget = url ? 280 - 24 : 280;
  return text.length <= budget ? text : `${text.slice(0, Math.max(0, budget - 1)).trimEnd()}…`;
};

const tags = (hashtags?: string[]): string[] =>
  (hashtags ?? [])
    .map((tag) => tag.replace(/^#/, '').replace(/[^A-Za-z0-9_]/g, ''))
    .filter(Boolean);

/**
 * Builds the share URL for one platform. Returns null when the payload cannot
 * produce a working link (for example a link-only platform with no URL).
 */
export const buildShareUrl = (target: ShareTarget, payload: SharePayload): string | null => {
  const text = clean(payload.text);
  const url = clean(payload.url);
  const hashtags = tags(payload.hashtags);

  switch (target) {
    case 'x': {
      const params = new URLSearchParams({ text: trimForX(text, url) });
      if (url) params.set('url', url);
      if (hashtags.length) params.set('hashtags', hashtags.join(','));
      return `https://x.com/intent/post?${params.toString()}`;
    }
    case 'facebook':
      if (!url) return null;
      return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    case 'linkedin':
      if (!url) return null;
      return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
    case 'whatsapp':
      return `https://wa.me/?text=${encodeURIComponent(url ? `${text} ${url}`.trim() : text)}`;
    case 'telegram': {
      const params = new URLSearchParams();
      params.set('url', url || text);
      if (url) params.set('text', text);
      return `https://t.me/share/url?${params.toString()}`;
    }
    case 'reddit': {
      const params = new URLSearchParams({ title: text });
      if (url) params.set('url', url);
      return `https://www.reddit.com/submit?${params.toString()}`;
    }
    case 'email': {
      const params = new URLSearchParams({ subject: text, body: url ? `${text}\n\n${url}` : text });
      return `mailto:?${params.toString()}`;
    }
    // App-only platforms: no web share intent exists, so we open the composer
    // and the caller copies the caption to the clipboard first.
    case 'tiktok':
      return 'https://www.tiktok.com/upload';
    case 'instagram':
      return 'https://www.instagram.com/';
    case 'youtube':
      return 'https://www.youtube.com/upload';
    default:
      return null;
  }
};

/** Every target that can be opened for this payload, keyed by target id. */
export const buildAllShareUrls = (payload: SharePayload): Partial<Record<ShareTarget, string>> => {
  const out: Partial<Record<ShareTarget, string>> = {};
  (Object.keys(SHARE_TARGET_LABELS) as ShareTarget[]).forEach((target) => {
    const url = buildShareUrl(target, payload);
    if (url) out[target] = url;
  });
  return out;
};

/** True when the string is a share link a browser can actually open. */
export const isOpenableShareUrl = (value: string | null | undefined): boolean => {
  if (!value) return false;
  try {
    const parsed = new URL(value);
    return ['https:', 'mailto:'].includes(parsed.protocol);
  } catch {
    return false;
  }
};

/** Opens a share target in a new tab; returns the URL used, or null. */
export const openShare = (target: ShareTarget, payload: SharePayload): string | null => {
  const url = buildShareUrl(target, payload);
  if (!isOpenableShareUrl(url)) return null;
  if (typeof window !== 'undefined') {
    window.open(url as string, '_blank', 'noopener,noreferrer');
  }
  return url;
};

export default buildShareUrl;
