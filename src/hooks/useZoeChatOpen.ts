import { useEffect, useState } from 'react';

/**
 * Subscribes to the global `mmora:zoe-chat-toggle` event dispatched by
 * `ZoeOrbConversationPanel`. Any component that runs its own auto-scroll,
 * carousel, or attention-stealing timer should read this flag and pause
 * while the Zoe chat panel is visible so the conversation stays legible.
 */
export function useZoeChatOpen(): boolean {
  const [open, setOpen] = useState<boolean>(
    typeof window !== 'undefined' && Boolean((window as any).__mmoraZoeChatOpen)
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onToggle = (e: Event) => {
      const next = Boolean((e as CustomEvent).detail?.open);
      setOpen(next);
    };
    window.addEventListener('mmora:zoe-chat-toggle', onToggle);
    return () => window.removeEventListener('mmora:zoe-chat-toggle', onToggle);
  }, []);

  return open;
}
