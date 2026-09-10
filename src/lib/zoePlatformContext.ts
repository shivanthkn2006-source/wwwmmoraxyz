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
export function getZoePlatformPageContext(): string {
  const menus = routeRegistryAsPrompt();
  // Page awareness: tell Zoe where the member is standing right now, so her
  // answer on /astrology differs from her answer on /chat.
  const here =
    typeof window !== 'undefined' ? pageContextLine(window.location.pathname) : '';
  return here ? `${here}\n\n${menus}` : menus;
}

export function getZoePlatformRoutes(): string[] {
  return NAVIGABLE_ROUTES.map((entry) => entry.path);
}
