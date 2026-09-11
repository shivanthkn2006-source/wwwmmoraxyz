/**
 * ZOE AMBIENT CONTEXT
 * ===================
 * A tiny, dependency-free registry any surface can push into so Zoe knows what
 * the user is looking at without a single UI change or button press. The agent
 * provider reads a snapshot each time it (re)builds its system prompt.
 */

export interface AmbientContext {
  currentPostId: string | null;
  activeVRLocation: string | null;
  friendsList: Array<{ name: string; online: boolean }>;
  extras: Record<string, string>;
}

const state: AmbientContext = {
  currentPostId: null,
  activeVRLocation: null,
  friendsList: [],
  extras: {},
};

type Listener = (ctx: AmbientContext) => void;
const listeners = new Set<Listener>();

export function setAmbientContext(patch: Partial<AmbientContext>): void {
  Object.assign(state, patch);
  listeners.forEach((l) => {
    try { l(getAmbientContext()); } catch { /* never break a render */ }
  });
}

export function setAmbientExtra(key: string, value: string | null): void {
  if (value === null) delete state.extras[key];
  else state.extras[key] = value;
  setAmbientContext({});
}

export function getAmbientContext(): AmbientContext {
  return { ...state, friendsList: [...state.friendsList], extras: { ...state.extras } };
}

export function onAmbientContextChange(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Human-readable block injected into Zoe's system prompt. */
export function describeAmbientContext(pathname: string, pageTitle?: string | null): string {
  const ctx = getAmbientContext();
  const online = ctx.friendsList.filter((f) => f.online).map((f) => f.name);
  const lines = [
    `- Current page: ${pageTitle || pathname}`,
    `- Post in view: ${ctx.currentPostId || 'None'}`,
    `- VR location: ${ctx.activeVRLocation || 'None'}`,
    `- Friends online: ${online.length ? online.join(', ') : 'None known'}`,
    ...Object.entries(ctx.extras).map(([k, v]) => `- ${k}: ${v}`),
  ];
  return lines.join('\n');
}
