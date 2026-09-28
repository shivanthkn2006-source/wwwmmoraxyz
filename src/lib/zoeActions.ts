/** Sovereign action bus (client side): safe, whitelisted pages Zoe can open. */
export interface ZoeAction { label: string; path: string }

const ROUTES: [RegExp, string, string][] = [
  [/\b(dhf|calendar)\b/, '/dhf-calendar', 'Open DHF calendar'],
  [/\b(life projection|projection|forecast)\b/, '/life-projection', 'Open life projection'],
  [/\bnotifications?\b/, '/notification-history', 'Open notifications'],
  [/\bcall history\b/, '/calls/history', 'Open call history'],
  [/\bcalls?\b/, '/calls', 'Open calls'],
  [/\b(lol|jokes?)\b/, '/zoe-lol', "Open Zoe's LOL"],
  [/\bmusic\b/, '/music', 'Open music'],
  [/\bhome\b/, '/home', 'Open Home'],
];

const ALLOWED = new Set(ROUTES.map((r) => r[1]));
export const isAllowedZoePath = (p: string) => ALLOWED.has(p);

export function detectZoeAction(text: string): string | null {
  const t = text.toLowerCase();
  if (!/\b(open|show me|go to|take me to)\b/.test(t) || t.split(/\s+/).length > 10) return null;
  for (const [re, path] of ROUTES) if (re.test(t)) return path;
  return null;
}

/** Tappable action chips for a Zoe reply (at most 2, from the member's words or her reply). */
export function suggestZoeActions(text: string): ZoeAction[] {
  const t = (text || '').toLowerCase();
  const out: ZoeAction[] = [];
  for (const [re, path, label] of ROUTES) {
    if (path === '/home') continue;
    if (re.test(t) && !out.some((a) => a.path === path)) out.push({ label, path });
    if (out.length >= 2) break;
  }
  return out;
}
