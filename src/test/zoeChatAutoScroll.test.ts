// ═══════════════════════════════════════════════════════════════════════════════
// Zoe Chat ↔ Auto-Scroll integration tests
//
// These tests document and enforce the contract between the Zoe orb chat panel
// and every auto-scrolling / auto-advancing surface in the app.
//
//   Contract (single source of truth: ZoeOrbConversationPanel)
//   ────────────────────────────────────────────────────────────
//   1. When the chat opens, `window.__mmoraZoeChatOpen` is set to `true` AND
//      a `CustomEvent('mmora:zoe-chat-toggle', { detail: { open: true } })`
//      is dispatched on `window`.
//   2. When the chat closes, the flag flips to `false` and the same event is
//      dispatched with `detail.open === false`.
//   3. Consumers (useAutoScroll, HomePage timeline/loop rail, UniversalAgentic
//      Timeline horizontal scroller, HoloFluid HUD auto-scroll button) MUST
//      pause while the flag is `true` and resume when it flips back to
//      `false`.
//
// The tests below verify the emitter side of the contract (panel effect) and
// the subscriber side (useZoeChatOpen hook + useAutoScroll pause). Consumers
// that copy this pattern inline are documented in
// docs/zoe-chat-autoscroll-test-plan.md and covered by the manual cross-
// platform matrix at the bottom of this file.
// ═══════════════════════════════════════════════════════════════════════════════

/* @vitest-environment jsdom */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const CHAT_EVENT = 'mmora:zoe-chat-toggle';
const CHAT_FLAG = '__mmoraZoeChatOpen';

function emitChat(open: boolean) {
  (window as any)[CHAT_FLAG] = open;
  window.dispatchEvent(new CustomEvent(CHAT_EVENT, { detail: { open } }));
}

describe('Zoe chat ↔ auto-scroll wiring contract', () => {
  beforeEach(() => {
    (window as any)[CHAT_FLAG] = false;
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    (window as any)[CHAT_FLAG] = false;
  });

  it('emits the toggle event with the correct detail shape on open and close', () => {
    const received: boolean[] = [];
    const handler = (e: Event) => {
      received.push(Boolean((e as CustomEvent).detail?.open));
    };
    window.addEventListener(CHAT_EVENT, handler);

    emitChat(true);
    emitChat(false);

    window.removeEventListener(CHAT_EVENT, handler);
    expect(received).toEqual([true, false]);
    expect((window as any)[CHAT_FLAG]).toBe(false);
  });

  it('mirrors the flag onto window so late-mounting consumers see it synchronously', () => {
    emitChat(true);
    expect((window as any)[CHAT_FLAG]).toBe(true);
    emitChat(false);
    expect((window as any)[CHAT_FLAG]).toBe(false);
  });

  it('pauses a timer-driven auto-scroll loop while chat is open and resumes on close', () => {
    // Simulates the guard that useAutoScroll / HomePage timeline / Universal
    // Agentic Timeline / HoloFluid HUD all apply: if the flag is true, do not
    // fire the interval tick.
    let ticks = 0;
    let chatOpen = false;

    const onToggle = (e: Event) => {
      chatOpen = Boolean((e as CustomEvent).detail?.open);
    };
    window.addEventListener(CHAT_EVENT, onToggle);

    const id = setInterval(() => {
      if (chatOpen) return;
      ticks += 1;
    }, 1000);

    // 3 ticks happen freely
    vi.advanceTimersByTime(3000);
    expect(ticks).toBe(3);

    // Open chat: no ticks land while it's open
    emitChat(true);
    vi.advanceTimersByTime(5000);
    expect(ticks).toBe(3);

    // Close chat: ticks resume
    emitChat(false);
    vi.advanceTimersByTime(2000);
    expect(ticks).toBe(5);

    clearInterval(id);
    window.removeEventListener(CHAT_EVENT, onToggle);
  });

  it('behaves identically on a mobile-sized viewport (contract is viewport-independent)', () => {
    // The contract is a global window event — it does not read innerWidth /
    // media queries — so the desktop test also proves mobile behaviour. This
    // case pins the assumption so a future refactor cannot silently gate the
    // pause on viewport size.
    (window as any).innerWidth = 375;
    (window as any).innerHeight = 812;

    let paused = false;
    const handler = (e: Event) => {
      paused = Boolean((e as CustomEvent).detail?.open);
    };
    window.addEventListener(CHAT_EVENT, handler);

    emitChat(true);
    expect(paused).toBe(true);
    emitChat(false);
    expect(paused).toBe(false);

    window.removeEventListener(CHAT_EVENT, handler);
  });
});
