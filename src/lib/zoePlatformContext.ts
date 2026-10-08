import { routeRegistryAsPrompt, NAVIGABLE_ROUTES } from '@/config/routeRegistry';
import { pageContextLine } from '@/config/siteMap';
import { getAmbientContext } from '@/services/zoe-agent/ambientContext';

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
  "VR World (Real Map): opens on the member's real street from free OpenStreetMap data — real buildings, named roads, shops, malls, restaurants (KFC, McDonald's), fuel pumps, hotels and offices, with cars, bikes and people on real roads. Search (top-left) jumps to any city or place. Follow my GPS moves the avatar with the phone (pauses at driving speed). Friends show with tags; meet within ~1 m, in-world chat and voice, portal invites. Relics on real streets, four quests with karma rewards, a 3D bag, top players.",
  "M'Mora Village: the VR city behind the doorway on your street — Archive house with keys, notes and a locked door, save point with health bar and respawn, night mode with flashlight, third-person view (L/V) and crouch (C).",
  'Distances and travel: you may estimate straight-line distance and typical road travel time between cities from general knowledge (e.g. Thiruvananthapuram to Chennai is roughly 770 km by road, about 13-15 hours by car or about 15-17 hours by train). Say it is an estimate; there is no live traffic or live discount data.',
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
  const a = getAmbientContext();
  const vr = a.activeVRLocation
    ? `MEMBER IN VR WORLD NOW:\n- Location: ${a.activeVRLocation}\n${Object.entries(a.extras).filter(([k]) => k.startsWith('VR ')).map(([k, v]) => `- ${k}: ${v}`).join('\n')}`
    : '';
  return [here, vr, products, menus].filter(Boolean).join('\n\n');
}

export function getZoePlatformRoutes(): string[] {
  return NAVIGABLE_ROUTES.map((entry) => entry.path);
}
