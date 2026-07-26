/**
 * SpokenTranscript — Teleprompter-style transcript for Zoe's replies
 * ===================================================================
 * Renders a message as word tokens. While Zoe speaks that message, the
 * current word is highlighted, already-spoken words dim, and the view
 * auto-scrolls to keep the active word comfortably in sight.
 *
 * When Zoe is not speaking this message it renders as plain text, with
 * identical layout (no shift when speech starts or stops).
 */

import React, { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { useSpokenWordSync } from '@/hooks/useSpokenWordSync';

interface SpokenTranscriptProps {
  messageId?: string;
  text: string;
  className?: string;
  /** Keep the active word scrolled into view (default true). */
  autoScroll?: boolean;
}

const SCROLL_THROTTLE_MS = 180;

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export const SpokenTranscript: React.FC<SpokenTranscriptProps> = ({
  messageId,
  text,
  className,
  autoScroll = true,
}) => {
  const { isActive, activeWordIndex, segments } = useSpokenWordSync(messageId, text);
  const activeRef = useRef<HTMLSpanElement | null>(null);
  const lastScrollRef = useRef(0);

  useEffect(() => {
    if (!isActive || !autoScroll || activeWordIndex < 0) return;
    const node = activeRef.current;
    if (!node) return;

    const now = Date.now();
    if (now - lastScrollRef.current < SCROLL_THROTTLE_MS) return;
    lastScrollRef.current = now;

    try {
      node.scrollIntoView({
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
        block: 'center',
        inline: 'nearest',
      });
    } catch {
      /* older browsers – ignore */
    }
  }, [isActive, activeWordIndex, autoScroll]);

  if (!isActive) {
    return <span className={cn('whitespace-pre-wrap', className)}>{text}</span>;
  }

  return (
    <span className={cn('whitespace-pre-wrap', className)} aria-live="off">
      {segments.map((segment, i) => {
        if (segment.type === 'gap') {
          return <span key={`g-${i}`}>{segment.text}</span>;
        }

        const isCurrent = segment.index === activeWordIndex;
        const isSpoken = segment.index < activeWordIndex;

        return (
          <span
            key={`w-${i}`}
            ref={isCurrent ? activeRef : undefined}
            className={cn(
              'zoe-transcript-word',
              isCurrent && 'zoe-transcript-word--active',
              isSpoken && 'zoe-transcript-word--spoken',
              !isCurrent && !isSpoken && 'zoe-transcript-word--pending'
            )}
          >
            {segment.text}
          </span>
        );
      })}
    </span>
  );
};

export default SpokenTranscript;
