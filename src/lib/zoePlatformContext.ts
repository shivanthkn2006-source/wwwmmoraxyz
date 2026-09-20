import { routeRegistryAsPrompt, NAVIGABLE_ROUTES } from '@/config/routeRegistry';
import { pageContextLine } from '@/config/siteMap';

export interface ZoeActivePostContext {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  mediaUrl: string | null;
  mediaType: string | null;
  createdAt: string;
  likesCount: number;
  commentsCount: number;
}

let activePost: ZoeActivePostContext | null = null;

export function setZoeActivePostContext(post: ZoeActivePostContext | null): void {
  activePost = post;
}

export function getZoeActivePostContext(): ZoeActivePostContext | null {
  return activePost;
}

/**
 * Every menu Zoe knows about. Sourced from the canonical route registry
 * (generated from App.tsx) so a newly mounted page is injected automatically
 * instead of being hand-maintained and drifting out of date.
 */
/**
 * Platform product knowledge: every shipped capability Zoe must be able to talk
 * about, including the newest ones, so she never says a feature does not exist.
 */
export const ZOE_PLATFORM_PRODUCTS = [
  'Calls: one-to-one audio and video calls with full-screen remote video, a small self-view, transparent white-only controls, call history and missed-call alerts.',
  'Group call: up to six people on direct peer-to-peer connections in an even tile grid.',
  'Activity status: every member keeps one saved activity (Work, Driving, Sleep, Gaming, Yoga and more). It is shared between Profile, the Calls panel, the full-screen call and group call tiles, updates live, and is shown as a plain white icon. Zoe may announce it, e.g. "Asha is in Transit right now."',
  'Poor-network words-only mode: video and mic pause and short text keeps the conversation alive.',
  'Music: full player, uploads, playlists, listening history and planetary/faith-driven suggestions.',
  'Growth and DHF: daily cards with oil-painting artwork, narration and personal insight.',
  'Astrology: real ephemeris birth charts and hourly planetary mood tracking.',
].join('\n- ');

export function getZoePlatformProductKnowledge(): string {
  return `PLATFORM PRODUCTS YOU KNOW:\n- ${ZOE_PLATFORM_PRODUCTS}`;
}

export function getZoePlatformPageContext(): string {
  const menus = routeRegistryAsPrompt();
  // Page awareness: tell Zoe where the member is standing right now, so her
  // answer on /astrology differs from her answer on /chat.
  const here =
    typeof window !== 'undefined' ? pageContextLine(window.location.pathname) : '';
  const products = getZoePlatformProductKnowledge();
  return [here, products, menus].filter(Boolean).join('\n\n');
}

export function getZoePlatformRoutes(): string[] {
  return NAVIGABLE_ROUTES.map((entry) => entry.path);
}
