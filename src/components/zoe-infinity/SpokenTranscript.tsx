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

import React, { useEffect, useMemo, useRef } from 'react';
import { cn } from '@/lib/utils';
import { useSpokenWordSync } from '@/hooks/useSpokenWordSync';

interface SpokenTranscriptProps {
  messageId?: string;
  text: string;
  className?: string;
  /** Keep the active word scrolled into view (default true). */
  autoScroll?: boolean;
}

const SCROLL_THROTTLE_MS = 260;
/** Comfortable band (fraction of container height) the active word may sit in. */
const BAND_TOP = 0.22;
const BAND_BOTTOM = 0.78;
/** Where we park the active word when we do scroll. */
const PARK_AT = 0.42;

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Nearest ancestor that can actually scroll. We deliberately never scroll the
 * window/document: doing so made the whole chat jump up and down on every word.
 */
function findScrollParent(node: HTMLElement | null): HTMLElement | null {
  let el = node?.parentElement ?? null;
  while (el && el !== document.body) {
    const style = window.getComputedStyle(el);
    const canScroll = /(auto|scroll|overlay)/.test(style.overflowY);
    if (canScroll && el.scrollHeight > el.clientHeight + 8) return el;
    el = el.parentElement;
  }
  return null;
}

export const SpokenTranscript: React.FC<SpokenTranscriptProps> = ({
  messageId,
  text,
  className,
  autoScroll = true,
}) => {
  const { isActive, isPaused, activeWordIndex, sentenceRange, segments } = useSpokenWordSync(messageId, text);
  const activeRef = useRef<HTMLSpanElement | null>(null);
  const lastScrollRef = useRef(0);

  const activeSentenceRange = sentenceRange;

  useEffect(() => {
    if (!isActive || isPaused || !autoScroll || activeWordIndex < 0) return;
    const node = activeRef.current;
    if (!node) return;

    const container = findScrollParent(node);
    if (!container) return; // never move the page itself

    const now = Date.now();
    if (now - lastScrollRef.current < SCROLL_THROTTLE_MS) return;

    const cRect = container.getBoundingClientRect();
    const nRect = node.getBoundingClientRect();
    const relTop = nRect.top - cRect.top;
    const relBottom = nRect.bottom - cRect.top;

    // Already comfortably visible → do nothing. This deadzone is what stops the
    // highlight from dragging the view up and down word by word.
    if (relTop >= cRect.height * BAND_TOP && relBottom <= cRect.height * BAND_BOTTOM) return;

    lastScrollRef.current = now;
    const delta = relTop - cRect.height * PARK_AT;
    const target = Math.max(
      0,
      Math.min(container.scrollHeight - container.clientHeight, container.scrollTop + delta)
    );
    if (Math.abs(target - container.scrollTop) < 4) return;

    try {
      container.scrollTo({
        top: target,
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      });
    } catch {
      container.scrollTop = target;
    }
  }, [isActive, isPaused, activeWordIndex, autoScroll]);

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
        const isInActiveSentence = !!activeSentenceRange &&
          segment.index >= activeSentenceRange.start &&
          segment.index <= activeSentenceRange.end;

        return (
          <span
            key={`w-${i}`}
            ref={isCurrent ? activeRef : undefined}
            aria-current={isCurrent ? 'true' : undefined}
            className={cn(
              'zoe-transcript-word',
              isInActiveSentence && 'zoe-transcript-word--sentence',
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
