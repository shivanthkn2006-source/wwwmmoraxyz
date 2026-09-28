/** Sovereign action bus (client side): safe, whitelisted pages Zoe can open. */
const ROUTES: [RegExp, string][] = [
  [/\b(dhf|calendar)\b/, '/dhf-calendar'],
  [/\b(life projection|projection|forecast)\b/, '/life-projection'],
  [/\bnotifications?\b/, '/notification-history'],
  [/\bcall history\b/, '/calls/history'],
  [/\bcalls?\b/, '/calls'],
  [/\b(lol|jokes?)\b/, '/zoe-lol'],
  [/\bhome\b/, '/home'],
];
export function detectZoeAction(text: string): string | null {
  const t = text.toLowerCase();
  if (!/\b(open|show me|go to|take me to)\b/.test(t) || t.split(/\s+/).length > 10) return null;
  for (const [re, path] of ROUTES) if (re.test(t)) return path;
  return null;
}
