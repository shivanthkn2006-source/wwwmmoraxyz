/**
 * Normalised search items rendered inline in the M'Mora home feed.
 * Every external lane (web, images, news, videos, weather, shopping, music)
 * and every in-platform index hit is converted to this one shape so nothing
 * has to open outside the app.
 */
export type FeedSearchKind =
  | 'web'
  | 'image'
  | 'news'
  | 'video'
  | 'weather'
  | 'shopping'
  | 'music'
  | 'platform';

export interface FeedSearchItem {
  id: string;
  kind: FeedSearchKind;
  title: string;
  subtitle?: string;
  url?: string;
  thumbnail?: string;
  image?: string;
  source?: string;
  publishedAt?: string;
  price?: string;
  availability?: string;
  rating?: number;
  reviews?: number;
  location?: string;
  tags?: string[];
  /** In-app route for platform results (opened inside the feed shell). */
  route?: string;
}

export const KIND_LABEL: Record<FeedSearchKind, string> = {
  web: 'Web',
  image: 'Image',
  news: 'News',
  video: 'Video',
  weather: 'Weather',
  shopping: 'Shopping',
  music: 'Music',
  platform: 'M\u2019Mora',
};

/** Human-readable chips shown on a feed search card. */
export function tagsForItem(item: FeedSearchItem): string[] {
  const tags: string[] = [];
  if (item.price) tags.push(item.price);
  if (item.availability) tags.push(item.availability);
  if (typeof item.rating === 'number') {
    tags.push(`${item.rating.toFixed(1)}★${item.reviews ? ` (${item.reviews})` : ''}`);
  } else if (item.reviews) {
    tags.push(`${item.reviews} reviews`);
  }
  if (item.location) tags.push(item.location);
  if (item.source) tags.push(item.source);
  for (const extra of item.tags ?? []) {
    if (extra && !tags.includes(extra)) tags.push(extra);
  }
  return tags.slice(0, 6);
}

/** Domain shown as the "portal" for a result. */
export function portalForItem(item: FeedSearchItem): string | null {
  if (item.source) return item.source;
  if (!item.url) return null;
  try {
    return new URL(item.url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

/** Everything that is safe/possible to render as an in-feed slide. */
export function isFeedRenderable(item: { kind: string; url?: string }): boolean {
  if (item.kind === 'video') return Boolean(item.url);
  return true;
}
