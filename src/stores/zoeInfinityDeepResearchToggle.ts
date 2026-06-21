// ═══════════════════════════════════════════════════════════════════════════════
// ZOE INFINITY — DEEP RESEARCH TOGGLE STORE
// Lightweight zustand-free store with localStorage persistence + event bus.
// Subscribed by InfinityInput (UI) and useZoeInfinityBrain (routing).
// ═══════════════════════════════════════════════════════════════════════════════

const STORAGE_KEY = "zoe-infinity-deep-research-enabled";
const EVENT_NAME = "zoe-infinity:deep-research-toggle";

let cached: boolean | null = null;

export const isDeepResearchEnabled = (): boolean => {
  if (cached !== null) return cached;
  try {
    cached = localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    cached = false;
  }
  return cached;
};

export const setDeepResearchEnabled = (enabled: boolean): void => {
  cached = enabled;
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? "true" : "false");
  } catch { /* ignore */ }
  try {
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { enabled } }));
  } catch { /* ignore */ }
};

export const subscribeDeepResearch = (cb: (enabled: boolean) => void): () => void => {
  const handler = (e: Event) => {
    const detail = (e as CustomEvent).detail;
    if (detail && typeof detail.enabled === "boolean") cb(detail.enabled);
  };
  window.addEventListener(EVENT_NAME, handler);
  return () => window.removeEventListener(EVENT_NAME, handler);
};
